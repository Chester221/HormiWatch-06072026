import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export interface Service {
  id: string;
  name: string;
  category_id: string;
  description: string | null;
  default_hourly_rate: number;
  is_active: boolean;
  categories?: { name: string };
}

// Obtener servicios
export const useServices = (searchQuery?: string) => {
  return useQuery({
    queryKey: ['services', searchQuery],
    queryFn: async () => {
      try {
        let query = supabase
          .from('services')
          .select(`*, categories:service_categories(name)`)
          .eq('is_active', true)
          .order('name');

        const { data, error } = await query;
        if (error) return [];
        
        let services = data || [];
        if (searchQuery) {
          const search = searchQuery.toLowerCase();
          services = services.filter(s =>
            s.name.toLowerCase().includes(search) ||
            (s.description && s.description.toLowerCase().includes(search)) ||
            (s.categories?.name && s.categories.name.toLowerCase().includes(search))
          );
        }
        return services;
      } catch {
        return [];
      }
    },
  });
};

// Obtener categorías
export const useServiceCategories = () => {
  return useQuery({
    queryKey: ['service_categories'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('service_categories')
          .select('*')
          .order('name');
        if (error) return [];
        return data || [];
      } catch {
        return [];
      }
    },
  });
};

// Crear servicio
export const useCreateService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newService: any) => {
      const { data, error } = await supabase
        .from('services')
        .insert([{ ...newService, is_active: true }])
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
};

// Actualizar servicio
export const useUpdateService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: updated, error } = await supabase
        .from('services')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
};

// Eliminar servicio
export const useDeleteService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
};