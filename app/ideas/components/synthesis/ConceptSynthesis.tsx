'use client';

import { useState } from 'react';
import { VITRUVITY_SYNTHESIS_PROMPT, VITRUVITY_CROSS_DOMAIN_PROMPT } from './prompts/synthesisPrompt';
import { DOMAIN_CATEGORIES, DomainMapping, getAllDomains } from './data/domains';
import { VITRUVITY_LIFECYCLE, LIFECYCLE_SUMMARY } from './data/lifecycle';

interface ConceptInput {
  concept: string;
  audience: string;
  useCase: string;
  tone: string;
  constraints: string;
  goal: 'naming' | 'explanation' | 'product-design' | 'pitch' | 'lifecycle-mapping';
}

interface SynthesisResult {
  snapshot: string;
  lifecycleMapping: Array<{
    step: string;
    mapping: Record<string, string>;
  }>;
  connectionMap: Array<{
    domain: string;
    connections: Array<{
      label: string;
      meaning: string;
      whyItMaps: string;
      modernParallel: string;
      stealablePhrase: string;
    }>;
  }>;
  stealablePhrases: string[];
  pitchLines: string[];
  nextActions: string[];
}

export function ConceptSynthesis() {
  const [input, setInput] = useState<ConceptInput>({
    concept: '',
    audience: '25, California',
    useCase: 'naming and pitch lines',
    tone: 'modern, not cringe',
    constraints: '',
    goal: 'lifecycle-mapping',
  });
  
  const [domains, setDomains] = useState<DomainMapping[]>(() => getAllDomains());
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<SynthesisResult | null>(null);
  const [vitruvityMode, setVitruvityMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'domains' | 'lifecycle'>('input');

  const toggleDomain = (domainId: string) => {
    setDomains(prev => prev.map(d => 
      d.id === domainId ? { ...d, enabled: !d.enabled } : d
    ));
  };

  const enableAllInCategory = (categoryId: string) => {
    const category = DOMAIN_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;
    const domainIds = category.domains.map(d => d.id);
    setDomains(prev => prev.map(d => 
      domainIds.includes(d.id) ? { ...d, enabled: true } : d
    ));
  };

  const disableAllInCategory = (categoryId: string) => {
    const category = DOMAIN_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;
    if (categoryId === 'foundational') return;
    const domainIds = category.domains.map(d => d.id);
    setDomains(prev => prev.map(d => 
      domainIds.includes(d.id) ? { ...d, enabled: false } : d
    ));
  };

  const getEnabledDomains = () => domains.filter(d => d.enabled);
  const getEnabledDomainsString = () => getEnabledDomains().map(d => d.name).join(', ');

  const handleSynthesize = async () => {
    if (!input.concept.trim()) {
      alert('Please enter a concept to synthesize');
      return;
    }

    setIsProcessing(true);
    const enabledDomains = getEnabledDomainsString();
    
    // TODO: Implement OpenAI API call
    setTimeout(() => {
      setResult({
        snapshot: `Analyzing "${input.concept}" across ${enabledDomains} for ${input.audience} audience...`,
        lifecycleMapping: [],
        connectionMap: [],
        stealablePhrases: [],
        pitchLines: [],
        nextActions: ['Connect OpenAI API to generate real synthesis'],
      });
      setIsProcessing(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('input')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'input'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📝 Concept Input
        </button>
        <button
          onClick={() => setActiveTab('domains')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'domains'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🔬 Domains ({getEnabledDomains().length})
        </button>
        <button
          onClick={() => setActiveTab('lifecycle')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'lifecycle'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🔄 15-Step Lifecycle
        </button>
      </div>

      {/* Input Tab - Frictionless, just type */}
      {activeTab === 'input' && (
        <div className="space-y-4">
          {/* The Spine - Core insight */}
          <div className="bg-gray-900 dark:bg-gray-950 text-gray-100 rounded-lg p-4 text-sm">
            <p className="font-mono leading-relaxed">
              Signal → Memory → Structure → <span className="text-teal-400 font-semibold">Compression</span> → Identity → Culture
            </p>
            <p className="text-gray-400 text-xs mt-2">
              The irreducible spine. Athens, music studios, and quantum systems are parallel implementations of the same engine.
            </p>
          </div>

          {/* Main concept input - big and prominent */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              What are you thinking about?
            </label>
            <textarea
              value={input.concept}
              onChange={(e) => setInput({ ...input, concept: e.target.value })}
              placeholder="Type freely... e.g., 'I'm building a tool for people to design their life instead of living by default' or 'How does trust scale in networks?' or 'What's the structure of reputation?'"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 min-h-[150px] text-base"
              autoFocus
            />
          </div>

          {/* Secondary inputs - all text fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Domains to map onto
              </label>
              <input
                type="text"
                value={getEnabledDomainsString()}
                readOnly
                placeholder="Greek polis, music production, quantum physics..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-gray-100 text-sm cursor-pointer"
                onClick={() => setActiveTab('domains')}
              />
              <p className="text-xs text-gray-500 mt-1">Click to configure domains →</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Who is this for?
              </label>
              <input
                type="text"
                value={input.audience}
                onChange={(e) => setInput({ ...input, audience: e.target.value })}
                placeholder="25-year-old in California, founders, designers..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                What do you need? (goal)
              </label>
              <input
                type="text"
                value={input.useCase}
                onChange={(e) => setInput({ ...input, useCase: e.target.value })}
                placeholder="naming, pitch lines, UI labels, explanation, product features..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tone / constraints
              </label>
              <input
                type="text"
                value={input.tone}
                onChange={(e) => setInput({ ...input, tone: e.target.value })}
                placeholder="modern not cringe, playful, serious, avoid jargon..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 text-sm"
              />
            </div>
          </div>

          {/* Vitruvity Mode + Synthesize */}
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={handleSynthesize}
              disabled={isProcessing || !input.concept.trim()}
              className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
            >
              {isProcessing ? 'Synthesizing...' : '🔮 Synthesize'}
            </button>
            <button
              onClick={() => setVitruvityMode(!vitruvityMode)}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                vitruvityMode
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title="Includes Oikos, Agora, Prosopon, Praxis, Symmetria"
            >
              {vitruvityMode ? '✨ Vitruvity' : '✨'}
            </button>
          </div>

          {/* The keystone insight */}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-sm">
            <p className="text-amber-800 dark:text-amber-200">
              <strong>Keystone:</strong> Identity is compression. Memory, culture, branding, trust, AI embeddings, reputation, myth—all compression. Where meaning becomes portable.
            </p>
          </div>
        </div>
      )}

      {/* Domains Tab */}
      {activeTab === 'domains' && (
        <div className="space-y-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Toggle domains to include in your synthesis. Foundational domains (Greek, Music, Science) are always recommended.
          </p>
          
          {DOMAIN_CATEGORIES.map((category) => (
            <div key={category.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{category.icon}</span>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{category.name}</h3>
                </div>
                {category.id !== 'foundational' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => enableAllInCategory(category.id)}
                      className="text-xs text-teal-600 hover:text-teal-700"
                    >
                      Enable All
                    </button>
                    <button
                      onClick={() => disableAllInCategory(category.id)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Disable All
                    </button>
                  </div>
                )}
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {category.domains.map((catDomain) => {
                  const domain = domains.find(d => d.id === catDomain.id);
                  if (!domain) return null;
                  return (
                    <div
                      key={domain.id}
                      onClick={() => category.id !== 'foundational' && toggleDomain(domain.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        domain.enabled
                          ? 'border-teal-300 bg-teal-50 dark:bg-teal-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                      } ${category.id === 'foundational' ? 'cursor-default opacity-90' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                          {domain.icon} {domain.name}
                        </span>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          domain.enabled 
                            ? 'bg-teal-500 border-teal-500' 
                            : 'border-gray-300 dark:border-gray-500'
                        }`}>
                          {domain.enabled && <span className="text-white text-xs">✓</span>}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {domain.vitruvityTranslation}
                      </p>
                      <p className="text-xs text-teal-600 dark:text-teal-400 italic">
                        "{domain.stealablePhrase}"
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lifecycle Tab */}
      {activeTab === 'lifecycle' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            The 15-step lifecycle is the structural backbone. Every concept maps to this chain.
          </p>
          
          <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-4 mb-4">
            <p className="text-sm text-teal-700 dark:text-teal-300 font-mono">
              {LIFECYCLE_SUMMARY}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {VITRUVITY_LIFECYCLE.map((step) => (
              <div key={step.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{step.icon}</span>
                  <div>
                    <span className="text-xs text-gray-500">Step {step.number}</span>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">{step.name}</h4>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{step.description}</p>
                <div className="space-y-1 text-xs">
                  <p><span className="text-gray-500">🏛️ Greek:</span> {step.greekParallel}</p>
                  <p><span className="text-gray-500">🎵 Music:</span> {step.musicParallel}</p>
                  <p><span className="text-gray-500">⚛️ Science:</span> {step.scienceParallel}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Section */}
      {result && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-6">
          <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-4">
            <h3 className="font-semibold text-teal-800 dark:text-teal-200 mb-2">Concept Snapshot</h3>
            <p className="text-teal-700 dark:text-teal-300">{result.snapshot}</p>
          </div>

          {result.nextActions.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
              <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">Next Actions</h3>
              <ul className="space-y-1">
                {result.nextActions.map((action, idx) => (
                  <li key={idx} className="text-amber-700 dark:text-amber-300 text-sm">
                    {idx + 1}. {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
