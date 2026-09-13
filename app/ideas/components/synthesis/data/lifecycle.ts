export interface LifecycleStep {
  id: string;
  number: number;
  name: string;
  icon: string;
  description: string;
  greekParallel: string;
  musicParallel: string;
  scienceParallel: string;
  questions: string[];
}

export const VITRUVITY_LIFECYCLE: LifecycleStep[] = [
  {
    id: 'capture',
    number: 1,
    name: 'Capture',
    icon: '👁️',
    description: 'Perception / observation - taking in raw signal',
    greekParallel: 'Witnessing events, gathering stories',
    musicParallel: 'Microphone picks up sound',
    scienceParallel: 'Observation, measurement',
    questions: ['What are you perceiving?', 'What signal are you receiving?']
  },
  {
    id: 'constraint',
    number: 2,
    name: 'Constraint',
    icon: '📏',
    description: 'Measure, set boundaries',
    greekParallel: 'Laws, city walls, citizenship rules',
    musicParallel: 'Gain staging, input levels',
    scienceParallel: 'Boundary conditions, parameters',
    questions: ['What limits define this?', 'What boundaries apply?']
  },
  {
    id: 'noise',
    number: 3,
    name: 'Noise Control',
    icon: '🔇',
    description: 'Coherence vs chaos - filtering signal from noise',
    greekParallel: 'Distinguishing gossip from truth',
    musicParallel: 'Noise gate, EQ filtering',
    scienceParallel: 'Signal-to-noise ratio, decoherence',
    questions: ['What is signal? What is noise?', 'How do you maintain coherence?']
  },
  {
    id: 'record',
    number: 4,
    name: 'Recording',
    icon: '💾',
    description: 'Memory / state - preserving what matters',
    greekParallel: 'Writing history, oral tradition',
    musicParallel: 'Recording to tape/DAW',
    scienceParallel: 'State preservation, memory storage',
    questions: ['What gets remembered?', 'How is state preserved?']
  },
  {
    id: 'select',
    number: 5,
    name: 'Selection',
    icon: '✂️',
    description: 'Judgment, identity - choosing what defines you',
    greekParallel: 'Choosing which stories to tell',
    musicParallel: 'Selecting takes, comping',
    scienceParallel: 'Measurement collapse, selection pressure',
    questions: ['What do you keep?', 'What defines identity?']
  },
  {
    id: 'shape',
    number: 6,
    name: 'Shaping',
    icon: '🎨',
    description: 'Encoding character - giving form to meaning',
    greekParallel: 'Rhetoric, style, persona',
    musicParallel: 'EQ, compression, effects',
    scienceParallel: 'Encoding, transformation',
    questions: ['How is character expressed?', 'What form does it take?']
  },
  {
    id: 'group',
    number: 7,
    name: 'Grouping',
    icon: '📦',
    description: 'Structure, citizenship - organizing into units',
    greekParallel: 'Tribes, demes, households',
    musicParallel: 'Arranging, grouping tracks',
    scienceParallel: 'Classification, categorization',
    questions: ['How are things organized?', 'What belongs together?']
  },
  {
    id: 'route',
    number: 8,
    name: 'Routing',
    icon: '🔀',
    description: 'Governance, flow - directing where things go',
    greekParallel: 'Trade routes, political channels',
    musicParallel: 'Bus routing, sends, signal flow',
    scienceParallel: 'Information flow, pathways',
    questions: ['How does information flow?', 'Who decides where things go?']
  },
  {
    id: 'mix',
    number: 9,
    name: 'Mixing',
    icon: '🎚️',
    description: 'Balance, harmony - combining elements',
    greekParallel: 'Balancing factions, symposium',
    musicParallel: 'Mixing levels, panning, space',
    scienceParallel: 'Integration, synthesis',
    questions: ['How are elements balanced?', 'What creates harmony?']
  },
  {
    id: 'compress',
    number: 10,
    name: 'Compression',
    icon: '🗜️',
    description: 'Essence, vectorization - distilling to core',
    greekParallel: 'Aphorisms, maxims, reputation',
    musicParallel: 'Dynamic compression, limiting',
    scienceParallel: 'Data compression, embeddings',
    questions: ['What is the essence?', 'How do you compress without losing meaning?']
  },
  {
    id: 'master',
    number: 11,
    name: 'Mastering',
    icon: '💎',
    description: 'Translation across contexts - preparing for the world',
    greekParallel: 'Preparing for the Agora',
    musicParallel: 'Mastering for different formats',
    scienceParallel: 'Generalization, transfer learning',
    questions: ['How does this translate?', 'What contexts must it work in?']
  },
  {
    id: 'distribute',
    number: 12,
    name: 'Distribution',
    icon: '📤',
    description: 'Markets, packets, trade - sharing with others',
    greekParallel: 'Agora exchange, trade networks',
    musicParallel: 'Release, streaming, distribution',
    scienceParallel: 'Packet transmission, broadcasting',
    questions: ['How is it shared?', 'Through what channels?']
  },
  {
    id: 'receive',
    number: 13,
    name: 'Reception',
    icon: '📥',
    description: 'Interpretation, meaning - how others receive it',
    greekParallel: 'Audience interpretation, reputation',
    musicParallel: 'Listener experience',
    scienceParallel: 'Decoding, interpretation',
    questions: ['How is it received?', 'What meaning is made?']
  },
  {
    id: 'feedback',
    number: 14,
    name: 'Feedback Loops',
    icon: '🔄',
    description: 'Learning, adaptation - responding to reception',
    greekParallel: 'Democratic feedback, ostracism',
    musicParallel: 'Audience response, iteration',
    scienceParallel: 'Feedback systems, learning',
    questions: ['What comes back?', 'How do you adapt?']
  },
  {
    id: 'emerge',
    number: 15,
    name: 'Emergence',
    icon: '✨',
    description: 'Culture > parts - the whole becomes greater',
    greekParallel: 'Polis culture, collective identity',
    musicParallel: 'A record > sum of tracks',
    scienceParallel: 'Emergent properties, complexity',
    questions: ['What emerges?', 'How is the whole greater than parts?']
  }
];

export const LIFECYCLE_SUMMARY = `Capture → Constraint → Noise → Record → Select → Shape → Group → Route → Mix → Compress → Master → Distribute → Receive → Feedback → Emergence`;

export const THE_SPINE = {
  technical: 'Signal → Memory → Structure → Compression → Identity → Culture',
  refined: 'Lived signal becomes memory; memory becomes structure; structure compresses into identity; identity scales into culture through exchange.',
  consumerSafe: 'You capture what matters, reduce the noise, shape it into meaning, compress it into something usable, and share it through trusted networks—so identity and culture emerge by design.',
};

export const KEYSTONE_INSIGHT = {
  concept: 'Identity as compression',
  explanation: 'This single idea explains memory, culture, branding, trust, AI embeddings, reputation, and myth. Compression is where meaning becomes portable.',
  applications: [
    'Memory = compressed experience',
    'Culture = compressed shared identity', 
    'Branding = compressed promise',
    'Trust = compressed reputation',
    'AI embeddings = compressed semantics',
    'Reputation = compressed track record',
    'Myth = compressed collective memory'
  ]
};

export const IRREDUCIBLE_SYSTEMS = {
  principle: 'Three irreducible systems that independently discovered the same transformation pipeline',
  systems: [
    {
      name: 'Greek Athens / Polis',
      description: 'A city built from citizens, memory, law, trade, and trust. Private life (Oikos) → public exchange (Agora).',
    },
    {
      name: 'Music Studio / Production',
      description: 'Capture → Record → Shape → Group → Mix → Master → Distribute → Listen. Raw signal becomes a finished record.',
    },
    {
      name: 'Modern Science (Quantum + Systems)',
      description: 'Observation → state → coherence/decoherence. Information as packets, compression, routing, feedback loops.',
    }
  ],
  insight: 'Athens ≠ metaphor for a DAW. A DAW ≠ metaphor for quantum systems. They are parallel implementations of the same engine.'
};

export const getLifecycleByPhase = () => {
  return {
    input: VITRUVITY_LIFECYCLE.slice(0, 4),      // Capture through Record
    process: VITRUVITY_LIFECYCLE.slice(4, 10),   // Select through Compress
    output: VITRUVITY_LIFECYCLE.slice(10, 13),   // Master through Receive
    loop: VITRUVITY_LIFECYCLE.slice(13, 15)      // Feedback and Emergence
  };
};
