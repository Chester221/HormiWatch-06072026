import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

export type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  client_id?: string;
  clients?: { name: string } | null;
  pool_hours?: number;
  hours_consumed?: number;
  end_date?: string;
  start_date?: string;
  hourly_rate?: number;
  created_at: string;
  created_by?: string;
};

export const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async (): Promise<Project[]> => {
      try {
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (projectsError) { console.error('Error fetching projects:', projectsError); return []; }
        if (!projects || projects.length === 0) return [];

        const clientIds = [...new Set(projects.map(p => p.client_id).filter(Boolean))];
        let clientsMap: Record<string, string> = {};
        
        if (clientIds.length > 0) {
          const { data: clients } = await supabase.from('clients').select('id, name').in('id', clientIds);
          (clients || []).forEach((c: any) => { clientsMap[c.id] = c.name; });
        }

        const projectIds = projects.map(p => p.id);
<<<<<<< HEAD
        const { data: tasksData } = await supabase
  .from('tasks')
  .select('project_id, hours')  // ✅ hours sí existe
  .in('project_id', projectIds);
=======
        const { data: tasksData } = await supabase.from('tasks').select('project_id, duration_in_minutes').in('project_id', projectIds);
>>>>>>> 11069f104d1610e5c5ea848911ab81005acbe8e2

        const hoursMap: Record<string, number> = {};
        (tasksData || []).forEach((t: any) => {
          if (!hoursMap[t.project_id]) hoursMap[t.project_id] = 0;
<<<<<<< HEAD
          hoursMap[t.project_id] += (t.hours || 0);
=======
          hoursMap[t.project_id] += (t.duration_in_minutes || 0) / 60;
>>>>>>> 11069f104d1610e5c5ea848911ab81005acbe8e2
        });

        return projects.map(p => ({
          ...p,
          clients: clientsMap[p.client_id] ? { name: clientsMap[p.client_id] } : null,
          hours_consumed: hoursMap[p.id] || 0,
        }));
      } catch (err) { console.error('Error in useProjects:', err); return []; }
    },
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newProject: { name: string; description?: string; status?: string; client_id?: string }) => {
      const { data, error } = await supabase.from('projects').insert([{ ...newProject, status: newProject.status || 'In Progress' }]).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); toast.success('Proyecto creado correctamente'); },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, userId }: { projectId: string; userId: string }) => {
      const { data: project, error: projectError } = await supabase.from('projects').select('status, created_by, name').eq('id', projectId).single();
      if (projectError) throw new Error('Proyecto no encontrado');

      if (project.created_by && project.created_by !== userId) {
        throw new Error('Solo el creador del proyecto puede eliminarlo');
      }

      // ✅ Verificar si tiene tareas
      const { count: totalTasks } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('project_id', projectId);

      // Si tiene tareas, solo se puede eliminar si está Completed o Cancelled
      if (totalTasks && totalTasks > 0) {
        if (project.status !== 'Completed' && project.status !== 'Cancelled') {
          throw new Error(`No puedes eliminar "${project.name}" porque tiene ${totalTasks} tarea(s). Solo se pueden eliminar proyectos completados o cancelados.`);
        }
      }

      await supabase.from('project_members').delete().eq('project_id', projectId);
      await supabase.from('tasks').delete().eq('project_id', projectId);
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw new Error('Error al eliminar el proyecto');

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project_members'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Proyecto eliminado correctamente');
    },
    onError: (error: Error) => { toast.error(error.message); },
  });
};
