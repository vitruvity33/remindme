'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface FollowUp {
  id: string;
  description: string;
  status: string;
  priority: string;
  date: string;
  created_at: string;
  person_id: string;
  people?: {
    id: string;
    name: string;
    company: string;
  };
}

export function RelationshipTasksPanel() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFollowUps();
  }, []);

  const fetchFollowUps = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/decide/followups', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();
      if (result.success && result.data) {
        setFollowUps(result.data);
      }
    } catch (error) {
      console.error('Error fetching follow-ups:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (followUps.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <div className="text-6xl mb-4">👥</div>
        <p className="text-lg font-medium mb-2">No Relationship Follow-ups</p>
        <p className="text-sm">
          Add follow-ups from Relationships to see them here
        </p>
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Follow-ups ({followUps.length})
      </h4>
      <div className="space-y-2">
        {followUps.map((followUp) => (
          <div
            key={followUp.id}
            className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-move hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('relationshipFollowUpId', followUp.id);
              e.dataTransfer.setData('relationshipFollowUpText', followUp.description);
              e.dataTransfer.setData('personId', followUp.person_id);
              e.dataTransfer.setData('todo', JSON.stringify({
                id: `followup-${followUp.id}`,
                text: followUp.description,
                source_type: 'relationship',
                source_id: followUp.person_id,
              }));
            }}
          >
            <div className="text-sm text-gray-800 dark:text-gray-200 mb-1">
              {followUp.description}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="text-purple-600 dark:text-purple-400">
                {followUp.people?.name || 'Unassigned'}
              </span>
              <span>•</span>
              <span>
                {followUp.date || new Date(followUp.created_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
