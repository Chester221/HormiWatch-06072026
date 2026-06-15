import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Tables, InsertTables } from '@/types/supabase'

export type Task = Tables<'tasks'> & {
  projects?: { name: string } | null
  services?: { name: string } | null
  technician?: { full_name: string; avatar_url: string | null } | null
}

export type CreateTaskData = InsertTables<'tasks'>

export const useTasks = (projectId?: string | 'all', technicianId?: string) => {
  const fetchTasks = async (): Promise<Task[]> => {
    try {
      // ✅ Cambiar a 'tasks' en lugar de 'tasks_with_details'
      let query = supabase
        .from('tasks')
        .select(`
          *,
          projects:project_id(name),
          services:service_id(name),
          technicians:technician_id(full_name, avatar_url)
        `)
        .order('created_at', { ascending: false })

      if (projectId && projectId !== 'all') {
        query = query.eq('project_id', projectId)
      }

<<<<<<< HEAD
      // ✅ Filtrar por técnico si se especifica
=======
      // ✅ Filtrar por técnico si se especifica (para Viewer)
>>>>>>> 11069f104d1610e5c5ea848911ab81005acbe8e2
      if (technicianId) {
        query = query.eq('technician_id', technicianId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching tasks:', error)
        return []
      }

      // Transformar los datos al formato esperado
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        projects: item.projects || null,
        services: item.services || null,
        technician: item.technicians || null
      }))

      return transformedData as Task[]
    } catch (err) {
      console.error('Error fetching tasks:', err)
      return []
    }
  }

  return useQuery({
    queryKey: ['tasks', projectId, technicianId],
    queryFn: fetchTasks,
  })
}

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newTask: any) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert([newTask])
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarea creada correctamente');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
};

export const useCreateTasks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newTasks: any[]) => {
      if (newTasks.length === 0) throw new Error('No hay tareas para crear');
      const { data, error } = await supabase
        .from('tasks')
        .insert(newTasks)
        .select();
      
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number | string; data: Partial<CreateTaskData> }) => {
<<<<<<< HEAD
=======
      // ✅ Hacer update + select en una sola operación
>>>>>>> 11069f104d1610e5c5ea848911ab81005acbe8e2
      const { data: updated, error } = await supabase
        .from('tasks')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return updated
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarea actualizada');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  })
}

export const useDeleteTask = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarea eliminada');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  })
}