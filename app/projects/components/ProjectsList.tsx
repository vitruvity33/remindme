'use client';

import { useState } from 'react';
import { Project } from '@/lib/types/decide';
import { supabase } from '@/lib/supabase';

interface ProjectsListProps {
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (project: Project) => void;
  onCreateProject: (name: string, description?: string) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
  onReorderProjects: (reorderedProjects: Project[]) => void;
  loading: boolean;
}

export function ProjectsList({
  projects,
  selectedProject,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onReorderProjects,
  loading,
}: ProjectsListProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;

    await onCreateProject(newName.trim(), newDescription.trim() || undefined);
    setNewName('');
    setNewDescription('');
    setIsCreating(false);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          All Projects
        </h2>
        <button
          onClick={() => setIsCreating(true)}
          className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          + New
        </button>
      </div>

      {/* Create Form */}
      {isCreating && (
        <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim()) {
                e.preventDefault();
                handleCreate();
              }
            }}
            placeholder="Project name..."
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white mb-2"
            autoFocus
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)..."
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white resize-none"
            rows={2}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setNewName('');
                setNewDescription('');
              }}
              className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Projects List */}
      {projects.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-3">📁</div>
          <p className="text-sm">No projects yet</p>
          <p className="text-xs mt-1">Create your first project</p>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((project, index) => (
            <div
              key={project.id}
              draggable
              onDragStart={() => setDraggedIndex(index)}
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={async () => {
                if (draggedIndex === null || draggedIndex === index) return;
                
                const reordered = [...projects];
                const [removed] = reordered.splice(draggedIndex, 1);
                reordered.splice(index, 0, removed);
                
                onReorderProjects(reordered);
                setDraggedIndex(null);
              }}
              onDragEnd={() => setDraggedIndex(null)}
              className={`group relative p-4 rounded-lg cursor-move transition-all ${
                selectedProject?.id === project.id
                  ? 'bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-500'
                  : 'bg-gray-50 dark:bg-gray-700 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
              } ${draggedIndex === index ? 'opacity-50' : ''}`}
              onClick={() => onSelectProject(project)}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">📁</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProject(project.id);
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
    </div>
  );
}
