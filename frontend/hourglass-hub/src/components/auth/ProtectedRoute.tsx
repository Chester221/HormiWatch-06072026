import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2, ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProtectedRouteProps {
    children: ReactNode
    requiredRole?: ('Admin' | 'Manager' | 'Technician')[]  // Roles permitidos
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
    const { user, profile, loading } = useAuth()
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

    if (!user) {
        return <Navigate to="/auth" state={{ from: location }} replace />
    }

    // Verificar rol si se requiere
    if (requiredRole && profile && !requiredRole.includes(profile.role)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4 text-center max-w-md p-8">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                        <ShieldOff className="h-8 w-8 text-destructive" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">Acceso Restringido</h2>
                    <p className="text-muted-foreground">
                        No tienes permisos para acceder a esta sección. 
                        Se requiere rol: <strong>{requiredRole.join(' o ')}</strong>.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Tu rol actual: <strong>{profile?.role || 'Desconocido'}</strong>
                    </p>
                    <Button onClick={() => window.history.back()} variant="outline" className="mt-2">
                        Volver atrás
                    </Button>
                </div>
            </div>
        )
    }

    return <>{children}</>
}