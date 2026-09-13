'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Project } from '@/lib/types/decide';
import { ProjectsList } from './ProjectsList';
import { ProjectWorkspace } from './ProjectWorkspace';

export function ProjectsContainer() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/decide/projects', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        const updatedProjects = result.data || [];
        setProjects(updatedProjects);
        
        // Update selectedProject if it exists to reflect any changes
        if (selectedProject) {
          const updatedSelected = updatedProjects.find((p: Project) => p.id === selectedProject.id);
          if (updatedSelected) {
            setSelectedProject(updatedSelected);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (name: string, description?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/decide/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name, description }),
      });

      const result = await response.json();
      if (result.success) {
        await fetchProjects();
        setSelectedProject(result.data);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project. Please try again.');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Delete this project? All tasks will remain in TODO workspace.')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/decide/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        await fetchProjects();
        if (selectedProject?.id === projectId) {
          setSelectedProject(null);
        }
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    }
  };

  const handleReorderProjects = async (reorderedProjects: Project[]) => {
    // Optimistically update UI
    setProjects(reorderedProjects);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Update order_index for each project
      for (let i = 0; i < reorderedProjects.length; i++) {
        await fetch(`/api/decide/projects/${reorderedProjects[i].id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ order_index: i }),
        });
      }
    } catch (error) {
      console.error('Error reordering projects:', error);
      // Refresh to restore correct order
      await fetchProjects();
    }
  };

  return (
    <div className="container mx-auto p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Projects
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Develop project ideas and create tasks
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Projects List */}
        <div className="lg:col-span-1">
          <ProjectsList
            projects={projects}
            selectedProject={selectedProject}
            onSelectProject={setSelectedProject}
            onCreateProject={handleCreateProject}
            onDeleteProject={handleDeleteProject}
            onReorderProjects={handleReorderProjects}
            loading={loading}
          />
        </div>

        {/* Right: Project Workspace */}
        <div className="lg:col-span-2">
          {selectedProject ? (
            <ProjectWorkspace
              project={selectedProject}
              onUpdateProject={fetchProjects}
            />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <div className="text-6xl mb-4">📁</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No Project Selected
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Select a project from the list or create a new one to get started
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
