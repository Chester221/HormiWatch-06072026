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
};

export const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async (): Promise<Project[]> => {
      try {
        // Obtener proyectos con cliente
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (projectsError) {
          console.error('Error fetching projects:', projectsError);
          return [];
        }

        // Obtener horas trabajadas por proyecto
        const { data: hoursData } = await supabase
          .from('project_hours')
          .select('*');

        // Obtener nombres de clientes
        const clientIds = [...new Set((projects || []).map(p => p.client_id).filter(Boolean))];
        let clientsMap: Record<string, string> = {};
        
        if (clientIds.length > 0) {
          const { data: clients } = await supabase
            .from('clients')
            .select('id, name')
            .in('id', clientIds);
          
          (clients || []).forEach((c: any) => {
            clientsMap[c.id] = c.name;
          });
        }

        const hoursMap: Record<string, number> = {};
        (hoursData || []).forEach((h: any) => {
          hoursMap[h.project_id] = h.hours_consumed || 0;
        });

        return (projects || []).map(p => ({
          ...p,
          clients: clientsMap[p.client_id] ? { name: clientsMap[p.client_id] } : null,
          hours_consumed: hoursMap[p.id] || 0,
        }));
      } catch (err) {
        console.error('Error:', err);
        return [];
      }
    },
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newProject: { name: string; description?: string; status?: string; client_id?: string }) => {
      const { data, error } = await supabase
        .from('projects')
        .insert([{ ...newProject, status: newProject.status || 'In Progress' }])
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Proyecto creado correctamente');
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
      
      if (error) {
        if (error.message?.includes('foreign key constraint')) {
          throw new Error('No puedes eliminar este proyecto porque tiene tareas asociadas. Elimina las tareas primero.');
        }
        throw new Error(error.message);
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Proyecto eliminado correctamente');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};