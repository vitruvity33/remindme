'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { WorkspaceTodo, Project } from '@/lib/types/decide';
import { MeetingTasksPanel } from './MeetingTasksPanel';
import { ProjectTasksPanel } from './ProjectTasksPanel';
import { RelationshipTasksPanel } from './RelationshipTasksPanel';

interface MasterTodoListProps {
  excludeIds?: Set<string>;
  refreshKey?: number;
}

export function MasterTodoList({ excludeIds, refreshKey }: MasterTodoListProps) {
  const [todos, setTodos] = useState<WorkspaceTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickInput, setQuickInput] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'ready' | 'projects' | 'meetings' | 'relationships'>(() => {
    // Check if user was just working with meetings source
    if (typeof window !== 'undefined') {
      const lastSource = sessionStorage.getItem('todo_last_source');
      if (lastSource === 'meetings') {
        sessionStorage.removeItem('todo_last_source'); // Clear after reading
        return 'meetings';
      }
    }
    return 'ready';
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (filter !== 'meetings' && filter !== 'projects' && filter !== 'relationships') {
      fetchTodos();
    }
  }, [excludeIds, filter]);

  const fetchProjects = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/decide/projects', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setProjects(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };


  const fetchTodos = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const url = '/api/decide/workspace';

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();
      if (result.success && result.data) {
        // Filter out tasks that are already scheduled (have a scheduled_for date)
        let unscheduledTasks = result.data.filter((todo: WorkspaceTodo) => !todo.scheduled_for);
        
        // Apply status filter
        if (filter === 'ready') {
          // Only show tasks with status='ready' (or NULL for backwards compatibility)
          unscheduledTasks = unscheduledTasks.filter((todo: WorkspaceTodo) => 
            todo.status === 'ready' || todo.status === null
          );
        }
        // 'all' filter shows everything (no filtering)
        
        setTodos(unscheduledTasks);
      }
    } catch (error) {
      console.error('Error fetching todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTodo = async () => {
    if (!quickInput.trim()) return;

    const text = quickInput.trim();
    const tempId = `temp-${Date.now()}`;
    
    // Optimistic update
    const optimisticTodo: WorkspaceTodo = {
      id: tempId,
      text,
      status: 'ready',
      created_at: new Date().toISOString(),
      user_id: '',
      ai_generated: false,
      order_index: 0,
      is_breakdown: false,
    };

    setTodos(prev => [...prev, optimisticTodo]);
    setQuickInput('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/decide/workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          text,
          status: 'ready',
        }),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        // Replace temp with real data
        setTodos(prev => prev.map(t => 
          t.id === tempId ? result.data : t
        ));
      } else {
        // Remove optimistic update on error
        setTodos(prev => prev.filter(t => t.id !== tempId));
        alert('Failed to create TODO. Please try again.');
      }
    } catch (error) {
      console.error('Error creating todo:', error);
      setTodos(prev => prev.filter(t => t.id !== tempId));
      alert('Failed to create TODO. Please try again.');
    }
  };

  const handleToggleSelect = (todoId: string, shiftKey: boolean = false) => {
    const visibleTodos = todos.filter(t => !excludeIds?.has(t.id));
    const clickedIndex = visibleTodos.findIndex(t => t.id === todoId);
    
    if (shiftKey && lastSelectedIndex !== null && lastSelectedIndex !== -1 && clickedIndex !== -1) {
      // Shift-click: select range
      const start = Math.min(lastSelectedIndex as number, clickedIndex);
      const end = Math.max(lastSelectedIndex as number, clickedIndex);
      const rangeIds = visibleTodos.slice(start, end + 1).map(t => t.id);
      
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        rangeIds.forEach(id => newSet.add(id));
        return newSet;
      });
    } else {
      // Regular click: toggle single item
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(todoId)) {
          newSet.delete(todoId);
        } else {
          newSet.add(todoId);
        }
        return newSet;
      });
    }
    
    setLastSelectedIndex(clickedIndex);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === todos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(todos.map(t => t.id)));
    }
  };

  const handleUpdateTodo = async (todoId: string, text: string) => {
    if (!text.trim()) {
      alert('Task text cannot be empty');
      return;
    }

    // Optimistically update UI
    setTodos(prev => prev.map(t => 
      t.id === todoId ? { ...t, text: text.trim() } : t
    ));
    setEditingId(null);
    setEditText('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/decide/workspace/${todoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text: text.trim() }),
      });

      if (!response.ok) {
        console.error('Error updating todo');
        await fetchTodos();
      }
    } catch (error) {
      console.error('Error updating todo:', error);
      await fetchTodos();
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    console.log('Deleting todo:', todoId);
    
    // Optimistically remove from UI
    setTodos(prev => prev.filter(t => t.id !== todoId));
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(todoId);
      return newSet;
    });

    // If it's a temporary ID, don't try to delete from server
    if (todoId.startsWith('temp-')) {
      console.log('Skipping server delete for temp ID:', todoId);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No session token available');
        return;
      }

      console.log('Deleting from server:', todoId);
      const response = await fetch(`/api/decide/workspace/${todoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        console.error('Error deleting todo from server, status:', response.status);
        const result = await response.json();
        console.error('Server error:', result);
        // Refetch to restore accurate state
        await fetchTodos();
      } else {
        console.log('Successfully deleted from server');
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
      // Refetch to restore accurate state
      await fetchTodos();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    if (!window.confirm(`Delete ${selectedIds.size} selected task${selectedIds.size > 1 ? 's' : ''}?`)) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/decide/workspace/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          })
        )
      );

      setTodos(prev => prev.filter(t => !selectedIds.has(t.id)));
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Error deleting todos:', error);
      alert('Failed to delete some tasks. Please try again.');
    }
  };

  const handleDragStart = (e: React.DragEvent, todo: WorkspaceTodo) => {
    // If dragging a selected item, drag all selected items
    if (selectedIds.has(todo.id) && selectedIds.size > 1) {
      const selectedTodos = todos.filter(t => selectedIds.has(t.id));
      e.dataTransfer.setData('todos', JSON.stringify(selectedTodos));
      e.dataTransfer.setData('count', selectedIds.size.toString());
    } else {
      e.dataTransfer.setData('todo', JSON.stringify(todo));
    }
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 min-h-[600px]">
      {/* Header with Filter Tabs */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            All TODOs
          </h3>
        </div>
        
        {/* Filter Tabs */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('ready')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filter === 'ready'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Ready for Scheduling
            </button>
            <button
              onClick={() => setFilter('projects')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              filter === 'projects'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Projects
          </button>
            <button
              onClick={() => setFilter('meetings')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              filter === 'meetings'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Meetings
          </button>
            <button
              onClick={() => setFilter('relationships')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              filter === 'relationships'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Relationships
          </button>
            <button
              onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All
            </button>
          </div>
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Drag any task to the calendar to schedule it
        </p>
      </div>

      {/* Quick Add TODO */}
      <div className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateTodo();
            }}
            placeholder="Quick add TODO..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          />
          <button
            onClick={handleCreateTodo}
            disabled={!quickInput.trim()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Press Enter to add quickly
        </p>
      </div>

      {/* Meetings Panel, Projects Panel, Relationships Panel, or Task List */}
      {filter === 'meetings' ? (
        <MeetingTasksPanel />
      ) : filter === 'projects' ? (
        <ProjectTasksPanel key={refreshKey} />
      ) : filter === 'relationships' ? (
        <RelationshipTasksPanel />
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : todos.filter(t => !excludeIds?.has(t.id)).length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p className="text-sm font-medium mb-1">No TODOs to schedule</p>
          <p className="text-xs">Add TODOs from the workspace above</p>
        </div>
      ) : (
        <div className="space-y-2">
          {todos.filter(t => !excludeIds?.has(t.id)).map((todo) => (
            <div
              key={todo.id}
              draggable
              onDragStart={(e) => handleDragStart(e, todo)}
              onClick={(e) => handleToggleSelect(todo.id, e.shiftKey)}
              className={`group relative p-3 rounded-lg border-2 transition-all ${
                selectedIds.has(todo.id)
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-500'
                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
              }`}
              style={{ cursor: 'grab' }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {selectedIds.has(todo.id) ? (
                    <div className="w-5 h-5 rounded border-2 border-blue-600 bg-blue-600 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {editingId === todo.id ? (
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => handleUpdateTodo(todo.id, editText)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdateTodo(todo.id, editText);
                        } else if (e.key === 'Escape') {
                          setEditingId(null);
                          setEditText('');
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                      autoFocus
                    />
                  ) : (
                    <p 
                      className="text-sm text-gray-900 dark:text-gray-100 break-words cursor-text hover:bg-gray-100 dark:hover:bg-gray-600 px-2 py-1 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(todo.id);
                        setEditText(todo.text);
                      }}
                    >
                      {todo.text}
                    </p>
                  )}
                  {todo.project_id && (
                    <span className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 mt-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                      </svg>
                      Project
                    </span>
                  )}
                  {todo.ai_generated && (
                    <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mt-1 ml-2">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L11 4.323V3a1 1 0 011-1zm-5 8.274l-.818 2.552c-.25.78.062 1.634.769 2.094A3.99 3.99 0 007 15a3.99 3.99 0 002.049-.58c.707-.46 1.019-1.314.769-2.094l-.818-2.552c-.25-.78-.62-1.45-1.051-2.033a1 1 0 00-1.898 0c-.43.582-.8 1.253-1.051 2.033z" />
                      </svg>
                      AI
                    </span>
                  )}
                </div>
                <button
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleDeleteTodo(todo.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Count */}
      {todos.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {todos.length} {todos.length === 1 ? 'task' : 'tasks'} ready to schedule
          </p>
        </div>
      )}
    </div>
  );
}
