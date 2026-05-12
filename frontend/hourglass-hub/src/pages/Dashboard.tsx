import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold text-foreground">¡Hola, {userName}! 👋</h1>
        <p className="text-muted-foreground mt-2">Bienvenido a Hormiwatch. El dashboard está en construcción.</p>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;