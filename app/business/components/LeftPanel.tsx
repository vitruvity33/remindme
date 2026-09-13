'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Business, Meeting, Person, WorkspaceView, BusinessWithRelations } from '@/lib/types';
import SortableSectionButton from './SortableSectionButton';

/**
 * LEFT PANEL - Business & Meetings
 * Placeholder component - will be replaced in Phase 7
 */
interface LeftPanelProps {
  businesses: Business[];
  selectedBusiness: BusinessWithRelations | null;
  onBusinessSelect: (business: Business | null) => void;
  onMeetingSelect: (meeting: Meeting) => void;
  onPersonClick: (person: Person) => void;
  onViewChange: (view: WorkspaceView) => void;
  onReloadBusinesses: () => Promise<void>;
  isLoading: boolean;
  onSaveOrgChart?: () => Promise<void>;
}

export default function LeftPanel({
  businesses,
  selectedBusiness,
  onBusinessSelect,
  onMeetingSelect,
  onPersonClick,
  onViewChange,
  onReloadBusinesses,
  isLoading,
  onSaveOrgChart
}: LeftPanelProps) {
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [website, setWebsite] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [description, setDescription] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showNewBusinessForm, setShowNewBusinessForm] = useState(false);
  const [editingBusinessName, setEditingBusinessName] = useState(false);
  const [hiddenSections, setHiddenSections] = useState<Set<string>>(new Set());
  const [showSectionManager, setShowSectionManager] = useState(false);
  const [sectionOrder, setSectionOrder] = useState<string[]>([
    'people',
    'meetings',
    'notes',
    'research',
    'followups',
    'conversations'
  ]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  // Load section preferences from localStorage
  useEffect(() => {
    const savedOrder = localStorage.getItem('businessSectionOrder');
    const savedHidden = localStorage.getItem('businessHiddenSections');
    
    if (savedOrder) {
      try {
        const order = JSON.parse(savedOrder);
        // Filter out 'pipeline' as it's now a top-level tab
        setSectionOrder(order.filter((s: string) => s !== 'pipeline'));
      } catch (e) {
        console.error('Error parsing section order:', e);
      }
    }
    
    if (savedHidden) {
      try {
        const hiddenArray: string[] = JSON.parse(savedHidden);
        const hidden = new Set(hiddenArray);
        // Remove 'pipeline' from hidden sections too
        hidden.delete('pipeline');
        setHiddenSections(hidden);
      } catch (e) {
        console.error('Error parsing hidden sections:', e);
      }
    }
  }, []);

  // Save section preferences to localStorage
  useEffect(() => {
    localStorage.setItem('businessSectionOrder', JSON.stringify(sectionOrder));
    localStorage.setItem('businessHiddenSections', JSON.stringify(Array.from(hiddenSections)));
  }, [sectionOrder, hiddenSections]);

  // Configure drag sensors (requires long press)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Handle drag end to reorder sections
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sectionOrder.indexOf(active.id as string);
      const newIndex = sectionOrder.indexOf(over.id as string);

      const newOrder = [...sectionOrder];
      const [removed] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, removed);

      setSectionOrder(newOrder);
    }
  };

  const handleCancel = () => {
    setBusinessName('');
    setIndustry('');
    setDealValue('');
    setWebsite('');
    setLinkedinUrl('');
    setDescription('');
    setShowNewBusinessForm(false);
    setExpandedSections([]);
  };

  const handleDeleteBusiness = async (businessId: string, businessName: string) => {
    if (!confirm(`Are you sure you want to delete "${businessName}"? This cannot be undone.`)) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please sign in to delete');
        return;
      }

      const response = await fetch(`/api/business/delete?id=${businessId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Business deleted!');
        await onReloadBusinesses();
      } else {
        alert('Failed to delete: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting business:', error);
      alert('Failed to delete business');
    }
  };

  const handleSaveToRolodex = async () => {
    if (!businessName.trim()) {
      alert('Please enter a business name');
      return;
    }

    setIsSaving(true);
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please sign in to save');
        return;
      }

      const response = await fetch('/api/business/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: businessName,
          industry: industry || null,
          stage: 'discovery', // Default to discovery - can be changed in Pipeline
          deal_value: dealValue ? parseFloat(dealValue) : null,
          website: website || null,
          linkedin_url: linkedinUrl || null,
          description: description || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Business saved to Rolodex!');
        // Reload businesses list
        await onReloadBusinesses();
        // Set the newly created business as selected
        const newBusiness: BusinessWithRelations = {
          ...result.business,
          people: [],
          meetings: [],
          notes: [],
        };
        onBusinessSelect(newBusiness);
        handleCancel(); // Clear form
      } else {
        alert('Failed to save: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving business:', error);
      alert('Failed to save business');
    } finally {
      setIsSaving(false);
    }
  };

  const [businessSearch, setBusinessSearch] = useState('');
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
  const filteredBusinesses = businesses.filter(b => 
    b.name.toLowerCase().includes(businessSearch.toLowerCase()) ||
    b.industry?.toLowerCase().includes(businessSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Business Selector - Only show when no business selected and not adding new */}
      {!selectedBusiness && !showNewBusinessForm && (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">SELECT BUSINESS</h3>
          <button 
            onClick={() => setShowNewBusinessForm(true)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            + New Business
          </button>
        </div>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Search or select business..."
            value={businessSearch}
            onChange={(e) => {
              setBusinessSearch(e.target.value);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <div className="mt-1 bg-gray-50 border border-gray-300 rounded-md h-96 overflow-y-auto p-2">
            {filteredBusinesses.map((biz) => (
              <div
                key={biz.id}
                onClick={() => {
                  onBusinessSelect(biz);
                  setBusinessSearch('');
                }}
                className="mb-2 p-3 h-16 flex flex-col justify-center bg-white border border-gray-200 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 hover:border-gray-300"
              >
                <div className="font-medium text-sm">{biz.name}</div>
                {biz.industry && (
                  <div className="text-xs text-gray-600">{biz.industry}</div>
                )}
              </div>
            ))}
            {filteredBusinesses.length === 0 && (
              <div className="p-4 text-sm text-gray-500 text-center">
                {businessSearch ? 'No businesses found' : 'No businesses yet'}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Selected Business Card - Show when business is selected */}
      {selectedBusiness && !showNewBusinessForm && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">SELECTED BUSINESS</h3>
            <button 
              onClick={() => setShowNewBusinessForm(true)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              + New Business
            </button>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            {editingBusinessName ? (
              <input
                type="text"
                value={selectedBusiness.name}
                onChange={(e) => {
                  const updatedBusiness = {...selectedBusiness, name: e.target.value};
                  onBusinessSelect(updatedBusiness);
                }}
                onBlur={async () => {
                  setEditingBusinessName(false);
                  // Save to database
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) return;

                    await fetch('/api/business/update', {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                      },
                      body: JSON.stringify({
                        id: selectedBusiness.id,
                        name: selectedBusiness.name,
                      }),
                    });
                  } catch (error) {
                    console.error('Error updating business name:', error);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                className="text-2xl font-semibold bg-transparent border-b-2 border-blue-500 focus:outline-none text-gray-900 flex-1"
                autoFocus
              />
            ) : (
              <h2 
                className="text-2xl font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                onClick={() => setEditingBusinessName(true)}
              >
                {selectedBusiness.name}
              </h2>
            )}
            <button 
              onClick={() => onBusinessSelect(null)}
              className="text-gray-400 hover:text-gray-600"
              title="Deselect business"
            >
              ✕
            </button>
          </div>
          {selectedBusiness.industry && (
            <p className="text-gray-600">{selectedBusiness.industry}</p>
          )}
          {selectedBusiness.stage && (
            <p className="text-sm text-gray-500">Stage: {selectedBusiness.stage}</p>
          )}
          {selectedBusiness.deal_value && (
            <p className="text-sm text-green-600 font-medium">
              Deal Value: ${(selectedBusiness.deal_value / 1000).toFixed(0)}K
            </p>
          )}
        </div>
        </div>
      )}

      {/* Collapsible Sections - Show when business is selected */}
      {selectedBusiness && !showNewBusinessForm && (
        <div>
          {/* Eye icon to manage section visibility */}
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setShowSectionManager(!showSectionManager)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Manage sections"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>

          {/* Section Manager Modal */}
          {showSectionManager && (
            <div className="mb-4 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-semibold text-gray-900">Show/Hide Sections</h4>
                <button
                  onClick={() => setShowSectionManager(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-3">
                {sectionOrder.map((sectionId) => {
                  const sectionConfig = {
                    people: { label: 'People' },
                    meetings: { label: 'Meetings' },
                    notes: { label: 'Notes & Context' },
                    research: { label: 'Research' },
                    followups: { label: 'Follow Ups' },
                    conversations: { label: 'Conversations' }
                  }[sectionId];

                  const isVisible = !hiddenSections.has(sectionId);

                  return (
                    <label key={sectionId} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => {
                          const newHidden = new Set(hiddenSections);
                          if (isVisible) {
                            newHidden.add(sectionId);
                          } else {
                            newHidden.delete(sectionId);
                          }
                          setHiddenSections(newHidden);
                        }}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{sectionConfig?.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sections Container Box */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-4">
            {/* Dynamic Sections with Drag & Drop */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sectionOrder.filter(id => !hiddenSections.has(id))}
                strategy={verticalListSortingStrategy}
              >
                <div>
                  {sectionOrder.filter(id => !hiddenSections.has(id)).map((sectionId) => {
                    const sectionConfig = {
                      people: { label: 'People', view: 'people' as WorkspaceView, hasExpand: true },
                      meetings: { label: 'Meetings', view: 'meeting' as WorkspaceView, hasExpand: true },
                      pipeline: { label: 'Pipeline', view: 'pipeline' as WorkspaceView, hasExpand: false },
                      notes: { label: 'Notes & Context', view: 'notes' as WorkspaceView, hasExpand: true },
                      research: { label: 'Research', view: 'business' as WorkspaceView, hasExpand: true },
                      followups: { label: 'Follow Ups', view: 'followups' as WorkspaceView, hasExpand: true },
                      conversations: { label: 'Conversations', view: 'conversations' as WorkspaceView, hasExpand: true }
                    }[sectionId];

                    if (!sectionConfig) return null;

                    return (
                      <SortableSectionButton
                        key={sectionId}
                        id={sectionId}
                        label={sectionConfig.label}
                        hasExpand={sectionConfig.hasExpand}
                        isExpanded={expandedSections.includes(sectionId)}
                        onClick={() => {
                          if (sectionConfig.hasExpand) {
                            toggleSection(sectionId);
                          }
                          onViewChange(sectionConfig.view);
                        }}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* Save Button */}
          <div className="pt-4 flex justify-end gap-2">
            <button
              onClick={() => onBusinessSelect(null)}
              className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (onSaveOrgChart) {
                  await onSaveOrgChart();
                }
              }}
              className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
            >
              Save Business
            </button>
          </div>
        </div>
      )}
      
      {/* Business Info Card - Only show when adding new business */}
      {showNewBusinessForm && (
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <input
            type="text"
            placeholder="Business Name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="text-2xl font-semibold bg-transparent border-none outline-none placeholder-gray-400 text-gray-900 w-full"
          />
          <div className="flex gap-2">
            <button 
              onClick={handleCancel}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md bg-white"
            >
              Clear
            </button>
          </div>
        </div>

        <input
          type="text"
          placeholder="Industry"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="w-full px-0 py-1 text-gray-600 bg-transparent border-none outline-none placeholder-gray-400"
        />

        <input
          type="text"
          placeholder="Deal Value"
          value={dealValue}
          onChange={(e) => setDealValue(e.target.value)}
          className="w-full px-0 py-1 text-gray-600 bg-transparent border-none outline-none placeholder-gray-400"
        />
        
        <p className="text-xs text-gray-500">
          💡 Set stage by dragging to Pipeline view
        </p>

        {/* Collapsible Sections */}
        <div className="space-y-2">
        {/* Context & Social Media Section */}
        <div>
          <button
            onClick={() => toggleSection('context')}
            className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-gray-900">Context & Social Media</span>
            <span className={`text-gray-400 transition-transform ${expandedSections.includes('context') ? 'rotate-90' : ''}`}>▶</span>
          </button>
          
          {expandedSections.includes('context') && (
            <div className="mt-2 p-4 bg-white border border-gray-200 rounded-lg space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website URL
                </label>
                <input
                  type="text"
                  placeholder="https://company.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LinkedIn Profile URL
                </label>
                <input
                  type="text"
                  placeholder="https://linkedin.com/company/..."
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Links & Resources
                </label>
                <textarea
                  placeholder="Paste links (blogs, media, about page, etc.) separated by commas&#10;&#10;Example:&#10;https://company.com/blog, https://techcrunch.com/article, https://company.com/about"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Add multiple links separated by commas
                </p>
              </div>
            </div>
          )}
        </div>

        {/* People Section */}
        <button
          onClick={() => {
            toggleSection('people');
            onViewChange('people');
          }}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span className="font-medium text-gray-900">People</span>
          <span className={`text-gray-400 transition-transform ${expandedSections.includes('people') ? 'rotate-90' : ''}`}>▶</span>
        </button>

        {/* Meetings Section */}
        <button
          onClick={() => toggleSection('meetings')}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span className="font-medium text-gray-900">Meetings</span>
          <span className={`text-gray-400 transition-transform ${expandedSections.includes('meetings') ? 'rotate-90' : ''}`}>▶</span>
        </button>

        {/* Pipeline Section */}
        <button
          onClick={() => {
            onViewChange('pipeline');
          }}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span className="font-medium text-gray-900">Pipeline</span>
          <span className="text-gray-400">▶</span>
        </button>

        {/* Notes Section */}
        <button
          onClick={() => toggleSection('notes')}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span className="font-medium text-gray-900">Notes & Context</span>
          <span className={`text-gray-400 transition-transform ${expandedSections.includes('notes') ? 'rotate-90' : ''}`}>▶</span>
        </button>

        {/* Research Section */}
        <button
          onClick={() => toggleSection('research')}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span className="font-medium text-gray-900">Research</span>
          <span className={`text-gray-400 transition-transform ${expandedSections.includes('research') ? 'rotate-90' : ''}`}>▶</span>
        </button>
      </div>

      {/* Action Buttons - Bottom */}
      <div className="flex gap-3">
        <button 
          onClick={handleCancel}
          disabled={isSaving}
          className="flex-1 px-4 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 font-medium disabled:opacity-50"
        >
          Cancel
        </button>
        <button 
          onClick={handleSaveToRolodex}
          disabled={isSaving || !businessName.trim()}
          className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Business'}
        </button>
      </div>
      </div>
      )}
    </div>
  );
}
