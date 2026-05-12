import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
};

// Obtener proyectos
export const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw new Error(error.message);
      return data as Project[];
    },
  });
};

// Crear proyecto
export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newProject: { name: string; description?: string; status?: string }) => {
      const { data, error } = await supabase
        .from('projects')
        .insert([{ ...newProject, status: newProject.status || 'active' }])
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};