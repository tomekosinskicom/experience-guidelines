/**
 * Sports Experience Guidelines — Template Engine
 *
 * Maps extracted content from source documents into the repository's
 * standardised markdown template. Generates frontmatter, maps headings
 * to canonical sections, and produces path/filename suggestions.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 8.2
 */

import type { DocumentType } from './types.js';
import {
  TEMPLATE_SECTIONS,
  RESEARCH_EXTRA_SECTIONS,
  PLACEHOLDER_TEXT,
  type TemplateOptions,
  type GeneratedDocument,
  type SectionContent,
  type FrontmatterFields,
  type ExtractedContent,
  type HeadingNode,
} from './import-types.js';
import { generatePath, PathGenerationError } from './path-generator.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Converts a string to a slug for comparison purposes.
 * Lowercases, replaces spaces and special characters with hyphens,
 * removes non-alphanumeric/hyphen characters, and collapses multiple hyphens.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Converts a title to a kebab-case filename with .md extension.
 * Pattern: ^[a-z0-9]+(-[a-z0-9]+)*\.md$
 */
function toKebabFilename(title: string): string {
  const stem = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // If the stem is empty after processing, use a default
  if (!stem) {
    return 'untitled-document.md';
  }

  return `${stem}.md`;
}

/**
 * Formats today's date as YYYY-MM-DD.
 */
function todayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Extracts a summary from extracted content — first paragraph truncated to 200 words.
 */
function extractSummary(content: ExtractedContent): string {
  const firstParagraph = content.paragraphs.find((p) => p.trim().length > 0);
  if (!firstParagraph) {
    return PLACEHOLDER_TEXT;
  }

  const words = firstParagraph.trim().split(/\s+/);
  if (words.length <= 200) {
    return firstParagraph.trim();
  }
  return words.slice(0, 200).join(' ') + '...';
}

/**
 * Converts a section slug back to a display heading.
 * e.g., "principles-in-context" → "Principles in Context"
 */
function sectionSlugToHeading(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Collects content under a heading node and its children as markdown text.
 */
function collectHeadingContent(heading: HeadingNode, allParagraphs: string[]): string {
  // We'll use the heading's text and children to build content.
  // Since the extracted data has headings as a tree, content associated
  // with a heading is best derived from paragraphs that appear after it.
  // However, we don't have positional info — so we'll just use children text.
  const parts: string[] = [];

  for (const child of heading.children) {
    parts.push(`### ${child.text}`);
    if (child.children.length > 0) {
      parts.push(collectHeadingContent(child, allParagraphs));
    }
  }

  return parts.join('\n\n');
}

// ─── Section Mapping ─────────────────────────────────────────────────────────

/**
 * Maps extracted headings to canonical template sections by comparing
 * slugified heading text against section slugs.
 */
function mapHeadingsToSections(
  headings: HeadingNode[],
  paragraphs: string[],
  sections: readonly string[]
): Map<string, string> {
  const mapped = new Map<string, string>();

  // Flatten headings for matching
  const flatHeadings = flattenHeadings(headings);

  for (const section of sections) {
    const sectionSlug = section; // sections are already in slug form

    // Find a heading whose slug matches this section
    const matchIndex = flatHeadings.findIndex((h) => {
      const headingSlug = slugify(h.heading.text);
      return headingSlug === sectionSlug;
    });

    if (matchIndex !== -1) {
      const match = flatHeadings[matchIndex];
      // Collect content: paragraphs between this heading and the next heading at same/higher level
      const content = collectContentForHeading(match, flatHeadings, matchIndex, paragraphs);
      if (content.trim()) {
        mapped.set(section, content.trim());
      }
    }
  }

  return mapped;
}

interface FlatHeading {
  heading: HeadingNode;
  depth: number;
}

function flattenHeadings(headings: HeadingNode[], depth = 0): FlatHeading[] {
  const result: FlatHeading[] = [];
  for (const h of headings) {
    result.push({ heading: h, depth });
    result.push(...flattenHeadings(h.children, depth + 1));
  }
  return result;
}

/**
 * Collects content associated with a heading.
 * Uses paragraph matching: finds paragraphs that contain the heading text
 * or appear to be associated content under that heading.
 */
function collectContentForHeading(
  match: FlatHeading,
  allFlat: FlatHeading[],
  matchIndex: number,
  paragraphs: string[]
): string {
  // Strategy: Look for paragraphs that follow the heading text pattern.
  // Since we don't have precise positional data linking paragraphs to headings,
  // we'll look for paragraphs that come after a paragraph matching the heading.
  const headingText = match.heading.text.toLowerCase();

  // Find paragraph index that matches this heading
  const paraIndex = paragraphs.findIndex(
    (p) => p.toLowerCase().trim() === headingText || p.toLowerCase().trim().startsWith(headingText)
  );

  if (paraIndex === -1) {
    // If we can't find the heading in paragraphs, collect child heading content
    if (match.heading.children.length > 0) {
      return match.heading.children
        .map((child) => `### ${child.text}`)
        .join('\n\n');
    }
    return '';
  }

  // Find the next heading paragraph after this one
  const nextHeadingIndex = findNextHeadingParagraphIndex(paragraphs, paraIndex + 1, allFlat);

  // Collect paragraphs between current heading and next heading
  const contentParagraphs = paragraphs.slice(paraIndex + 1, nextHeadingIndex);
  return contentParagraphs.join('\n\n');
}

/**
 * Finds the index of the next paragraph that matches any heading text.
 */
function findNextHeadingParagraphIndex(
  paragraphs: string[],
  startIndex: number,
  allFlat: FlatHeading[]
): number {
  const headingTexts = new Set(allFlat.map((f) => f.heading.text.toLowerCase().trim()));

  for (let i = startIndex; i < paragraphs.length; i++) {
    const pText = paragraphs[i].toLowerCase().trim();
    if (headingTexts.has(pText)) {
      return i;
    }
  }

  return paragraphs.length;
}

// ─── Frontmatter Generation ─────────────────────────────────────────────────

function generateFrontmatter(
  content: ExtractedContent,
  documentType: DocumentType,
  overrides?: Partial<FrontmatterFields>
): FrontmatterFields {
  const metadata = content.metadata;

  const frontmatter: FrontmatterFields = {
    title: overrides?.title ?? metadata.title ?? 'Untitled Document',
    subdomain: overrides?.subdomain ?? metadata.possibleSubdomain ?? 'discovery',
    'experience-area': overrides?.['experience-area'] ?? metadata.possibleExperienceArea ?? 'general',
    'document-type': overrides?.['document-type'] ?? documentType,
    owner: overrides?.owner ?? 'Unassigned',
    'last-updated': todayISO(),
    status: 'draft',
    tags: overrides?.tags ?? metadata.possibleTags ?? ['draft'],
    summary: overrides?.summary ?? extractSummary(content),
  };

  return frontmatter;
}

// ─── Markdown Generation ─────────────────────────────────────────────────────

function frontmatterToYaml(frontmatter: FrontmatterFields): string {
  const lines: string[] = ['---'];
  lines.push(`title: "${frontmatter.title.replace(/"/g, '\\"')}"`);
  lines.push(`subdomain: "${frontmatter.subdomain}"`);
  lines.push(`experience-area: "${frontmatter['experience-area']}"`);
  lines.push(`document-type: "${frontmatter['document-type']}"`);
  lines.push(`owner: "${frontmatter.owner.replace(/"/g, '\\"')}"`);
  lines.push(`last-updated: "${frontmatter['last-updated']}"`);
  lines.push(`status: "${frontmatter.status}"`);
  lines.push(`tags:`);
  for (const tag of frontmatter.tags) {
    lines.push(`  - "${tag.replace(/"/g, '\\"')}"`);
  }
  lines.push(`summary: "${frontmatter.summary.replace(/"/g, '\\"')}"`);
  lines.push('---');
  return lines.join('\n');
}

// ─── Template Engine ─────────────────────────────────────────────────────────

/**
 * Generates a standardised markdown document from extracted content.
 */
export class TemplateEngine {
  /**
   * Generate a target document from extracted content and options.
   */
  generate(options: TemplateOptions): GeneratedDocument {
    const { extractedContent, documentType, overrides } = options;

    // 1. Generate frontmatter
    const frontmatter = generateFrontmatter(extractedContent, documentType, overrides);

    // 2. Determine which sections to include
    const allSections: string[] = [...TEMPLATE_SECTIONS];
    if (documentType === 'research') {
      // Insert research sections after 'overview'
      const overviewIndex = allSections.indexOf('overview');
      allSections.splice(overviewIndex + 1, 0, ...RESEARCH_EXTRA_SECTIONS);
    }

    // 3. Map extracted content to sections
    const sectionMapping = mapHeadingsToSections(
      extractedContent.headings,
      extractedContent.paragraphs,
      allSections
    );

    // 4. Build section content array
    const sections: SectionContent[] = allSections.map((sectionName) => {
      const mappedContent = sectionMapping.get(sectionName);
      if (mappedContent && mappedContent.trim().length > 0) {
        return {
          name: sectionName,
          content: mappedContent,
          isPlaceholder: false,
        };
      }
      return {
        name: sectionName,
        content: PLACEHOLDER_TEXT,
        isPlaceholder: true,
      };
    });

    // 5. Generate the full markdown string
    const markdownParts: string[] = [frontmatterToYaml(frontmatter), ''];

    for (const section of sections) {
      markdownParts.push(`## ${sectionSlugToHeading(section.name)}`);
      markdownParts.push('');
      markdownParts.push(section.content);
      markdownParts.push('');
    }

    const markdown = markdownParts.join('\n');

    // 6. Generate suggested path
    const suggestedPath = generateSuggestedPath(frontmatter);

    // 7. Generate suggested filename
    const suggestedFilename = toKebabFilename(frontmatter.title);

    return {
      markdown,
      frontmatter,
      sections,
      suggestedPath,
      suggestedFilename,
    };
  }
}

/**
 * Generate the suggested path using the path-generator module.
 * Falls back to a sensible default if path generation throws.
 */
function generateSuggestedPath(frontmatter: FrontmatterFields): string {
  try {
    return generatePath(
      frontmatter.subdomain,
      frontmatter['experience-area'],
      frontmatter['document-type']
    );
  } catch (error) {
    if (error instanceof PathGenerationError) {
      // Provide a fallback path when inputs are invalid
      const subdomain = frontmatter.subdomain || 'discovery';
      const area = frontmatter['experience-area'] || 'general';
      const docType = frontmatter['document-type'] || 'overview';
      return `${subdomain}/${area}/${docType}.md`;
    }
    throw error;
  }
}
