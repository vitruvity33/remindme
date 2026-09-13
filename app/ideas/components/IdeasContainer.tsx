'use client';

import { useState } from 'react';
import { ConceptSynthesis } from './synthesis/ConceptSynthesis';

type SectionState = 'expanded' | 'collapsed';

export function IdeasContainer() {
  const [synthesisState, setSynthesisState] = useState<SectionState>('expanded');

  return (
    <div className="max-w-[1800px] mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Ideas
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Explore, connect, and synthesize your concepts
        </p>
      </div>

      {/* Concept Synthesis Section */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setSynthesisState(prev => prev === 'expanded' ? 'collapsed' : 'expanded')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-t-lg"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔮</span>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Concept Synthesis
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Cross-domain connections & naming
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {synthesisState === 'expanded' ? 'Collapse' : 'Expand'}
            </span>
            <svg 
              className={`w-5 h-5 text-gray-500 transition-transform ${synthesisState === 'expanded' ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
        
        {synthesisState === 'expanded' && (
          <div className="px-6 pb-6">
            <ConceptSynthesis />
          </div>
        )}
      </section>
    </div>
  );
}
