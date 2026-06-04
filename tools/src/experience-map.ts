/**
 * Experience Map — The complete picture of all design areas across pillars.
 * Shows the full structure even when files don't exist yet.
 */

export interface ExperienceArea {
  name: string;
  slug: string;
  documented: boolean;
  path?: string;
  maturity: 'not-started' | 'in-progress' | 'documented' | 'validated';
}

export interface Subdomain {
  name: string;
  slug: string;
  areas: ExperienceArea[];
}

export interface Pillar {
  name: string;
  slug: string;
  icon: string;
  subdomains: Subdomain[];
}

export interface ExperienceMap {
  pillars: Pillar[];
  shared: ExperienceArea[];
}

/**
 * Returns the complete experience map — the full picture of what the
 * design organisation covers, regardless of whether docs exist yet.
 */
export function getExperienceMap(existingPaths: string[]): ExperienceMap {
  const pathSet = new Set(existingPaths);

  const docTypes = ['overview', 'principles', 'patterns', 'research', 'decisions', 'guidelines', 'examples'];

  function area(name: string, pillarSlug: string, subdomainSlug: string): ExperienceArea {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Check which document types exist for this area
    const existingTypes: string[] = [];
    for (const dt of docTypes) {
      const p = `pillars/${pillarSlug}/${subdomainSlug}/${slug}/${dt}.md`;
      if (pathSet.has(p)) existingTypes.push(dt);
    }

    // Also check for any .md file in the area folder (custom filenames)
    const areaPrefix = `pillars/${pillarSlug}/${subdomainSlug}/${slug}/`;
    const allAreaDocs = [...pathSet].filter(p => p.startsWith(areaPrefix) && p.endsWith('.md'));

    const documented = allAreaDocs.length > 0;
    const firstPath = existingTypes.length > 0
      ? `pillars/${pillarSlug}/${subdomainSlug}/${slug}/${existingTypes[0]}.md`
      : allAreaDocs.length > 0 ? allAreaDocs[0] : undefined;

    return {
      name,
      slug,
      documented,
      path: firstPath,
      maturity: documented ? 'in-progress' : 'not-started',
      documentTypes: existingTypes,
    } as ExperienceArea & { documentTypes: string[] };
  }

  function sharedArea(name: string): ExperienceArea {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const possiblePaths = [
      `shared/${slug}/overview.md`,
      `shared/${slug}/index.md`,
    ];
    const foundPath = possiblePaths.find(p => pathSet.has(p));
    return {
      name,
      slug,
      documented: !!foundPath,
      path: foundPath,
      maturity: foundPath ? 'in-progress' : 'not-started',
    };
  }

  return {
    pillars: [
      {
        name: 'Sports',
        slug: 'sports',
        icon: '⚽',
        subdomains: [
          {
            name: 'Discovery',
            slug: 'discovery',
            areas: [
              area('Search', 'sports', 'discovery'),
              area('Sports Navigation', 'sports', 'discovery'),
              area('Personalisation', 'sports', 'discovery'),
              area('Market Layouts', 'sports', 'discovery'),
            ],
          },
          {
            name: 'Transactional',
            slug: 'transactional',
            areas: [
              area('Betslip', 'sports', 'transactional'),
              area('Bet Bar', 'sports', 'transactional'),
              area('Quick Bet', 'sports', 'transactional'),
              area('Bet Builder', 'sports', 'transactional'),
              area('Sports Token Promos', 'sports', 'transactional'),
              area('Price Boosts', 'sports', 'transactional'),
              area('Acca Boost', 'sports', 'transactional'),
            ],
          },
          {
            name: 'Post Bet',
            slug: 'post-bet',
            areas: [
              area('My Bets', 'sports', 'post-bet'),
              area('Cash Out', 'sports', 'post-bet'),
              area('Streaming', 'sports', 'post-bet'),
              area('Visualisation', 'sports', 'post-bet'),
              area('Up Sell & Cross Sell', 'sports', 'post-bet'),
            ],
          },
          {
            name: 'Retail',
            slug: 'retail',
            areas: [
              area('Build A Bet', 'sports', 'retail'),
              area('Racing', 'sports', 'retail'),
              area('Splash Page', 'sports', 'retail'),
              area('Betslip', 'sports', 'retail'),
              area('Market Layouts', 'sports', 'retail'),
              area('Scoreboards & Stats', 'sports', 'retail'),
              area('Display Manager', 'sports', 'retail'),
            ],
          },
          {
            name: 'Tools',
            slug: 'tools',
            areas: [
              area('Web TC', 'sports', 'tools'),
            ],
          },
          {
            name: 'Cross-Cutting',
            slug: 'cross-cutting-areas',
            areas: [
              area('UX Process', 'sports', 'cross-cutting-areas'),
              area('Figma Project Template', 'sports', 'cross-cutting-areas'),
              area('Design System', 'sports', 'cross-cutting-areas'),
              area('Live Betting', 'sports', 'cross-cutting-areas'),
              area('Horse Racing', 'sports', 'cross-cutting-areas'),
            ],
          },
        ],
      },
      {
        name: 'Gaming',
        slug: 'gaming',
        icon: '🎰',
        subdomains: [
          {
            name: 'Discovery',
            slug: 'discovery',
            areas: [
              area('Lobby', 'gaming', 'discovery'),
              area('Game Search', 'gaming', 'discovery'),
              area('Categories', 'gaming', 'discovery'),
              area('Providers', 'gaming', 'discovery'),
              area('Recommendations', 'gaming', 'discovery'),
            ],
          },
          {
            name: 'Engage',
            slug: 'engage',
            areas: [
              area('In-Game', 'gaming', 'engage'),
              area('Session Management', 'gaming', 'engage'),
              area('Autoplay', 'gaming', 'engage'),
              area('Game History', 'gaming', 'engage'),
            ],
          },
          {
            name: 'Bingo',
            slug: 'bingo',
            areas: [
              area('Rooms', 'gaming', 'bingo'),
              area('Tickets', 'gaming', 'bingo'),
              area('Chat', 'gaming', 'bingo'),
              area('Schedule', 'gaming', 'bingo'),
            ],
          },
          {
            name: 'Poker',
            slug: 'poker',
            areas: [
              area('Tables', 'gaming', 'poker'),
              area('Tournaments', 'gaming', 'poker'),
              area('Hand History', 'gaming', 'poker'),
              area('Sit & Go', 'gaming', 'poker'),
            ],
          },
        ],
      },
      {
        name: 'Player Experience',
        slug: 'player-experience',
        icon: '👤',
        subdomains: [
          {
            name: 'Onboarding',
            slug: 'onboarding',
            areas: [
              area('Registration', 'player-experience', 'onboarding'),
              area('KYC Verification', 'player-experience', 'onboarding'),
              area('First Deposit', 'player-experience', 'onboarding'),
              area('Welcome Journey', 'player-experience', 'onboarding'),
            ],
          },
          {
            name: 'Channels',
            slug: 'channels',
            areas: [
              area('CRM', 'player-experience', 'channels'),
              area('Push Notifications', 'player-experience', 'channels'),
              area('Email', 'player-experience', 'channels'),
              area('In-App Messaging', 'player-experience', 'channels'),
            ],
          },
          {
            name: 'Player Safety',
            slug: 'player-safety',
            areas: [
              area('Responsible Gambling Tools', 'player-experience', 'player-safety'),
              area('Self-Exclusion', 'player-experience', 'player-safety'),
              area('Limits', 'player-experience', 'player-safety'),
              area('Reality Checks', 'player-experience', 'player-safety'),
            ],
          },
          {
            name: 'Payments & Cashier',
            slug: 'payments-and-cashier',
            areas: [
              area('Deposits', 'player-experience', 'payments-and-cashier'),
              area('Withdrawals', 'player-experience', 'payments-and-cashier'),
              area('Payment Methods', 'player-experience', 'payments-and-cashier'),
              area('Transaction History', 'player-experience', 'payments-and-cashier'),
            ],
          },
        ],
      },
    ],
    shared: [
      sharedArea('Design System'),
      sharedArea('Accessibility'),
      sharedArea('Localisation'),
      sharedArea('Personalisation'),
      sharedArea('Responsible Gambling'),
      sharedArea('Payments'),
    ],
  };
}
