# Product: Sports Experience Design Guidelines

## Product Purpose

An internal knowledge platform for the Sports UX team at Entain. It documents shipped design decisions, interaction patterns, component specifications, and user research across the sportsbook product. Serves as both a human-readable reference and an AI-ready context source for design consistency.

## Register

product

## Users

- **Lead Designers** — Own subdomains (Discovery, Transactional, Post Bet). Use it to document shipped features, record decisions, and maintain guidelines. Primary authors.
- **Product Designers** — Reference existing patterns when designing new features. Check decision logs, state tables, and component anatomy to ensure consistency.
- **Product Managers** — Look up what was shipped and why. Use research summaries to inform roadmap decisions without scheduling design walkthroughs.
- **Developers** — Reference state tables, configurable elements, and token mappings when implementing features. Check edge cases and error flows.
- **QA Engineers** — Use state tables and flow documentation as test case sources. Validate implementations against documented behaviour.

## Brand

- **Company:** Entain (parent company of Ladbrokes, Coral, bwin, Sportingbet)
- **Team:** Sports UX — a cross-brand design team
- **Tone:** Technical but approachable. Direct, not academic. Like a knowledgeable colleague explaining how things work.
- **Visual identity:** The dashboard uses a dark UI (GitHub-style dark mode). Documentation content is clean, structured, and scannable — tables over prose, states over descriptions.

## Anti-references

- Generic Confluence/wiki pages with walls of unstructured text
- Outdated documentation that doesn't reflect shipped state
- Design specs that describe visuals without explaining logic/rules
- Documentation that requires tribal knowledge to interpret

## Strategic Principles

1. **Agent-friendly first** — Every document should be structured so an AI agent can make informed design decisions from it (state tables, decision rules, configurable elements).
2. **Decisions over descriptions** — Capture WHY something was done, not just WHAT. Decision logs prevent re-litigation.
3. **Living, not archival** — Documents are updated when features ship. If it's documented, it's current.
4. **Progressive depth** — Overview gives the picture in 30 seconds. Full doc gives every state and edge case.
5. **Federated ownership** — Each lead owns their subdomain's documentation. Others can suggest edits.

## Tech Stack

- Markdown files in a git repository
- Express.js dashboard (localhost:3847) for browsing/editing
- TypeScript tooling (manifest generator, validators, search)
- Experience map defining the full design org structure
- Figma REST API integration for sourcing documentation from design files
- Paper integration for creating guideline diagrams and flow visualisations
