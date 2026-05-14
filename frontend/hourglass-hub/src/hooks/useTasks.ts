import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { Tables, InsertTables } from '@/types/supabase'

export type Task = Tables<'tasks'> & {
  projects?: { name: string } | null
  services?: { name: string } | null
  technician?: { full_name: string; avatar_url: string | null } | null
}

export type CreateTaskData = InsertTables<'tasks'>

export const useTasks = (projectId?: string | 'all') => {
  const fetchTasks = async (): Promise<Task[]> => {
    try {
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
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.refetchQueries({ queryKey: ['tasks'] })
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number | string; data: Partial<CreateTaskData> }) => {
      const { error: updateError } = await supabase
        .from('tasks')
        .update(data)
        .eq('id', id)

      if (updateError) throw new Error(updateError.message)

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
      queryClient.refetchQueries({ queryKey: ['tasks'] })
    },
  })
}

export const useDeleteTask = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId)
      if (error) throw error
    },
    onSuccess: () => {
      // Forzar recarga de TODAS las queries que empiecen con 'tasks'
      queryClient.refetchQueries({
        predicate: (query) => query.queryKey[0] === 'tasks'
      })
    },
  })
}

export const useUpdateTask = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase.from('tasks').update(data).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.refetchQueries({
        predicate: (query) => query.queryKey[0] === 'tasks'
      })
    },
  })
}