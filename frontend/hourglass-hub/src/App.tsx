import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthErrorBoundary>
          <BrowserRouter>
            <Routes>
              {/* Ruta pública - Login/Registro */}
              <Route path="/auth" element={<Auth />} />

              {/* Rutas protegidas - Disponibles para todos los usuarios autenticados */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
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

              {/* Rutas protegidas - Principalmente para líderes (pero accesibles) */}
              {/* La lógica de mostrar/ocultar está en el Sidebar */}
              {/* Los técnicos pueden acceder si conocen la URL, pero verán datos limitados */}
              <Route path="/projects" element={
  <ProtectedRoute requiredRole={['Manager', 'Admin']}>
    <Projects />
  </ProtectedRoute>
} />
<Route path="/clients" element={
  <ProtectedRoute requiredRole={['Manager', 'Admin']}>
    <Clients />
  </ProtectedRoute>
} />
<Route path="/team" element={
  <ProtectedRoute requiredRole={['Manager', 'Admin']}>
    <Team />
  </ProtectedRoute>
} />
<Route path="/services" element={
  <ProtectedRoute requiredRole={['Manager', 'Admin']}>
    <Services />
  </ProtectedRoute>
} />
<Route path="/holidays" element={
  <ProtectedRoute requiredRole={['Manager', 'Admin']}>
    <Holidays />
  </ProtectedRoute>
} />
<Route path="/reports" element={
  <ProtectedRoute requiredRole={['Manager', 'Admin']}>
    <Reports />
  </ProtectedRoute>
} />
 

              {/* Ruta 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthErrorBoundary>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;