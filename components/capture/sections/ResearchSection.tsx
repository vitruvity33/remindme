/**
 * RESEARCH SECTION COMPONENT
 * 
 * NEW section for tracking research notes, findings, and sources.
 * Features:
 * - Add research notes with sources/links
 * - Tag research items (e.g., "technical", "market", "competitive")
 * - Auto-date stamping
 * - Delete research items (with DB sync when implemented)
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@supabase/supabase-js";
import { Loader2, ExternalLink, Pin, Check } from "lucide-react";

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
}

interface ResearchSuggestion {
  type: 'interest' | 'team' | 'tech' | 'company' | 'market' | 'topic';
  title: string;
  why_it_matters: string;
  links: Array<{
    source: string;
    url: string;
    label: string;
  }>;
  status: 'todo' | 'in_progress' | 'done';
  pinned: boolean;
}

export function ResearchSection({
  editedPreview,
  setEditedPreview,
  personName,
  personCompany,
  personRole,
}: ResearchSectionProps) {
  const [showSourceInput, setShowSourceInput] = useState(false);
  const [tempSource, setTempSource] = useState("");
  
  // AI Research state
  const [researchInput, setResearchInput] = useState("");
  const [includeLinkedIn, setIncludeLinkedIn] = useState(true);
  const [includeConversations, setIncludeConversations] = useState(true);
  const [includeMemories, setIncludeMemories] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<ResearchSuggestion[]>([]);

  const handleRunResearch = async () => {
    if (!researchInput.trim() && !includeLinkedIn && !includeConversations && !includeMemories) {
      alert('Please add research topics or select at least one data source');
      return;
    }

    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/research/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          userInput: researchInput,
          includeLinkedIn,
          includeConversations,
          includeMemories,
          linkedInData: {
            summary: editedPreview?.people?.[0]?.summary,
            experience: `${personRole} at ${personCompany}`,
            skills: editedPreview?.people?.[0]?.skills || [],
          },
          conversations: (editedPreview?.conversations || []).map((c: any) => c.text || c),
          memories: (editedPreview?.memories || []).map((m: any) => m.text || m),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSuggestions(data.suggestions || []);
      } else {
        alert('Failed to generate research suggestions: ' + data.error);
      }
    } catch (error) {
      console.error('Error generating research:', error);
      alert('Failed to generate research suggestions');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveSuggestions = () => {
    // Convert suggestions to research notes
    const newNotes = suggestions.map(s => ({
      date: new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }),
      text: `${s.title}: ${s.why_it_matters}`,
      source: s.links[0]?.url || '',
      tags: [s.type],
    }));
    
    const existingResearch = editedPreview?.research || [];
    setEditedPreview({
      ...editedPreview,
      research: [...newNotes, ...existingResearch],
    });
    
    setSuggestions([]);
    setResearchInput('');
  };

  const handleClearSuggestions = () => {
    setSuggestions([]);
  };

  const addSuggestionToNotes = (suggestion: ResearchSuggestion) => {
    const newNote = {
      date: new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }),
      text: `${suggestion.title}: ${suggestion.why_it_matters}`,
      source: suggestion.links[0]?.url || '',
      tags: [suggestion.type],
    };
    
    const existingResearch = editedPreview?.research || [];
    setEditedPreview({
      ...editedPreview,
      research: [newNote, ...existingResearch],
    });
  };

  return (
    <>
      {/* AI Research Input Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">AI Research Assistant</h4>
        
        <textarea
          value={researchInput}
          onChange={(e) => setResearchInput(e.target.value)}
          placeholder="What should I research? (e.g., 'Michigan football', 'F1 Hamilton', 'coffee trends', or paste URLs)"
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-3 resize-none"
          rows={3}
        />
        
        <div className="flex flex-col gap-2 mb-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={includeLinkedIn}
              onChange={(e) => setIncludeLinkedIn(e.target.checked)}
              className="rounded"
            />
            Include LinkedIn profile
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={includeConversations}
              onChange={(e) => setIncludeConversations(e.target.checked)}
              className="rounded"
            />
            Include conversation snippets
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={includeMemories}
              onChange={(e) => setIncludeMemories(e.target.checked)}
              className="rounded"
            />
            Include memories
          </label>
        </div>
        
        <Button
          onClick={handleRunResearch}
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Research...
            </>
          ) : (
            'Run Research'
          )}
        </Button>
      </div>

      {/* AI Suggestions Display */}
      {suggestions.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700">Research Suggestions</h4>
            <div className="flex gap-2">
              <Button
                onClick={handleSaveSuggestions}
                size="sm"
                variant="default"
              >
                Save All
              </Button>
              <Button
                onClick={handleClearSuggestions}
                size="sm"
                variant="outline"
              >
                Clear
              </Button>
            </div>
          </div>
          
          <div className="space-y-3">
            {suggestions.map((suggestion, idx) => (
              <div key={idx} className="p-3 bg-white rounded border border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="text-sm font-semibold text-gray-800">{suggestion.title}</h5>
                      <Badge variant="outline" className="text-xs">
                        {suggestion.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{suggestion.why_it_matters}</p>
                  </div>
                </div>
                
                {suggestion.links.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-600 mb-1">Resources:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestion.links.map((link, linkIdx) => (
                        <a
                          key={linkIdx}
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
                
                <Button
                  onClick={() => addSuggestionToNotes(suggestion)}
                  size="sm"
                  variant="outline"
                  className="w-full mt-2"
                >
                  Add to Notes
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Research Notes Section */}
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
                  onClick={async () => {
                    // If this research exists in DB (has an id), delete it
                    if (item.id && item.isExisting) {
                      if (!confirm('Delete this research item from the database?')) return;
                      
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        // Note: You'll need to create this API endpoint
                        const response = await fetch(`/api/delete-research/${item.id}`, {
                          method: 'DELETE',
                          headers: {
                            'Authorization': `Bearer ${session?.access_token}`
                          }
                        });
                        
                        if (!response.ok) {
                          throw new Error('Failed to delete research item');
                        }
                        console.log('✅ Research item deleted from DB');
                      } catch (error) {
                        console.error('Error deleting research item:', error);
                        // Don't show alert for now since endpoint may not exist yet
                        console.warn('Research deletion endpoint not implemented yet');
                      }
                    }
                    
                    // Remove from UI
                    const newResearch = (editedPreview?.research || []).filter((_: any, i: number) => i !== idx);
                    setEditedPreview(editedPreview ? {...editedPreview, research: newResearch} : {research: newResearch});
                  }}
                  className="text-red-600 hover:text-red-700 text-xs font-bold"
                >
                  ×
                </button>
              </div>
              
              {/* Source/Link */}
              {item.source ? (
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
              ) : (
                <button
                  onClick={() => {
                    const source = prompt('Add source URL or reference:');
                    if (source) {
                      const research = editedPreview?.research || [];
                      const updatedResearch = research.map((r: any, i: number) => 
                        i === idx ? { ...r, source } : r
                      );
                      setEditedPreview({ ...editedPreview, research: updatedResearch });
                    }
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  + Add source
                </button>
              )}
              
              {/* Tags */}
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
                <button
                  onClick={() => {
                    const tag = prompt('Add custom tag:');
                    if (tag) {
                      const research = editedPreview?.research || [];
                      const updatedResearch = research.map((r: any, i: number) => {
                        if (i === idx) {
                          const tags = [...(r.tags || []), tag.toLowerCase()];
                          return { ...r, tags };
                        }
                        return r;
                      });
                      setEditedPreview({ ...editedPreview, research: updatedResearch });
                    }
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  + tag
                </button>
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
