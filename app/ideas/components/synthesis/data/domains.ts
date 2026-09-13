export interface DomainMapping {
  id: string;
  name: string;
  category: string;
  icon: string;
  coreWords: string[];
  vitruvityTranslation: string;
  modernParallels: string[];
  stealablePhrase: string;
  enabled: boolean;
}

export interface DomainCategory {
  id: string;
  name: string;
  icon: string;
  domains: DomainMapping[];
}

export const DOMAIN_CATEGORIES: DomainCategory[] = [
  {
    id: 'foundational',
    name: 'Foundational (Always Include)',
    icon: '🏛️',
    domains: [
      {
        id: 'greek-polis',
        name: 'Greek Athens / Polis',
        category: 'foundational',
        icon: '🏛️',
        coreWords: ['oikos', 'agora', 'polis', 'citizen', 'memory', 'law', 'trade', 'trust', 'governance'],
        vitruvityTranslation: 'Private life (Oikos) → public exchange (Agora). Governance, citizenship, and emergence of culture.',
        modernParallels: ['community platforms', 'reputation systems', 'digital citizenship'],
        stealablePhrase: 'Build your city. Govern your Athens.',
        enabled: true
      },
      {
        id: 'music-studio',
        name: 'Music Studio / Production',
        category: 'foundational',
        icon: '🎵',
        coreWords: ['capture', 'record', 'shape', 'mix', 'master', 'distribute', 'routing', 'signal', 'noise'],
        vitruvityTranslation: 'Raw signal becomes a finished record. Notes, routing, and mixing define meaning.',
        modernParallels: ['DAWs', 'content pipelines', 'creative workflows'],
        stealablePhrase: 'Mix your signal. Master your output.',
        enabled: true
      },
      {
        id: 'quantum-systems',
        name: 'Modern Science (Quantum + Systems)',
        category: 'foundational',
        icon: '⚛️',
        coreWords: ['observation', 'state', 'coherence', 'decoherence', 'packets', 'compression', 'routing', 'feedback', 'emergence'],
        vitruvityTranslation: 'Observation → state → coherence/decoherence. Identity as a compressed, vectorized state.',
        modernParallels: ['AI embeddings', 'recommendation systems', 'information theory'],
        stealablePhrase: 'Your identity is a chosen measurement.',
        enabled: true
      }
    ]
  },
  {
    id: 'physics',
    name: 'Physics',
    icon: '🔬',
    domains: [
      {
        id: 'classical-mechanics',
        name: 'Classical Mechanics',
        category: 'physics',
        icon: '⚙️',
        coreWords: ['equilibrium', 'constraints', 'inertia', 'friction', 'stability', 'control'],
        vitruvityTranslation: 'Life drifts by default (inertia); design adds constraints + feedback.',
        modernParallels: ['autopilot', 'cruise control', 'thermostats'],
        stealablePhrase: 'You set constraints, not vibes.',
        enabled: false
      },
      {
        id: 'thermodynamics',
        name: 'Thermodynamics',
        category: 'physics',
        icon: '🌡️',
        coreWords: ['entropy', 'energy budget', 'efficiency', 'dissipation', 'gradients'],
        vitruvityTranslation: 'Your life naturally becomes messy (entropy); systems reduce waste.',
        modernParallels: ['inbox zero', 'budgeting apps', 'meal prep', 'routines'],
        stealablePhrase: 'We turn entropy into structure.',
        enabled: false
      },
      {
        id: 'statistical-mechanics',
        name: 'Statistical Mechanics',
        category: 'physics',
        icon: '📊',
        coreWords: ['microstate', 'macrostate', 'distributions', 'averages', 'phase transitions'],
        vitruvityTranslation: 'Single events don\'t define you; patterns do.',
        modernParallels: ['Spotify Wrapped', 'Strava weekly load', 'screen-time summaries'],
        stealablePhrase: 'Your identity is a distribution, not a moment.',
        enabled: false
      },
      {
        id: 'electromagnetism',
        name: 'Electromagnetism',
        category: 'physics',
        icon: '⚡',
        coreWords: ['signal', 'noise', 'fields', 'resonance', 'coupling', 'interference'],
        vitruvityTranslation: 'Your info diet + environment "couple" to you; signals shape behavior.',
        modernParallels: ['recommendation systems', 'notification design'],
        stealablePhrase: 'Tune inputs, tune outcomes.',
        enabled: false
      }
    ]
  },
  {
    id: 'quantum',
    name: 'Quantum Physics (Deep)',
    icon: '🔮',
    domains: [
      {
        id: 'quantum-information',
        name: 'Quantum Information',
        category: 'quantum',
        icon: '💠',
        coreWords: ['state', 'measurement', 'observables', 'encoding', 'decoherence'],
        vitruvityTranslation: '"Who you are" depends on what\'s measured and revealed (privacy/purpose).',
        modernParallels: ['privacy controls', 'selective sharing', 'context collapse'],
        stealablePhrase: 'Your identity is a chosen measurement.',
        enabled: false
      },
      {
        id: 'superposition',
        name: 'Superposition',
        category: 'quantum',
        icon: '🌀',
        coreWords: ['multiple states', 'potential', 'measurement', 'collapse'],
        vitruvityTranslation: 'You\'re not one profile—you\'re many potential identities until a context calls one forward.',
        modernParallels: ['alt accounts', 'personas', 'context switching'],
        stealablePhrase: 'You\'re in superposition—until you pick a Persona.',
        enabled: false
      },
      {
        id: 'entanglement',
        name: 'Entanglement',
        category: 'quantum',
        icon: '🔗',
        coreWords: ['correlated states', 'distance', 'non-locality', 'connection'],
        vitruvityTranslation: 'Trust ties (friends/community) create correlation that beats anonymous reviews.',
        modernParallels: ['word-of-mouth', 'referrals', 'trust networks'],
        stealablePhrase: 'Word-of-mouth is social entanglement.',
        enabled: false
      },
      {
        id: 'decoherence',
        name: 'Decoherence',
        category: 'quantum',
        icon: '📡',
        coreWords: ['loss of coherence', 'environment', 'noise', 'collapse'],
        vitruvityTranslation: 'Surveillance + spam + friction collapses authentic sharing into performative posting.',
        modernParallels: ['E2E encryption', 'private sharing', 'close-friends modes', 'invite-only'],
        stealablePhrase: 'We protect coherence.',
        enabled: false
      }
    ]
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    icon: '🧪',
    domains: [
      {
        id: 'molecular-binding',
        name: 'Molecular Binding / Affinity',
        category: 'chemistry',
        icon: '🔬',
        coreWords: ['affinity', 'selectivity', 'reaction pathways', 'catalysts'],
        vitruvityTranslation: 'You "bind" to certain places/ideas; friends catalyze discovery.',
        modernParallels: ['recommendation engines', 'social discovery', 'interest matching'],
        stealablePhrase: 'Your taste has affinity. Friends are catalysts.',
        enabled: false
      },
      {
        id: 'separation-science',
        name: 'Separation Science',
        category: 'chemistry',
        icon: '⚗️',
        coreWords: ['filtering', 'extraction', 'purification', 'partitioning'],
        vitruvityTranslation: 'Separate personas + datasets; share purified summaries, not raw life.',
        modernParallels: ['privacy filters', 'data minimization', 'selective disclosure'],
        stealablePhrase: 'Extract → purify → share.',
        enabled: false
      }
    ]
  },
  {
    id: 'biology',
    name: 'Biology',
    icon: '🧬',
    domains: [
      {
        id: 'genetics',
        name: 'Genetics / Expression',
        category: 'biology',
        icon: '🧬',
        coreWords: ['genotype', 'phenotype', 'expression', 'regulation'],
        vitruvityTranslation: 'You have underlying preferences, but context changes expression (work vs friends).',
        modernParallels: ['context-aware profiles', 'adaptive UIs', 'role-based access'],
        stealablePhrase: 'Same person, different expression.',
        enabled: false
      },
      {
        id: 'ecology',
        name: 'Ecology',
        category: 'biology',
        icon: '🌿',
        coreWords: ['niches', 'networks', 'mutualism', 'invasive species'],
        vitruvityTranslation: 'Your communities are ecosystems; spam/ads are invasive; trust is mutualism.',
        modernParallels: ['community health', 'moderation', 'trust & safety'],
        stealablePhrase: 'Healthy ecosystems, not attention farms.',
        enabled: false
      },
      {
        id: 'neuroscience',
        name: 'Neuroscience',
        category: 'biology',
        icon: '🧠',
        coreWords: ['attention', 'salience', 'reward loops', 'plasticity'],
        vitruvityTranslation: 'Feeds hijack reward loops; intentional inputs reshape behavior.',
        modernParallels: ['screen time', 'digital wellness', 'attention design'],
        stealablePhrase: 'Design your inputs. Rewire your defaults.',
        enabled: false
      }
    ]
  },
  {
    id: 'behavioral',
    name: 'Psychology & Behavioral',
    icon: '🧠',
    domains: [
      {
        id: 'psychology',
        name: 'Psychology',
        category: 'behavioral',
        icon: '💭',
        coreWords: ['identity', 'roles', 'social proof', 'habit loops', 'self-determination'],
        vitruvityTranslation: 'Personas are roles you control; sharing is social proof, but permissioned.',
        modernParallels: ['alt accounts', 'close friends', 'finsta', 'group chat culture'],
        stealablePhrase: 'You control which "you" shows up.',
        enabled: false
      },
      {
        id: 'network-science',
        name: 'Network Science',
        category: 'behavioral',
        icon: '🕸️',
        coreWords: ['nodes', 'edges', 'hubs', 'homophily', 'diffusion', 'contagion'],
        vitruvityTranslation: 'WOM spreads through trust graphs; local businesses win when the graph routes intent.',
        modernParallels: ['social graphs', 'viral loops', 'network effects'],
        stealablePhrase: 'We route discovery through real trust.',
        enabled: false
      },
      {
        id: 'governance',
        name: 'Governance',
        category: 'behavioral',
        icon: '⚖️',
        coreWords: ['norms', 'institutions', 'legitimacy', 'reputation'],
        vitruvityTranslation: '"Mayor of your Athens" = you set rules, permissions, and accountability.',
        modernParallels: ['access control', 'permissions', 'reputation systems'],
        stealablePhrase: 'Personal governance over personal data.',
        enabled: false
      }
    ]
  },
  {
    id: 'computer-science',
    name: 'Computer Science & AI',
    icon: '💻',
    domains: [
      {
        id: 'information-theory',
        name: 'Information Theory',
        category: 'computer-science',
        icon: '📡',
        coreWords: ['compression', 'encoding', 'noise', 'bandwidth'],
        vitruvityTranslation: 'Your context vector is a compressed representation of you—usable without oversharing.',
        modernParallels: ['embeddings', 'compression algorithms', 'efficient encoding'],
        stealablePhrase: 'Compressed identity. High signal. Low exposure.',
        enabled: false
      },
      {
        id: 'databases',
        name: 'Databases',
        category: 'computer-science',
        icon: '🗄️',
        coreWords: ['schema', 'indexing', 'retrieval', 'access control'],
        vitruvityTranslation: '"Athenian database" = structured saves + purpose-bound access + audit logs.',
        modernParallels: ['personal data stores', 'data vaults', 'consent management'],
        stealablePhrase: 'A database you govern.',
        enabled: false
      },
      {
        id: 'machine-learning',
        name: 'Machine Learning',
        category: 'computer-science',
        icon: '🤖',
        coreWords: ['embeddings', 'similarity', 'personalization', 'alignment'],
        vitruvityTranslation: 'Embeddings power matching, but consent + personas prevent creepiness.',
        modernParallels: ['recommendation systems', 'personalization', 'semantic search'],
        stealablePhrase: 'Personalization without surveillance.',
        enabled: false
      }
    ]
  },
  {
    id: 'economics',
    name: 'Economics & Geography',
    icon: '📈',
    domains: [
      {
        id: 'economics',
        name: 'Economics',
        category: 'economics',
        icon: '💰',
        coreWords: ['markets', 'incentives', 'information asymmetry', 'externalities'],
        vitruvityTranslation: 'Today\'s ad economy exploits asymmetry. You flip it: user-owned context becomes the negotiating chip.',
        modernParallels: ['data markets', 'consent economies', 'user ownership'],
        stealablePhrase: 'Consent-based markets.',
        enabled: false
      },
      {
        id: 'geography',
        name: 'Earth Science / Geography',
        category: 'economics',
        icon: '🌍',
        coreWords: ['hubs', 'trade routes', 'ports', 'flows'],
        vitruvityTranslation: 'Your libraries are ports; sharing links are lanes; Agora is exchange.',
        modernParallels: ['content distribution', 'CDNs', 'sharing flows'],
        stealablePhrase: 'Build your port. Control your lanes.',
        enabled: false
      }
    ]
  }
];

export const getAllDomains = (): DomainMapping[] => {
  return DOMAIN_CATEGORIES.flatMap(cat => cat.domains);
};

export const getEnabledDomains = (domains: DomainMapping[]): DomainMapping[] => {
  return domains.filter(d => d.enabled);
};

export const getFoundationalDomains = (): DomainMapping[] => {
  const foundational = DOMAIN_CATEGORIES.find(c => c.id === 'foundational');
  return foundational?.domains || [];
};
