/**
 * RESEARCH SECTION V2 - Persistent Research with Selective Refresh
 * 
 * Features:
 * - Personal Interests: Track hobbies, sports teams, topics (refreshable)
 * - Company Research: Overview, news, products (occasional refresh)
 * - Tech Stack: Technologies, infrastructure (rare refresh)
 * - Persistent storage per person
 * - Individual refresh buttons
 * - Manual notes section
 */

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@supabase/supabase-js";
import { Loader2, ExternalLink, RefreshCw, Trash2, Plus, X } from "lucide-react";
import ReactMarkdown from 'react-markdown';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ResearchSectionProps {
  editedPreview: any;
  setEditedPreview: (preview: any) => void;
  personName?: string;
  personCompany?: string;
  personRole?: string;
  personId?: string; // For loading saved research
  onCountChange?: (count: number) => void; // Callback to update badge count
}

interface ResearchResult {
  id?: string;
  type: 'interest' | 'company' | 'tech_stack';
  topic: string;
  summary: string;
  data?: any;
  links: Array<{
    source: string;
    url: string;
    label: string;
  }>;
  last_updated: string;
  original_query?: string; // The original user query
  context_selections?: {
    useProfile?: boolean;
    useLinkedIn?: boolean;
    useConversations?: boolean;
    useNotes?: boolean;
  };
}

export function ResearchSectionV2({
  editedPreview,
  setEditedPreview,
  personName,
  personCompany,
  personRole,
  personId,
  onCountChange,
}: ResearchSectionProps) {
  // Saved research results
  const [savedResults, setSavedResults] = useState<ResearchResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState<'interests' | 'company' | 'tech'>('interests');
  const [newInterest, setNewInterest] = useState('');
  const [companyInput, setCompanyInput] = useState('');
  const [companyInstructions, setCompanyInstructions] = useState('');
  const [techStackInput, setTechStackInput] = useState('');
  const [useProfile, setUseProfile] = useState(true);
  const [useLinkedIn, setUseLinkedIn] = useState(false);
  const [useConversations, setUseConversations] = useState(false);
  const [useNotes, setUseNotes] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  // Load saved research results when person changes
  useEffect(() => {
    if (personId) {
      loadResearchResults();
    } else {
      setSavedResults([]);
    }
  }, [personId]);

  // Update count badge whenever results change
  useEffect(() => {
    if (onCountChange) {
      onCountChange(savedResults.length);
    }
  }, [savedResults, onCountChange]);

  const loadResearchResults = async () => {
    if (!personId) return;
    
    setLoadingResults(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/research/list?person_id=${personId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setSavedResults(data.results || []);
      }
    } catch (error) {
      console.error('Error loading research results:', error);
    } finally {
      setLoadingResults(false);
    }
  };

  const handleAddInterest = async () => {
    console.log('🔍 handleAddInterest called', { newInterest, personId });
    
    if (!newInterest.trim()) {
      console.warn('❌ No interest text provided');
      alert('Please enter an interest');
      return;
    }
    
    if (!personId) {
      console.warn('❌ No personId - need to load a person first');
      alert('Please load a person first before adding interests');
      return;
    }

    // Gather context based on checkboxes
    let contextData: any = {};
    
    if (useProfile) {
      contextData.profile = {
        name: personName,
        company: personCompany,
        role: personRole,
      };
    }
    
    if (useLinkedIn) {
      contextData.linkedin = editedPreview?.linkedin_profile || editedPreview?.people?.[0]?.linkedin_profile;
    }
    
    if (useConversations) {
      contextData.conversations = editedPreview?.additional_notes || [];
    }
    
    if (useNotes) {
      contextData.notes = editedPreview?.research || [];
    }
    
    console.log('📦 Context data for interest:', { useProfile, useLinkedIn, useConversations, useNotes, contextData });

    setIsResearching(true);
    try {
      console.log('📡 Calling /api/research/analyze...');
      
      // Analyze the interest
      const { data: { session } } = await supabase.auth.getSession();
      const analyzeResponse = await fetch('/api/research/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          type: 'interest',
          topic: newInterest,
          contextData, // Pass context
        }),
      });

      const analyzeData = await analyzeResponse.json();
      console.log('📊 Analyze response:', analyzeData);
      
      if (!analyzeData.success) throw new Error(analyzeData.error);

      // Save to database
      console.log('💾 Saving to database...');
      const saveResponse = await fetch('/api/research/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          person_id: personId,
          ...analyzeData.result,
        }),
      });

      const saveData = await saveResponse.json();
      console.log('💾 Save response:', saveData);
      
      if (saveData.success) {
        setSavedResults(prev => [saveData.result, ...prev]);
        setNewInterest('');
        console.log('✅ Interest added successfully!');
      } else {
        throw new Error(saveData.error || 'Failed to save');
      }
    } catch (error) {
      console.error('❌ Error adding interest:', error);
      alert(`Failed to add interest: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsResearching(false);
    }
  };

  const handleResearchCompany = async () => {
    const companyToResearch = companyInput.trim() || personCompany;
    console.log('🏢 handleResearchCompany called', { companyToResearch, personId, companyInput });
    
    if (!companyToResearch || !personId) {
      console.warn('❌ Missing required data:', { companyToResearch, personId });
      if (!personId) alert('Please load a person first');
      return;
    }

    // Gather context based on checkboxes
    let contextData: any = {};
    
    if (useProfile) {
      contextData.profile = {
        name: personName,
        company: personCompany,
        role: personRole,
      };
    }
    
    if (useLinkedIn) {
      contextData.linkedin = editedPreview?.linkedin_profile || editedPreview?.people?.[0]?.linkedin_profile;
    }
    
    if (useConversations) {
      contextData.conversations = editedPreview?.additional_notes || [];
    }
    
    if (useNotes) {
      contextData.notes = editedPreview?.research || [];
    }
    
    console.log('📦 Context data:', { useProfile, useLinkedIn, useConversations, useNotes, contextData });

    setIsResearching(true);
    try {
      console.log('📡 Calling /api/research/analyze for company...');
      const { data: { session } } = await supabase.auth.getSession();
      const analyzeResponse = await fetch('/api/research/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          type: 'company',
          companyName: companyToResearch,
          companyLinkedInUrl: companyInput.trim() ? undefined : editedPreview?.people?.[0]?.company_linkedin_url,
          customInstructions: companyInput.trim(),
          contextData, // Pass the context
        }),
      });

      const analyzeData = await analyzeResponse.json();
      if (!analyzeData.success) throw new Error(analyzeData.error);

      const saveResponse = await fetch('/api/research/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          person_id: personId,
          ...analyzeData.result,
          original_query: companyInput.trim(), // Save the original query
          context_selections: { // Save which context was selected
            useProfile,
            useLinkedIn,
            useConversations,
            useNotes
          },
        }),
      });

      const saveData = await saveResponse.json();
      if (saveData.success) {
        setSavedResults(prev => [saveData.result, ...prev]);
        setCompanyInput(''); // Clear input after successful research
        console.log('✅ Company research saved successfully');
      }
    } catch (error) {
      console.error('Error researching company:', error);
      alert('Failed to research company');
    } finally {
      setIsResearching(false);
    }
  };

  const handleResearchTechStack = async () => {
    const companyToResearch = techStackInput.trim() || personCompany;
    if (!companyToResearch || !personId) return;

    // Gather context based on checkboxes
    let contextData: any = {};
    
    if (useProfile) {
      contextData.profile = {
        name: personName,
        company: personCompany,
        role: personRole,
      };
    }
    
    if (useLinkedIn) {
      contextData.linkedin = editedPreview?.linkedin_profile || editedPreview?.people?.[0]?.linkedin_profile;
    }
    
    if (useConversations) {
      contextData.conversations = editedPreview?.additional_notes || [];
    }
    
    if (useNotes) {
      contextData.notes = editedPreview?.research || [];
    }

    setIsResearching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const analyzeResponse = await fetch('/api/research/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          type: 'tech_stack',
          companyName: companyToResearch,
          contextData, // Pass context
          personContext: {
            name: personName,
            role: personRole,
            company: personCompany,
          },
        }),
      });

      const analyzeData = await analyzeResponse.json();
      if (!analyzeData.success) throw new Error(analyzeData.error);

      const saveResponse = await fetch('/api/research/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          person_id: personId,
          ...analyzeData.result,
        }),
      });

      const saveData = await saveResponse.json();
      if (saveData.success) {
        setSavedResults(prev => [saveData.result, ...prev]);
        setTechStackInput(''); // Clear input after successful research
        console.log('✅ Tech stack research saved successfully');
      }
    } catch (error) {
      console.error('Error researching tech stack:', error);
      alert('Failed to research tech stack');
    } finally {
      setIsResearching(false);
    }
  };

  const handleRefresh = async (result: ResearchResult) => {
    if (!result.id || !personId) return;

    setRefreshingId(result.id);
    try {
      // Gather context data based on saved context selections
      let contextData: any = null;
      if (result.context_selections) {
        contextData = {};
        
        if (result.context_selections.useProfile) {
          contextData.profile = {
            name: personName,
            role: personRole,
            company: personCompany
          };
        }
        
        if (result.context_selections.useLinkedIn && editedPreview?.people?.[0]) {
          contextData.linkedin = editedPreview.people[0];
        }
        
        if (result.context_selections.useConversations && editedPreview?.additional_notes) {
          contextData.conversations = editedPreview.additional_notes;
        }
        
        if (result.context_selections.useNotes && editedPreview?.memories) {
          contextData.notes = editedPreview.memories;
        }
      }

      // Re-analyze with the original query and context
      const { data: { session } } = await supabase.auth.getSession();
      const analyzeResponse = await fetch('/api/research/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          type: result.type,
          topic: result.type === 'interest' ? result.topic : undefined,
          companyName: result.type !== 'interest' ? personCompany : undefined,
          companyLinkedInUrl: result.type === 'company' ? editedPreview?.people?.[0]?.company_linkedin_url : undefined,
          customInstructions: result.original_query, // Use the saved original query!
          contextData, // Use the saved context selections
          personContext: result.type === 'tech_stack' ? {
            name: personName,
            role: personRole,
            company: personCompany,
          } : undefined,
        }),
      });

      const analyzeData = await analyzeResponse.json();
      if (!analyzeData.success) throw new Error(analyzeData.error);

      // Update in database
      const saveResponse = await fetch('/api/research/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          person_id: personId,
          ...analyzeData.result,
          original_query: result.original_query, // Keep the original query
          context_selections: result.context_selections, // Keep the context selections
        }),
      });

      const saveData = await saveResponse.json();
      if (saveData.success) {
        setSavedResults(prev => prev.map(r => r.id === result.id ? saveData.result : r));
      }
    } catch (error) {
      console.error('Error refreshing research:', error);
      alert('Failed to refresh research');
    } finally {
      setRefreshingId(null);
    }
  };

  const handleDelete = async (result: ResearchResult) => {
    if (!result.id) return;
    if (!confirm(`Delete research on "${result.topic}"?`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/research/delete?id=${result.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setSavedResults(prev => prev.filter(r => r.id !== result.id));
      }
    } catch (error) {
      console.error('Error deleting research:', error);
      alert('Failed to delete research');
    }
  };

  const addResultToNotes = (result: ResearchResult) => {
    const newNote = {
      date: new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }),
      text: `${result.topic}: ${result.summary.substring(0, 200)}...`,
      source: result.links[0]?.url || '',
      tags: [result.type],
    };
    
    const existingResearch = editedPreview?.research || [];
    setEditedPreview({
      ...editedPreview,
      research: [newNote, ...existingResearch],
    });
  };

  // Filter results by type
  const interestResults = savedResults.filter(r => r.type === 'interest');
  const companyResults = savedResults.filter(r => r.type === 'company');
  const techStackResults = savedResults.filter(r => r.type === 'tech_stack');

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('interests')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'interests'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Personal Interests
        </button>
        <button
          onClick={() => setActiveTab('company')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'company'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Company
        </button>
        <button
          onClick={() => setActiveTab('tech')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'tech'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Tech Stack
        </button>
      </div>

      {/* Personal Interests Tab */}
      {activeTab === 'interests' && (
        <div className="space-y-3">
          {!personId ? (
            <p className="text-sm text-gray-500 italic text-center py-4 bg-yellow-50 border border-yellow-200 rounded p-3">
              💡 Load a person from your library first to track their interests
            </p>
          ) : (
            <>
              {/* Context source checkboxes */}
              <div className="flex gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useProfile}
                    onChange={(e) => setUseProfile(e.target.checked)}
                    className="rounded"
                  />
                  <span>Profile</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useLinkedIn}
                    onChange={(e) => setUseLinkedIn(e.target.checked)}
                    className="rounded"
                  />
                  <span>LinkedIn</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useConversations}
                    onChange={(e) => setUseConversations(e.target.checked)}
                    className="rounded"
                  />
                  <span>Conversations</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useNotes}
                    onChange={(e) => setUseNotes(e.target.checked)}
                    className="rounded"
                  />
                  <span>Notes</span>
                </label>
              </div>

              {/* Add Interest Input - Like Follow-ups */}
              <textarea
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                placeholder="Add interest (Enter to save, Shift+Enter for new line)"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-2 resize-none overflow-hidden"
                rows={1}
                onInput={(e) => {
                  e.currentTarget.style.height = 'auto';
                  e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && newInterest.trim()) {
                    e.preventDefault();
                    handleAddInterest();
                    e.currentTarget.style.height = 'auto';
                  }
                }}
              />

              {/* Interest Cards - Like Follow-ups */}
              {interestResults.map((result) => (
                <div key={result.id} className="p-4 bg-white rounded border border-gray-200">
                  {/* Header with topic and delete */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h5 className="text-sm font-semibold text-gray-800 mb-1">{result.topic}</h5>
                      {result.summary && (
                        <p className="text-xs text-gray-600 mb-2">{result.summary}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(result)}
                      className="text-red-600 hover:text-red-700 text-lg font-bold ml-2"
                    >
                      ×
                    </button>
                  </div>

                  {/* Links */}
                  {result.links && result.links.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-2">
                        {result.links.map((link, idx) => (
                          <a
                            key={idx}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {link.source}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      {result.last_updated ? `Updated: ${new Date(result.last_updated).toLocaleDateString()}` : 'Not researched yet'}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleRefresh(result)}
                        disabled={refreshingId === result.id}
                        size="sm"
                        variant="outline"
                        className="text-xs"
                      >
                        {refreshingId === result.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          'Refresh'
                        )}
                      </Button>
                      <Button
                        onClick={() => addResultToNotes(result)}
                        size="sm"
                        variant="outline"
                        className="text-xs"
                      >
                        Add to Notes
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Interest Button */}
              <button
                onClick={() => {
                  // Focus on the textarea
                  const textarea = document.querySelector('textarea[placeholder*="Add interest"]') as HTMLTextAreaElement;
                  textarea?.focus();
                }}
                className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
              >
                + Add Interest
              </button>
            </>
          )}
        </div>
      )}

      {/* Company Tab */}
      {activeTab === 'company' && (
        <div className="space-y-3">
          {/* Context source checkboxes at top */}
          <div className="flex gap-4 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={useProfile}
                onChange={(e) => setUseProfile(e.target.checked)}
                className="rounded"
              />
              <span>Profile</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={useLinkedIn}
                onChange={(e) => setUseLinkedIn(e.target.checked)}
                className="rounded"
              />
              <span>LinkedIn</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={useConversations}
                onChange={(e) => setUseConversations(e.target.checked)}
                className="rounded"
              />
              <span>Conversations</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={useNotes}
                onChange={(e) => setUseNotes(e.target.checked)}
                className="rounded"
              />
              <span>Notes</span>
            </label>
          </div>
          
          {/* Textarea - research on Enter */}
          <div className="relative">
            <textarea
              value={companyInput}
              onChange={(e) => setCompanyInput(e.target.value)}
              onInput={(e) => {
                e.currentTarget.style.height = 'auto';
                e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  if (companyInput.trim() && personId) {
                    e.preventDefault();
                    console.log('🔑 Enter pressed, calling handleResearchCompany');
                    handleResearchCompany();
                  } else {
                    e.preventDefault();
                    console.warn('⚠️ Enter pressed but missing data:', { hasInput: !!companyInput.trim(), hasPersonId: !!personId });
                  }
                }
              }}
              placeholder="Company name, URL, or instructions (Enter to research)"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm resize-none overflow-hidden"
              rows={1}
              disabled={isResearching}
            />
            {isResearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              </div>
            )}
          </div>

          {/* Show all company results */}
          {companyResults.map((result) => (
            <div key={result.id} className="p-4 bg-white rounded border border-gray-200 relative">
              {/* Delete X button in top right */}
              <button
                onClick={() => handleDelete(result)}
                className="absolute top-3 right-3 text-red-600 hover:text-red-700 text-xl font-bold"
              >
                ×
              </button>
              
              <div className="pr-8">
                <h5 className="text-sm font-semibold text-gray-800 mb-3">{result.topic}</h5>
                
                {/* Show original prompt if available */}
                {result.original_query && (
                  <div className="mb-4 pb-3 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Prompt:</p>
                    <p className="text-xs text-gray-600 italic">{result.original_query}</p>
                  </div>
                )}
                
                {/* Show result */}
                {result.summary && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Result:</p>
                  </div>
                )}
                
                {result.summary && (
                  <div className="text-xs text-gray-700 mb-3 prose prose-sm max-w-none
                    [&_ol]:space-y-4 [&_ul]:space-y-4 
                    [&_li]:mb-3 [&_li]:leading-relaxed
                    [&_p]:mb-2 [&_p]:leading-relaxed
                    [&_h1]:text-sm [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:mt-4
                    [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3
                    [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-3
                    [&_a]:text-blue-600 [&_a]:underline [&_a]:hover:text-blue-800">
                    <ReactMarkdown
                      components={{
                        a: ({ node, ...props }) => (
                          <a {...props} target="_blank" rel="noopener noreferrer" />
                        ),
                      }}
                    >
                      {result.summary}
                    </ReactMarkdown>
                  </div>
                )}
                
                {/* Links */}
                {result.links && result.links.length > 0 && (
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-2">
                      {result.links.map((link: any, idx: number) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {link.source}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Action buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-500">
                    Updated: {new Date(result.last_updated).toLocaleDateString()}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleRefresh(result)}
                      disabled={refreshingId === result.id}
                      size="sm"
                      variant="outline"
                      className="text-xs"
                    >
                      {refreshingId === result.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        'Refresh'
                      )}
                    </Button>
                    <Button
                      onClick={() => addResultToNotes(result)}
                      size="sm"
                      variant="outline"
                      className="text-xs"
                    >
                      Add to Notes
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tech Stack Tab */}
      {activeTab === 'tech' && (
        <div className="space-y-3">
          {/* Context source checkboxes at top */}
          <div className="flex gap-4 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={useProfile}
                onChange={(e) => setUseProfile(e.target.checked)}
                className="rounded"
              />
              <span>Profile</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={useLinkedIn}
                onChange={(e) => setUseLinkedIn(e.target.checked)}
                className="rounded"
              />
              <span>LinkedIn</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={useConversations}
                onChange={(e) => setUseConversations(e.target.checked)}
                className="rounded"
              />
              <span>Conversations</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={useNotes}
                onChange={(e) => setUseNotes(e.target.checked)}
                className="rounded"
              />
              <span>Notes</span>
            </label>
          </div>
          
          {/* Textarea - research on Enter */}
          <div className="relative">
            <textarea
              value={techStackInput}
              onChange={(e) => setTechStackInput(e.target.value)}
              onInput={(e) => {
                e.currentTarget.style.height = 'auto';
                e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (techStackInput.trim() && personId) {
                    console.log('🔑 Enter pressed on tech stack, calling handleResearchTechStack');
                    handleResearchTechStack();
                  } else {
                    console.warn('⚠️ Enter pressed but missing data:', { hasInput: !!techStackInput.trim(), hasPersonId: !!personId });
                    if (!personId) alert('Please load a person first');
                  }
                }
              }}
              placeholder="Company name, URL, or instructions (Enter to research)"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm resize-none overflow-hidden"
              rows={1}
              disabled={isResearching}
            />
            {isResearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              </div>
            )}
          </div>

          {/* Show all tech stack results */}
          {techStackResults.map((result) => (
            <div key={result.id}>
              <ResearchCard
                result={result}
                onRefresh={() => handleRefresh(result)}
                onDelete={() => handleDelete(result)}
                onAddToNotes={() => addResultToNotes(result)}
                isRefreshing={refreshingId === result.id}
              />
              
              {/* Display structured tech data */}
              {result.data?.technologies && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h5 className="text-sm font-semibold text-gray-700 mb-3">Technologies Found:</h5>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(result.data.technologies).map(([category, techs]: [string, any]) => (
                      techs && techs.length > 0 && (
                        <div key={category}>
                          <p className="text-xs font-medium text-gray-600 mb-1 capitalize">{category}:</p>
                          <div className="flex flex-wrap gap-1">
                            {techs.map((tech: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Manual Notes Section (preserved from original) */}
      <div className="pt-6 border-t border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Manual Notes</h4>
        <ManualNotesSection
          editedPreview={editedPreview}
          setEditedPreview={setEditedPreview}
        />
      </div>
    </div>
  );
}

// Research Card Component
function ResearchCard({
  result,
  onRefresh,
  onDelete,
  onAddToNotes,
  isRefreshing,
}: {
  result: ResearchResult;
  onRefresh: () => void;
  onDelete: () => void;
  onAddToNotes: () => void;
  isRefreshing: boolean;
}) {
  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h5 className="text-sm font-semibold text-gray-800">{result.topic}</h5>
            <Badge variant="outline" className="text-xs">
              {result.type}
            </Badge>
          </div>
          <p className="text-xs text-gray-600 mb-2">{result.summary}</p>
        </div>
      </div>

      {result.links && result.links.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-600 mb-1">Resources:</p>
          <div className="flex flex-wrap gap-2">
            {result.links.map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                {link.source}: {link.label}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-500">
          Updated: {new Date(result.last_updated).toLocaleDateString()}
        </span>
        <div className="flex gap-2">
          <Button
            onClick={onRefresh}
            disabled={isRefreshing}
            size="sm"
            variant="outline"
          >
            {isRefreshing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>
          <Button
            onClick={onAddToNotes}
            size="sm"
            variant="outline"
          >
            Add to Notes
          </Button>
          <Button
            onClick={onDelete}
            size="sm"
            variant="outline"
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Manual Notes Section (preserved from original)
function ManualNotesSection({
  editedPreview,
  setEditedPreview,
}: {
  editedPreview: any;
  setEditedPreview: (preview: any) => void;
}) {
  return (
    <>
      <div className="mb-3">
        <textarea
          placeholder="Add research note (Enter to save, Shift+Enter for new line)"
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-2 resize-none overflow-hidden"
          rows={1}
          onInput={(e) => {
            e.currentTarget.style.height = 'auto';
            e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && e.currentTarget.value.trim()) {
              e.preventDefault();
              const research = editedPreview?.research || [];
              const today = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
              const newResearch = {
                date: today,
                text: e.currentTarget.value.trim(),
                source: '',
                tags: []
              };
              const newResearchItems = [newResearch, ...research];
              setEditedPreview(editedPreview ? {...editedPreview, research: newResearchItems} : {research: newResearchItems});
              e.currentTarget.value = '';
              e.currentTarget.style.height = 'auto';
            }
          }}
        />
        
        {/* Quick tag filters */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => {
              const research = editedPreview?.research || [];
              if (research.length > 0) {
                const lastItem = research[0];
                const tags = lastItem.tags || [];
                if (!tags.includes('technical')) {
                  tags.push('technical');
                  const updatedResearch = [...research];
                  updatedResearch[0] = { ...lastItem, tags };
                  setEditedPreview({ ...editedPreview, research: updatedResearch });
                }
              }
            }}
            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
          >
            + Technical
          </button>
          <button
            onClick={() => {
              const research = editedPreview?.research || [];
              if (research.length > 0) {
                const lastItem = research[0];
                const tags = lastItem.tags || [];
                if (!tags.includes('market')) {
                  tags.push('market');
                  const updatedResearch = [...research];
                  updatedResearch[0] = { ...lastItem, tags };
                  setEditedPreview({ ...editedPreview, research: updatedResearch });
                }
              }
            }}
            className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100"
          >
            + Market
          </button>
          <button
            onClick={() => {
              const research = editedPreview?.research || [];
              if (research.length > 0) {
                const lastItem = research[0];
                const tags = lastItem.tags || [];
                if (!tags.includes('competitive')) {
                  tags.push('competitive');
                  const updatedResearch = [...research];
                  updatedResearch[0] = { ...lastItem, tags };
                  setEditedPreview({ ...editedPreview, research: updatedResearch });
                }
              }
            }}
            className="text-xs px-2 py-1 bg-orange-50 text-orange-700 rounded hover:bg-orange-100"
          >
            + Competitive
          </button>
        </div>
      </div>

      {editedPreview?.research && editedPreview.research.length > 0 ? (
        <div className="space-y-3">
          {(editedPreview?.research || []).map((item: any, idx: number) => (
            <div key={idx} className="p-3 bg-white rounded border border-gray-200">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-sm text-gray-600 flex-shrink-0">
                  {item.date || new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })}
                </span>
                <span className="text-sm text-gray-700 flex-1">{typeof item === 'string' ? item : (item.text || '')}</span>
                <button
                  onClick={() => {
                    const newResearch = (editedPreview?.research || []).filter((_: any, i: number) => i !== idx);
                    setEditedPreview(editedPreview ? {...editedPreview, research: newResearch} : {research: newResearch});
                  }}
                  className="text-red-600 hover:text-red-700 text-xs font-bold"
                >
                  ×
                </button>
              </div>
              
              {item.source && (
                <div className="mb-2">
                  <a 
                    href={item.source} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    🔗 {item.source}
                  </a>
                </div>
              )}
              
              <div className="flex flex-wrap gap-1">
                {(item.tags || []).map((tag: string, tagIdx: number) => (
                  <Badge 
                    key={tagIdx}
                    className={`text-xs cursor-pointer ${
                      tag === 'technical' ? 'bg-blue-100 text-blue-700' :
                      tag === 'market' ? 'bg-green-100 text-green-700' :
                      tag === 'competitive' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}
                    onClick={() => {
                      const research = editedPreview?.research || [];
                      const updatedResearch = research.map((r: any, i: number) => {
                        if (i === idx) {
                          const newTags = (r.tags || []).filter((_: string, tIdx: number) => tIdx !== tagIdx);
                          return { ...r, tags: newTags };
                        }
                        return r;
                      });
                      setEditedPreview({ ...editedPreview, research: updatedResearch });
                    }}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">No research notes yet</p>
      )}
    </>
  );
}
