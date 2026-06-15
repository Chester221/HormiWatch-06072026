import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
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
import { Button } from "@/components/ui/button";

const queryClient = new QueryClient();

// Componente para manejar errores globales de autenticación
const AuthErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const { error, refreshProfile } = useAuth();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
        <h2 className="text-2xl font-bold text-destructive mb-2">Error de Conexión</h2>
        <p className="text-muted-foreground mb-6 max-w-md">{error}</p>
        <Button onClick={() => window.location.reload()} variant="default">
          Reintentar
        </Button>
        <Button onClick={refreshProfile} variant="outline" className="mt-2">
          Intentar reconectar sesión
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};

// Componente para redirigir según el rol al dashboard principal
const RoleBasedDashboard = () => {
  const { profile, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  
  const rawRole = profile?.role;
  const role = rawRole ? rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase() : null;
  
  if (role === 'Manager') return <Navigate to="/gerencial" replace />;
  if (role === 'Admin') return <Navigate to="/control-usuarios" replace />;
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
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<RoleBasedDashboard />} />
              <Route path="/dashboard" element={
                <ProtectedRoute><TechnicianDashboard /></ProtectedRoute>
              } />
              <Route path="/gerencial" element={
                <ProtectedRoute requiredRole={['Manager']}><ManagerDashboard /></ProtectedRoute>
              } />
              <Route path="/tasks" element={
                <ProtectedRoute><Tasks /></ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute><Profile /></ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute><Settings /></ProtectedRoute>
              } />
              <Route path="/projects" element={
                <ProtectedRoute requiredRole={['Manager', 'Admin', 'Technician']}><Projects /></ProtectedRoute>
              } />
              <Route path="/clients" element={
                <ProtectedRoute requiredRole={['Manager', 'Admin']}><Clients /></ProtectedRoute>
              } />
              <Route path="/team" element={
                <ProtectedRoute requiredRole={['Manager', 'Admin']}><Team /></ProtectedRoute>
              } />
              <Route path="/services" element={
                <ProtectedRoute requiredRole={['Manager', 'Admin', 'Technician']}><Services /></ProtectedRoute>
              } />
              <Route path="/holidays" element={
                <ProtectedRoute requiredRole={['Manager', 'Admin']}><Holidays /></ProtectedRoute>
              } />
              <Route path="/reports" element={
                <ProtectedRoute requiredRole={['Manager', 'Admin']}><Reports /></ProtectedRoute>
              } />
              <Route path="/control-usuarios" element={
                <ProtectedRoute requiredRole={['Admin']}><AdminDashboard /></ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthErrorBoundary>
        </HashRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;