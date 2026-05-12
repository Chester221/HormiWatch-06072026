import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { Tables, InsertTables } from '@/types/supabase'

// Tipos para tareas derivados de Supabase
export type Task = Tables<'tasks'> & {
  // Relaciones
  projects?: { name: string } | null
  services?: { name: string } | null
  technician?: { full_name: string; avatar_url: string | null } | null
}

// Tipo para crear nueva tarea derivado de Supabase
export type CreateTaskData = InsertTables<'tasks'>

// Hook para obtener tareas
// Hook para obtener tareas
export const useTasks = (projectId?: string | 'all') => {
  const fetchTasks = async (): Promise<Task[]> => {
    try {
      // Usar la vista tasks_with_details en lugar de la tabla tasks
      let query = supabase
        .from('tasks_with_details')
        .select('*')
        .order('start_time', { ascending: false })

      if (projectId && projectId !== 'all') {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.warn('La vista tasks_with_details no existe.')
          return []
        }
        throw new Error(error.message)
      }

      // Transformar los datos al formato que espera el frontend
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        projects: item.project_name ? { name: item.project_name } : null,
        services: item.service_name ? { name: item.service_name } : null,
        technician: item.technician_name ? { full_name: item.technician_name, avatar_url: null } : null
      }))

      return transformedData as Task[]
    } catch (err) {
      console.error('Error fetching tasks:', err)
      return []
    }
  }

  return useQuery({
    queryKey: ['tasks', projectId],
    queryFn: fetchTasks,
  })
}

// Hook para crear tarea
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
    },
  });
};

// Hook para actualizar tarea
// Hook para actualizar tarea
// Hook para actualizar tarea
export const useUpdateTask = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number | string; data: Partial<CreateTaskData> }) => {
      // Primero actualizar
      const { error: updateError } = await supabase
        .from('tasks')
        .update(data)
        .eq('id', id)

      if (updateError) throw new Error(updateError.message)

      // Luego obtener el registro actualizado
      const { data: updated, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) throw new Error(fetchError.message)
      return updated
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// Hook para eliminar tarea
export const useDeleteTask = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}