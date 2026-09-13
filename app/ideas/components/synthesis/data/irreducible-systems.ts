/**
 * IRREDUCIBLE SYSTEMS - The Foundation of Vitruvity Synthesis
 * 
 * PURPOSE OF CONCEPT MAPPING:
 * Find patterns across disciplines → see if there are ways to build that into the product.
 * We're creating a new world. Athens was once a new world.
 * 
 * WHY THESE THREE:
 * - Greek Polis: What is it to create a civilization?
 * - Music Studio: Aren't we building tools for creation? Isn't that like a studio itself?
 * - Math/Science: We're using AI code generators and vectorized databases
 * 
 * THE OUTPUT: An app name that considers all of these things.
 */

export interface IrreducibleSystem {
  id: string;
  name: string;
  builtFor: string;
  dealsIn: string[];
  failureMode: string;
  cannotReduceWithoutLosing: string[];
  icon: string;
}

export const IRREDUCIBLE_SYSTEMS_DEFINITION = {
  meaning: `Systems that cannot be simplified into each other without losing their internal logic — yet still express the same structural lifecycle. They are independent discoveries of the same underlying engine.`,
  
  plainLanguage: `They're not metaphors. They're not inspirations. They're separate civilizations / crafts / sciences that converged on the same structure because reality forces it.`,
  
  keyInsight: `If all three independently require the same lifecycle, and none can be reduced to the others, then the lifecycle itself is fundamental. That's what gives Vitruvity legitimacy.`,
  
  claim: `Any system that turns signal into shared meaning must pass through these stages.`,
  
  stealableLines: [
    'Irreducible systems are independent ways reality learned how to turn signal into meaning.',
    'They are different answers to the same structural problem.',
  ]
};

export const IRREDUCIBLE_SYSTEMS: IrreducibleSystem[] = [
  {
    id: 'greek-polis',
    name: 'Greek Polis (Athens)',
    builtFor: 'Human coexistence',
    dealsIn: ['Memory (mneme)', 'Law', 'Citizenship', 'Trust', 'Exchange'],
    failureMode: 'Tyranny, chaos, loss of culture',
    cannotReduceWithoutLosing: ['Ethics', 'Governance', 'Civic identity'],
    icon: '🏛️',
  },
  {
    id: 'music-studio',
    name: 'Music Studio / Production Chain',
    builtFor: 'Meaningful signal',
    dealsIn: ['Capture', 'Noise', 'Routing', 'Balance', 'Translation'],
    failureMode: 'Noise, distortion, incoherence',
    cannotReduceWithoutLosing: ['Craft', 'Aesthetic judgment', 'Human perception'],
    icon: '🎛️',
  },
  {
    id: 'modern-science',
    name: 'Modern Science (Quantum + Systems)',
    builtFor: 'Truth under measurement',
    dealsIn: ['States', 'Observation', 'Information', 'Coherence/decoherence', 'Emergence'],
    failureMode: 'Entropy, loss of signal, non-predictability',
    cannotReduceWithoutLosing: ['Precision', 'Falsifiability', 'Mathematical structure'],
    icon: '⚛️',
  }
];

/**
 * APP NAME IDEAS
 * 
 * These capture:
 * - signal → structure
 * - identity → culture
 * - governance → exchange
 * - compression → meaning
 * - calm intelligence (not hype)
 */

export interface AppNameIdea {
  name: string;
  etymology: string;
  category: 'structural' | 'signal-meaning' | 'governance-trust' | 'modern-product';
}

export const APP_NAME_CATEGORIES = {
  structural: {
    id: 'structural',
    name: 'Structural / Foundational',
    description: 'Very Vitruvity-core',
  },
  'signal-meaning': {
    id: 'signal-meaning',
    name: 'Signal → Meaning → Culture',
    description: 'The transformation chain',
  },
  'governance-trust': {
    id: 'governance-trust',
    name: 'Governance / Exchange / Trust',
    description: 'The civic layer',
  },
  'modern-product': {
    id: 'modern-product',
    name: 'Modern, Product-Ready, Non-Mythic',
    description: 'Consumer-safe naming',
  },
};

export const APP_NAME_IDEAS: AppNameIdea[] = [
  // Category 1: Structural / Foundational
  { name: 'Polisign', etymology: 'polis + signal', category: 'structural' },
  { name: 'Mnema', etymology: 'memory as structure', category: 'structural' },
  { name: 'Formative', etymology: 'form → identity', category: 'structural' },
  { name: 'Civis', etymology: 'citizen as unit of culture', category: 'structural' },
  { name: 'Structra', etymology: 'structure without rigidity', category: 'structural' },
  
  // Category 2: Signal → Meaning → Culture
  { name: 'Echoform', etymology: 'feedback + shape', category: 'signal-meaning' },
  { name: 'Signalon', etymology: 'signal as entity', category: 'signal-meaning' },
  { name: 'Meaningfold', etymology: 'compression of experience', category: 'signal-meaning' },
  { name: 'Lifecoded', etymology: 'life as encoded signal', category: 'signal-meaning' },
  { name: 'Resonary', etymology: 'resonance as coherence', category: 'signal-meaning' },
  
  // Category 3: Governance / Exchange / Trust
  { name: 'Agorae', etymology: 'exchange space, modernized', category: 'governance-trust' },
  { name: 'Cohere', etymology: 'coherence + community', category: 'governance-trust' },
  { name: 'Trustline', etymology: 'routing through trust', category: 'governance-trust' },
  { name: 'Commonform', etymology: 'shared structure', category: 'governance-trust' },
  { name: 'Civicraft', etymology: 'craft + citizenship', category: 'governance-trust' },
  
  // Category 4: Modern, Product-Ready, Non-Mythic
  { name: 'Formflow', etymology: 'structure in motion', category: 'modern-product' },
  { name: 'Signalset', etymology: 'curated identity', category: 'modern-product' },
  { name: 'Structive', etymology: 'active structure', category: 'modern-product' },
  { name: 'Patterna', etymology: 'pattern recognition, human-safe', category: 'modern-product' },
  { name: 'Virex', etymology: 'vital + exchange', category: 'modern-product' },
];

export const getNamesByCategory = (category: AppNameIdea['category']): AppNameIdea[] => {
  return APP_NAME_IDEAS.filter(n => n.category === category);
};

export const getStructuralNames = () => getNamesByCategory('structural');
export const getSignalMeaningNames = () => getNamesByCategory('signal-meaning');
export const getGovernanceTrustNames = () => getNamesByCategory('governance-trust');
export const getModernProductNames = () => getNamesByCategory('modern-product');
