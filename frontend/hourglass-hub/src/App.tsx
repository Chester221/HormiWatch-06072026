import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import TechnicianDashboard from "./pages/TechnicianDashboard";  
import ManagerDashboard from "./pages/Manager/DashboardMG";   
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import Clients from "./pages/Clients";
import Team from "./pages/Team";
import Services from "./pages/Services";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import Holidays from "./pages/Holidays";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";
import AdminDashboard from "@/pages/Admin/AdminDashboard";

const queryClient = new QueryClient();

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

// Componente para manejar errores globales de autenticación
const AuthErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const { error, refreshProfile } = useAuth();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
        <h2 className="text-2xl font-bold text-destructive mb-2">Error de Conexión</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          {error}
        </p>
        <Button onClick={() => window.location.reload()} variant="default">
          Reintentar
        </Button>
        <Button
          onClick={refreshProfile}
          variant="outline"
          className="mt-2"
        >
          Intentar reconectar sesión
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};

// ✅ Componente para redirigir según el rol al dashboard principal
const RoleBasedDashboard = () => {
  const { profile, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  
  // ✅ Normalizar rol (primera letra mayúscula)
  const rawRole = profile?.role;
  const role = rawRole ? rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase() : null;
  
  console.log("🔍 Rol detectado:", role);

  // Redirigir según el rol
  if (role === 'Manager') {
    return <Navigate to="/gerencial" replace />;
  }
  if (role === 'Admin') {
    return <Navigate to="/control-usuarios" replace />;
  }
  // Technician o cualquier otro → Dashboard técnico
  return <Navigate to="/dashboard" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <AuthErrorBoundary>
            <Routes>
              {/* Ruta pública - Login/Registro */}
              <Route path="/auth" element={<Auth />} />

              {/* ✅ Ruta principal - Redirige según el rol */}
              <Route path="/" element={<RoleBasedDashboard />} />

              {/* ✅ Dashboard de Técnicos */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <TechnicianDashboard />
                </ProtectedRoute>
              } />

              {/* ✅ Dashboard Gerencial (solo Manager) */}
              <Route path="/gerencial" element={
                <ProtectedRoute requiredRole={['Manager']}>
                  <ManagerDashboard />
                </ProtectedRoute>
              } />

              {/* Rutas para todos los autenticados */}
              <Route path="/tasks" element={
                <ProtectedRoute>
                  <Tasks />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />

              {/* ✅ Proyectos - También para Técnicos (solo lectura) */}
              <Route path="/projects" element={
                <ProtectedRoute requiredRole={['Manager', 'Admin', 'Technician']}>
                  <Projects />
                </ProtectedRoute>
              } />

              {/* ✅ Clientes - Solo Manager y Admin */}
              <Route path="/clients" element={
                <ProtectedRoute requiredRole={['Manager', 'Admin']}>
                  <Clients />
                </ProtectedRoute>
              } />

              {/* ✅ Equipo - Solo Manager y Admin */}
              <Route path="/team" element={
                <ProtectedRoute requiredRole={['Manager', 'Admin']}>
                  <Team />
                </ProtectedRoute>
              } />

              {/* ✅ Servicios - También para Técnicos */}
              <Route path="/services" element={
                <ProtectedRoute requiredRole={['Manager', 'Admin', 'Technician']}>
                  <Services />
                </ProtectedRoute>
              } />

              {/* ✅ Feriados - Solo Manager y Admin */}
              <Route path="/holidays" element={
                <ProtectedRoute requiredRole={['Manager', 'Admin']}>
                  <Holidays />
                </ProtectedRoute>
              } />

              {/* ✅ Reportes - Solo Manager y Admin */}
              <Route path="/reports" element={
                <ProtectedRoute requiredRole={['Manager', 'Admin']}>
                  <Reports />
                </ProtectedRoute>
              } />

              {/* ✅ Ruta exclusiva para Administrador */}
              <Route path="/control-usuarios" element={
                <ProtectedRoute requiredRole={['Admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />

              {/* Ruta 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthErrorBoundary>
        </HashRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;