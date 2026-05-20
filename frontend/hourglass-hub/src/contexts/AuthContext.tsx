import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

// Tipos de roles - coinciden con la base de datos
export type UserRole = 'Technician' | 'Manager' | 'Admin' | 'Viewer'

// Tipo del perfil del usuario
export interface UserProfile {
    id: string
    full_name: string | null
    avatar_url: string | null
    email: string | null
    role: UserRole
    email_notifications?: boolean
    task_reminders?: boolean
    weekly_summary?: boolean
    created_at?: string
    updated_at?: string
}

interface AuthContextType {
    user: User | null
    session: Session | null
    profile: UserProfile | null
    loading: boolean
    isManager: boolean
    error: string | null // Nuevo campo para errores críticos
    signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
    signUp: (email: string, password: string, metadata?: { full_name?: string }) => Promise<{ error: AuthError | null }>
    signOut: () => Promise<void>
    updateProfile: (updates: Partial<Pick<UserProfile, 'full_name' | 'avatar_url'>>) => Promise<{ error: Error | null }>
    uploadAvatar: (file: File) => Promise<{ url: string | null; error: Error | null }>
    refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [authError, setAuthError] = useState<string | null>(null)

    // Helper para verificar si es Manager (puede gestionar proyectos y equipo)
    const isManager = profile?.role === 'Manager' || profile?.role === 'Admin'

    // Obtener perfil del usuario
    const fetchProfile = useCallback(async (userId: string, userData?: User): Promise<UserProfile | null> => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (error) {
                // SOLO si no existe el perfil (código PGRST116), intentamos crearlo
                if (error.code === 'PGRST116' && userData) {
                    console.log('Perfil no encontrado, creando uno nuevo...');
                    const newProfile = {
                        id: userId,
                        email: userData.email,
                        full_name: userData.user_metadata?.full_name || userData.email?.split('@')[0],
                        avatar_url: userData.user_metadata?.avatar_url,
                        role: 'Viewer' as UserRole, // Viewer por defecto (solo ver)
                        updated_at: new Date().toISOString(),
                    };

                    const { data: createdProfile, error: createError } = await (supabase as any)
                        .from('profiles')
                        .insert(newProfile)
                        .select()
                        .single();

                    if (createError) {
                        console.error('Error FATAL creando perfil automático:', createError);
                        throw new Error(`No se pudo crear tu perfil: ${createError.message}`);
                    }

                    return createdProfile as UserProfile;
                }

                // Cualquier otro error es crítico (conexión, permisos, etc.)
                throw error;
            }

            return data as UserProfile
        } catch (err: any) {
            console.error('Error crítico en fetchProfile:', err)
            throw err; // Propagar error para que la UI lo maneje
        }
    }, [])

    // Función unificada de inicialización
    const initializeAuth = useCallback(async () => {
        try {
            setLoading(true);
            setAuthError(null);

            // 1. Obtener sesión actual
            const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) throw sessionError;

            setSession(currentSession);
            setUser(currentSession?.user ?? null);

            // 2. Si hay usuario, FORZAR carga de perfil
            if (currentSession?.user) {
                try {
                    const profileData = await fetchProfile(currentSession.user.id, currentSession.user);
                    setProfile(profileData);
                } catch (profileErr: any) {
                    // Si falla el perfil, fallamos todo el auth state para no dejar entrar con permisos parciales
                    console.error("Fallo carga de perfil, bloqueando acceso");
                    setAuthError(`Error cargando tu perfil: ${profileErr.message || 'Error desconocido'}`);
                    setProfile(null);
                }
            } else {
                setProfile(null);
            }

        } catch (err: any) {
            console.error('Error inicializando auth:', err);
            setAuthError(`Error de conexión: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [fetchProfile]);

    useEffect(() => {
        // Carga inicial
        initializeAuth();

        // Suscripción a cambios
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                console.log("Auth Event:", event);

                if (event === 'SIGNED_OUT') {
                    setSession(null);
                    setUser(null);
                    setProfile(null);
                    setLoading(false);
                } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    // Recargar todo limpiamente
                    initializeAuth();
                } else if (event === 'INITIAL_SESSION') {
                    // Ya manejado por initializeAuth, pero por si acaso
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, [initializeAuth]);

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        return { error }
    }

    const signUp = async (email: string, password: string, metadata?: { full_name?: string }) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata,
            },
        })
        return { error }
    }

    const signOut = async () => {
        await supabase.auth.signOut()
        setProfile(null)
        setUser(null)
        setSession(null)
        // Limpiar localStorage de datos antiguos del sistema anterior
        localStorage.removeItem('id_usuario')
        localStorage.removeItem('nombre_usuario')
        localStorage.removeItem('authToken')
    }

    // Actualizar perfil
    const updateProfile = async (updates: Partial<Pick<UserProfile, 'full_name' | 'avatar_url'>>) => {
        if (!user) return { error: new Error('No hay usuario autenticado') }

        try {
            // Intentar actualizar en la base de datos
            const client = supabase as any
            const result = await client
                .from('profiles')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id)

            if (result.error) {
                console.warn('Error updating profile in DB:', result.error.message)
            }

            // Actualizar estado local de todas formas
            setProfile(prev => prev ? { ...prev, ...updates } : null)

            return { error: null }
        } catch (err) {
            // Actualizar localmente aunque falle la DB
            setProfile(prev => prev ? { ...prev, ...updates } : null)
            return { error: null }
        }
    }

    // Subir avatar a Supabase Storage
    const uploadAvatar = async (file: File): Promise<{ url: string | null; error: Error | null }> => {
        if (!user) return { url: null, error: new Error('No hay usuario autenticado') }

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}-${Date.now()}.${fileExt}`
            const filePath = fileName // Sin subcarpeta, directo al bucket

            // Intentar subir al bucket 'avatars'
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true })

            if (uploadError) {
                // Si el bucket no existe, mostrar mensaje amigable
                if (uploadError.message.includes('Bucket not found')) {
                    console.warn('Bucket "avatars" no existe. Crea el bucket en Supabase Dashboard > Storage.')
                    return {
                        url: null,
                        error: new Error('El almacenamiento de avatares no está configurado. Contacta al administrador.')
                    }
                }
                console.error('Error uploading avatar:', uploadError)
                return { url: null, error: new Error(uploadError.message) }
            }

            // Obtener URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            // Actualizar perfil con la nueva URL
            await updateProfile({ avatar_url: publicUrl })

            return { url: publicUrl, error: null }
        } catch (err) {
            return { url: null, error: err as Error }
        }
    }

    // Actualizar preferencias de notificaciones
const updatePreferences = async (prefs: Partial<UserProfile>) => {
    if (!user) return { error: new Error('No autenticado') }
    const { error } = await supabase
        .from('profiles')
        .update(prefs)
        .eq('id', user.id)
    if (!error) {
        setProfile(prev => prev ? { ...prev, ...prefs } : null)
    }
    return { error }
}

    const value = {
    user,
    session,
    profile,
    loading,
    isManager,
    error: authError,
    signIn,
    signUp,
    signOut,
    updateProfile,
    uploadAvatar,
    refreshProfile: initializeAuth,
    updatePreferences, // ← AGREGAR ESTA LÍNEA
}

    // UI de Bloqueo por Error Crítico en Auth
    if (authError && !loading) {
        // Opcional: Renderizar pantalla de error aquí, o dejar que App lo maneje.
        // Por ahora, dejamos que children renderice, pero App debería chequear useAuth().error
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
