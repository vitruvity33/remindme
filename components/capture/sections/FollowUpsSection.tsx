/**
 * FOLLOW-UPS SECTION COMPONENT
 * 
 * Manages follow-up action items with:
 * - Status tracking (Not Started → In Progress → Complete)
 * - Priority levels (Low/Medium/High)
 * - Urgency classification (Eisenhower Matrix)
 * - Due dates
 * - Real-time DB sync for existing items
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface FollowUpsSectionProps {
  editedPreview: any;
  setEditedPreview: (preview: any) => void;
}

export function FollowUpsSection({
  editedPreview,
  setEditedPreview,
}: FollowUpsSectionProps) {
  return (
    <>
      <textarea
        placeholder="Add follow-up action (Enter to save, Shift+Enter for new line)"
        className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-2 resize-none overflow-hidden"
        rows={1}
        onInput={(e) => {
          e.currentTarget.style.height = 'auto';
          e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && e.currentTarget.value.trim()) {
            e.preventDefault();
            const followUps = editedPreview?.follow_ups || editedPreview?.followUps || [];
            const today = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
            const newFollowUp = {
              description: e.currentTarget.value.trim(),
              priority: 'medium',
              urgency: 'not-urgent-not-important',
              status: 'not-started',
              date: today,
              due_date: ''
            };
            const newFollowUps = [newFollowUp, ...followUps];
            setEditedPreview(editedPreview ? {...editedPreview, follow_ups: newFollowUps, followUps: undefined} : {follow_ups: newFollowUps});
            e.currentTarget.value = '';
            e.currentTarget.style.height = 'auto';
          }
        }}
      />
      {((editedPreview?.follow_ups || editedPreview?.followUps)?.length > 0) ? (
        <div className="space-y-2">
          {(editedPreview?.follow_ups || editedPreview?.followUps || []).map((followUp: any, idx: number) => {
            const updateFollowUp = async (field: 'status' | 'priority' | 'urgency' | 'due_date', value: string) => {
              console.log(`🔄 Updating follow-up field: ${field} to value:`, value);
              console.log('📋 Current follow-up:', followUp);
              
              // Update in UI first (always)
              const followUps = editedPreview?.follow_ups || editedPreview?.followUps || [];
              console.log('📚 Current follow-ups count:', followUps.length);
              
              const newFollowUps = followUps.map((fu: any, i: number) => 
                i === idx ? { ...fu, [field]: value } : fu
              );
              console.log('📚 New follow-ups count:', newFollowUps.length);
              
              setEditedPreview(editedPreview ? {...editedPreview, follow_ups: newFollowUps, followUps: undefined} : {follow_ups: newFollowUps});
              
              // If this is an existing follow-up (already in DB), update it there too
              if (followUp.id && followUp.isExisting) {
                console.log(`💾 Updating existing follow-up in DB: ${followUp.id}`);
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  const response = await fetch(`/api/update-followup/${followUp.id}`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session?.access_token}`
                    },
                    body: JSON.stringify({ [field]: value })
                  });
                  
                  if (!response.ok) {
                    const errorData = await response.json();
                    console.error(`❌ API error updating follow-up ${field}:`, errorData);
                    throw new Error(errorData.error || `Failed to update follow-up ${field}`);
                  }
                  console.log(`✅ Follow-up ${field} updated in DB to:`, value);
                } catch (error: any) {
                  console.error(`❌ Error updating follow-up ${field}:`, error);
                  // Show a more user-friendly message without blocking the UI
                  console.warn(`⚠️ Change to ${field} saved locally. Will sync when you save to Rolodex.`);
                }
              } else {
                console.log(`📝 Follow-up ${field} updated locally to ${value} (will save to DB when you click Save)`);
              }
            };

            // Toggle to show/hide detailed fields (Status, Priority, Urgency, Due Date)
            const showDetailedFields = false;

            return (
              <div key={idx} className="flex flex-col gap-2 p-3 bg-white rounded border border-gray-200">
                <div className={`flex items-center gap-2 ${showDetailedFields ? 'pb-2 border-b border-gray-200' : ''}`}>
                  <span className="text-sm text-gray-600 flex-shrink-0">
                    {followUp.date || new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })}
                  </span>
                  <span className="text-sm text-gray-700 flex-1">{followUp.description}</span>
                  <button
                    onClick={async () => {
                      // If this follow-up exists in DB (has an id), delete it
                      if (followUp.id && followUp.isExisting) {
                        if (!confirm(`⚠️ PERMANENTLY DELETE this follow-up?\n\n"${followUp.description}"\n\nThis cannot be undone!`)) return;
                        
                        try {
                          const { data: { session } } = await supabase.auth.getSession();
                          const response = await fetch(`/api/delete-followup/${followUp.id}`, {
                            method: 'DELETE',
                            headers: {
                              'Authorization': `Bearer ${session?.access_token}`
                            }
                          });
                          
                          if (!response.ok) {
                            throw new Error('Failed to delete follow-up');
                          }
                          console.log('✅ Follow-up deleted from DB');
                        } catch (error) {
                          console.error('Error deleting follow-up:', error);
                          alert('Failed to delete follow-up');
                          return;
                        }
                      }
                      
                      // Remove from UI
                      const followUps = editedPreview?.follow_ups || editedPreview?.followUps || [];
                      const newFollowUps = followUps.filter((_: any, i: number) => i !== idx);
                      setEditedPreview(editedPreview ? {...editedPreview, follow_ups: newFollowUps, followUps: undefined} : {follow_ups: newFollowUps});
                    }}
                    className="text-red-600 hover:text-red-700 text-xs font-bold"
                  >
                    ×
                  </button>
                </div>
                
                {/* Status, Priority, Urgency, Due Date - hidden when showDetailedFields is false */}
                {showDetailedFields && (<>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-16">Status:</span>
                  <div className="flex items-center gap-2">
                    {/* Step 1: Not Started */}
                    <button
                      onClick={() => updateFollowUp('status', 'not-started')}
                      className={`px-2 py-0.5 text-xs rounded transition-all ${
                        followUp.status === 'not-started' || followUp.status === 'pending' || !followUp.status
                          ? 'bg-red-600 text-white' 
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Not Started
                    </button>
                    
                    {/* Arrow/Connector */}
                    <div className="text-gray-400 text-xs">→</div>
                    
                    {/* Step 2: Started */}
                    <button
                      onClick={() => updateFollowUp('status', 'started')}
                      className={`px-2 py-0.5 text-xs rounded transition-all ${
                        followUp.status === 'started' 
                          ? 'bg-yellow-400 text-gray-900' 
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      In Progress
                    </button>
                    
                    {/* Arrow/Connector */}
                    <div className="text-gray-400 text-xs">→</div>
                    
                    {/* Step 3: Complete */}
                    <button
                      onClick={() => updateFollowUp('status', 'complete')}
                      className={`px-2 py-0.5 text-xs rounded transition-all ${
                        followUp.status === 'complete' 
                          ? 'bg-green-600 text-white' 
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Complete
                    </button>
                  </div>
                </div>
                
                {/* Priority - Simple Low/Medium/High */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-16">Priority:</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateFollowUp('priority', 'low')}
                      className={`px-2 py-0.5 text-xs rounded transition-all ${
                        followUp.priority === 'low' 
                          ? 'bg-gray-400 text-white' 
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Low
                    </button>
                    <button
                      onClick={() => updateFollowUp('priority', 'medium')}
                      className={`px-2 py-0.5 text-xs rounded transition-all ${
                        followUp.priority === 'medium' 
                          ? 'bg-gray-400 text-white' 
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Medium
                    </button>
                    <button
                      onClick={() => updateFollowUp('priority', 'high')}
                      className={`px-2 py-0.5 text-xs rounded transition-all ${
                        followUp.priority === 'high' 
                          ? 'bg-gray-400 text-white' 
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      High
                    </button>
                  </div>
                </div>
                
                {/* Urgency - Eisenhower Matrix */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-16">Urgency:</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateFollowUp('urgency', 'urgent-important')}
                      className={`px-2 py-0.5 text-xs rounded transition-all ${
                        followUp.urgency === 'urgent-important' 
                          ? 'bg-gray-400 text-white' 
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Urgent: Important
                    </button>
                    <button
                      onClick={() => updateFollowUp('urgency', 'urgent-not-important')}
                      className={`px-2 py-0.5 text-xs rounded transition-all ${
                        followUp.urgency === 'urgent-not-important' 
                          ? 'bg-gray-400 text-white' 
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Urgent: Not Important
                    </button>
                    <button
                      onClick={() => updateFollowUp('urgency', 'not-urgent-important')}
                      className={`px-2 py-0.5 text-xs rounded transition-all ${
                        followUp.urgency === 'not-urgent-important' 
                          ? 'bg-gray-400 text-white' 
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Not Urgent: Important
                    </button>
                    <button
                      onClick={() => updateFollowUp('urgency', 'not-urgent-not-important')}
                      className={`px-2 py-0.5 text-xs rounded transition-all ${
                        followUp.urgency === 'not-urgent-not-important' 
                          ? 'bg-gray-400 text-white' 
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Not Urgent: Not Important
                    </button>
                  </div>
                </div>
                
                {/* Due Date */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-16">Due Date:</span>
                  <input
                    type="date"
                    value={followUp.due_date || ''}
                    onChange={(e) => {
                      const newDueDate = e.target.value;
                      console.log('📅 Due date changed to:', newDueDate);
                      updateFollowUp('due_date', newDueDate);
                    }}
                    className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                  />
                </div>
                </>)}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">No follow-ups yet</p>
      )}
    </>
  );
}
