import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
    children: ReactNode
    requiredRole?: ('Admin' | 'Manager' | 'Technician')[]  // Roles permitidos
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
    const { user, profile, loading, isCreatingUser } = useAuth()  // ✅ AGREGADO isCreatingUser
    const location = useLocation()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Verificando sesión...</p>
                </div>
            </div>
        )
    }

    // ✅ Si NO hay usuario, redirigir al login
    if (!user) {
        return <Navigate to="/auth" state={{ from: location }} replace />
    }

    // ✅ NUEVO: Si estamos CREANDO usuario, permitir acceso sin verificar rol
    // Esto evita redirecciones durante la creación de usuarios desde AdminDashboard
    if (isCreatingUser) {
        return <>{children}</>
    }

    // ✅ Normalizar el rol del usuario (primera letra mayúscula)
    const userRole = profile?.role 
        ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1).toLowerCase() 
        : null;

    // ✅ Normalizar los roles requeridos para comparación
    const normalizedRequiredRole = requiredRole?.map(role => 
        role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
    );

    // Verificar rol si se requiere
    if (requiredRole && userRole && normalizedRequiredRole && !normalizedRequiredRole.includes(userRole)) {
        // Redirigir según el rol que SÍ tiene el usuario
        switch (userRole) {
            case 'Admin':
                return <Navigate to="/control-usuarios" replace />
            case 'Manager':
                return <Navigate to="/gerencial" replace />
            case 'Technician':
                return <Navigate to="/dashboard" replace />
            default:
                return <Navigate to="/dashboard" replace />
        }
    }

    return <>{children}</>
}