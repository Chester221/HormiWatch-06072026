import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'

// Tipos para categorías de servicio
export interface ServiceCategory {
    id: string
    name: string
    description?: string | null
}

// Tipos para servicios
export interface Service {
    id: string
    category_id: string
    name: string
    description?: string | null
    default_hourly_rate: number
    is_active: boolean
    categories?: ServiceCategory
}

// Hook para obtener categorías
export const useServiceCategories = () => {
    const fetchCategories = async (): Promise<ServiceCategory[]> => {
        try {
            const { data, error } = await supabase
                .from('service_categories')
                .select('*')
                .order('name', { ascending: true })

            if (error) {
                if (error.code === '42P01' || error.message.includes('does not exist')) {
                    console.warn('La tabla service_categories no existe en Supabase.')
                    return []
                }
                throw new Error(error.message)
            }

            return (data || []) as ServiceCategory[]
        } catch (err) {
            console.error('Error fetching categories:', err)
            return []
        }
    }

    return useQuery({
        queryKey: ['service_categories'],
        queryFn: fetchCategories,
    })
}

// Hook para obtener servicios
export const useServices = (searchQuery?: string) => {
    const fetchServices = async (): Promise<Service[]> => {
        try {
            let query = supabase
                .from('services')
                .select(`
          *,
          categories:service_categories ( * )
        `)
                .eq('is_active', true)
                .order('name', { ascending: true })

            const { data, error } = await query

            if (error) {
                if (error.code === '42P01' || error.message.includes('does not exist')) {
                    console.warn('La tabla services no existe en Supabase.')
                    return []
                }
                throw new Error(error.message)
            }

            let services = (data || []) as Service[]

            services = services.map(service => ({
                ...service,
                default_hourly_rate: service.default_hourly_rate || 0
            }))

            if (searchQuery) {
                const search = searchQuery.toLowerCase()
                services = services.filter(s =>
                    s.name.toLowerCase().includes(search) ||
                    (s.description && s.description.toLowerCase().includes(search)) ||
                    (s.categories && s.categories.name.toLowerCase().includes(search))
                )
            }

            return services
        } catch (err) {
            console.error('Error fetching services:', err)
            return []
        }
    }

    return useQuery({
        queryKey: ['services', searchQuery],
        queryFn: fetchServices,
    })
}

// Hook para crear servicio
export const useCreateService = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (data: any) => {
            const { data: newService, error } = await supabase
                .from('services')
                .insert({ ...data, is_active: true })
                .select()
                .single()

            if (error) throw new Error(error.message)
            return newService
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['services'] })
        },
    })
}

// Hook para actualizar servicio
export const useUpdateService = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const { data: updated, error } = await supabase
                .from('services')
                .update(data)
                .eq('id', id)
                .select()
                .single()

            if (error) throw new Error(error.message)
            return updated
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['services'] })
        },
    })
}

// Hook para eliminar servicio (eliminación REAL)
export const useDeleteService = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('services')
                .delete()
                .eq('id', id)
            if (error) throw new Error(error.message)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['services'] })
        },
    })
}