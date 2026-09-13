'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ProjectTask } from '@/lib/types/decide';

interface TasksTabProps {
  projectId: string;
}

export function TasksTab({ projectId }: TasksTabProps) {
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskText, setNewTaskText] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [editingTextTaskId, setEditingTextTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    console.log('TasksTab mounted with projectId:', projectId);
    if (projectId) {
      fetchTasks();
    }
  }, [projectId]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/decide/projects/${projectId}/tasks`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      const result = await response.json();
      if (result.success) {
        let tasksData = result.data || [];
        
        // Sync completion status from workspace todos
        const workspaceTaskIds = tasksData
          .filter((t: ProjectTask) => t.workspace_todo_id)
          .map((t: ProjectTask) => t.workspace_todo_id);
        
        if (workspaceTaskIds.length > 0) {
          const { data: workspaceTodos } = await supabase
            .from('todo_workspace')
            .select('id, completed')
            .in('id', workspaceTaskIds);
          
          if (workspaceTodos) {
            const completionMap = new Map(workspaceTodos.map(wt => [wt.id, wt.completed]));
            
            tasksData = tasksData.map((task: ProjectTask) => {
              if (task.workspace_todo_id && completionMap.has(task.workspace_todo_id)) {
                const workspaceCompleted = completionMap.get(task.workspace_todo_id);
                // Sync workspace completion to project task if different
                if (workspaceCompleted !== task.completed) {
                  // Update in database
                  fetch(`/api/decide/projects/${projectId}/tasks/${task.id}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({ completed: workspaceCompleted }),
                  });
                  
                  return { ...task, completed: workspaceCompleted };
                }
              }
              return task;
            });
          }
        }
        
        setTasks(buildTaskHierarchy(tasksData));
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildTaskHierarchy = (flatTasks: ProjectTask[]): ProjectTask[] => {
    const taskMap = new Map<string, ProjectTask>();
    const rootTasks: ProjectTask[] = [];

    flatTasks.forEach(task => {
      taskMap.set(task.id, { ...task, subtasks: [] });
    });

    flatTasks.forEach(task => {
      const taskWithSubtasks = taskMap.get(task.id)!;
      if (task.parent_id) {
        const parent = taskMap.get(task.parent_id);
        if (parent) {
          parent.subtasks = parent.subtasks || [];
          parent.subtasks.push(taskWithSubtasks);
        }
      } else {
        rootTasks.push(taskWithSubtasks);
      }
    });

    return rootTasks;
  };

  const handleAddTask = async (parentId?: string) => {
    if (!newTaskText.trim()) {
      console.log('Task text is empty');
      return;
    }

    if (!projectId) {
      console.error('No projectId available');
      alert('Error: Project ID is missing. Please refresh the page and try again.');
      return;
    }

    console.log('Adding task:', newTaskText.trim(), 'to project:', projectId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No session token');
        alert('Not authenticated. Please refresh the page.');
        return;
      }

      const response = await fetch(`/api/decide/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          text: newTaskText.trim(),
          parent_id: parentId || null,
        }),
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        setNewTaskText('');
        setEditingTaskId(null);
        await fetchTasks();
        
        if (parentId) {
          setExpandedTaskIds(prev => new Set(prev).add(parentId));
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to create task:', errorData);
        alert(`Failed to create task: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding task:', error);
      alert('Failed to add task. Please try again.');
    }
  };

  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/decide/projects/${projectId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ completed }),
      });

      if (response.ok) {
        await fetchTasks();
      }
    } catch (error) {
      console.error('Error toggling task completion:', error);
    }
  };

  const handlePushTaskToWorkspace = async (taskId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert('Not authenticated. Please refresh the page.');
        return;
      }

      const flatTasks = getAllTasks(tasks);
      const task = flatTasks.find(t => t.id === taskId);
      if (!task) return;

      // Create workspace todo with status='ready'
      const workspaceResponse = await fetch('/api/decide/workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          text: task.text,
          status: 'ready',
          source_type: 'project',
          source_id: projectId,
        }),
      });

      const workspaceResult = await workspaceResponse.json();
      if (!workspaceResult.success || !workspaceResult.data) {
        alert('Failed to push task to workspace.');
        return;
      }

      const workspaceTodoId = workspaceResult.data.id;

      // Mark project task as pushed
      await fetch(`/api/decide/projects/${projectId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          pushed_to_workspace: true,
          workspace_todo_id: workspaceTodoId,
        }),
      });

      await fetchTasks();
    } catch (error) {
      console.error('Error pushing task to workspace:', error);
      alert('Failed to push task. Please try again.');
    }
  };

  const handleUpdateTaskText = async (taskId: string, newText: string) => {
    if (!newText.trim()) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/decide/projects/${projectId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text: newText.trim() }),
      });

      if (response.ok) {
        await fetchTasks();
      }
    } catch (error) {
      console.error('Error updating task text:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Delete this task and all its subtasks?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/decide/projects/${projectId}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        await fetchTasks();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleReorderTasks = async (draggedId: string, targetId: string) => {
    const flatTasks = getAllTasks(tasks);
    const draggedIndex = flatTasks.findIndex(t => t.id === draggedId);
    const targetIndex = flatTasks.findIndex(t => t.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const reordered = [...flatTasks];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      for (let i = 0; i < reordered.length; i++) {
        await fetch(`/api/decide/projects/${projectId}/tasks/${reordered[i].id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ order_index: i }),
        });
      }

      await fetchTasks();
    } catch (error) {
      console.error('Error reordering tasks:', error);
    }
  };

  const getAllTasks = (taskList: ProjectTask[]): ProjectTask[] => {
    const result: ProjectTask[] = [];
    taskList.forEach(task => {
      result.push(task);
      if (task.subtasks && task.subtasks.length > 0) {
        result.push(...getAllTasks(task.subtasks));
      }
    });
    return result;
  };

  const handleSaveToTodoWorkspace = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert('Not authenticated. Please refresh the page.');
        return;
      }

      const flatTasks = getAllTasks(tasks);
      let savedCount = 0;

      for (const task of flatTasks) {
        if (!task.pushed_to_workspace) {
          const response = await fetch('/api/decide/workspace', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              text: task.text,
              description: task.description || null,
              project_id: projectId,
              status: 'draft',
            }),
          });

          if (response.ok) {
            const result = await response.json();
            
            // Mark task as pushed
            await fetch(`/api/decide/projects/${projectId}/tasks/${task.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                pushed_to_workspace: true,
                workspace_todo_id: result.data.id,
              }),
            });

            savedCount++;
          }
        }
      }

      if (savedCount > 0) {
        alert(`✅ ${savedCount} task(s) saved to TODO Workspace! Go to TODO → Projects to schedule them.`);
        await fetchTasks();
      } else {
        alert('All tasks are already saved to TODO Workspace.');
      }
    } catch (error) {
      console.error('Error saving to TODO workspace:', error);
      alert('Failed to save tasks. Please try again.');
    }
  };

  const toggleExpanded = (taskId: string) => {
    setExpandedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const renderTask = (task: ProjectTask, depth: number = 0) => {
    const isExpanded = expandedTaskIds.has(task.id);
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    const isAddingSubtask = editingTaskId === task.id;

    return (
      <div key={task.id} style={{ marginLeft: `${depth * 24}px` }}>
        <div 
          className="group flex items-start gap-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-2 transition-colors cursor-move"
          draggable
          onDragStart={(e) => {
            setDraggedTaskId(task.id);
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (draggedTaskId && draggedTaskId !== task.id) {
              handleReorderTasks(draggedTaskId, task.id);
            }
            setDraggedTaskId(null);
          }}
          onDragEnd={() => setDraggedTaskId(null)}
        >
          <button
            onClick={() => handleToggleComplete(task.id, !task.completed)}
            className="flex-shrink-0 mt-0.5"
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              task.completed 
                ? 'bg-green-500 border-green-500' 
                : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
            }`}>
              {task.completed && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </button>

          {hasSubtasks && (
            <button
              onClick={() => toggleExpanded(task.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg 
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {editingTextTaskId === task.id ? (
            <input
              type="text"
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              onBlur={async () => {
                if (editingText.trim() && editingText !== task.text) {
                  await handleUpdateTaskText(task.id, editingText);
                }
                setEditingTextTaskId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                } else if (e.key === 'Escape') {
                  setEditingText(task.text);
                  setEditingTextTaskId(null);
                }
              }}
              className="flex-1 text-sm bg-transparent border-b border-blue-500 focus:outline-none text-gray-900 dark:text-gray-100"
              autoFocus
            />
          ) : (
            <div className="flex-1 flex items-center gap-2">
              <p 
                className={`text-sm cursor-pointer ${task.completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400'}`}
                onClick={() => {
                  setEditingTextTaskId(task.id);
                  setEditingText(task.text);
                }}
                title="Click to edit"
              >
                {task.text}
              </p>
              {task.pushed_to_workspace && (
                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full font-medium">
                  Scheduled
                </span>
              )}
            </div>
          )}

          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            {!task.pushed_to_workspace && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await handlePushTaskToWorkspace(task.id);
                }}
                className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800 font-medium"
                title="Push to Ready for Scheduling"
              >
                Ready
              </button>
            )}
            <button
              onClick={() => setEditingTaskId(task.id)}
              className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900 rounded text-blue-600 text-xs"
              title="Add subtask"
            >
              + Sub
            </button>
            <button
              onClick={() => handleDeleteTask(task.id)}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {isAddingSubtask && (
          <div className="ml-7 mb-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTask(task.id);
                  if (e.key === 'Escape') {
                    setEditingTaskId(null);
                    setNewTaskText('');
                  }
                }}
                placeholder="Enter subtask..."
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                autoFocus
              />
              <button
                onClick={() => handleAddTask(task.id)}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setEditingTaskId(null);
                  setNewTaskText('');
                }}
                className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {isExpanded && hasSubtasks && (
          <div>
            {task.subtasks!.map(subtask => renderTask(subtask, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Break down your project into actionable tasks
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={editingTaskId === null ? newTaskText : ''}
          onChange={(e) => setNewTaskText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newTaskText.trim()) {
              e.preventDefault();
              handleAddTask();
            }
          }}
          placeholder="Add a task..."
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
        />
        <button
          onClick={() => handleAddTask()}
          disabled={!newTaskText.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        >
          Add Task
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <div className="text-6xl mb-3">✓</div>
          <p className="text-sm font-medium">No tasks yet</p>
          <p className="text-xs mt-1">Add your first task to get started</p>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
          {tasks.map(task => renderTask(task))}
        </div>
      )}

      {tasks.length > 0 && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSaveToTodoWorkspace}
            className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            💾 Save All Tasks to TODO Workspace
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            Tasks will appear in TODO → Projects tab for scheduling
          </p>
        </div>
      )}
    </div>
  );
}
