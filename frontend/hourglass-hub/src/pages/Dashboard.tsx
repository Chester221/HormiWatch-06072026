import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { CheckSquare, Clock, FolderKanban, TrendingUp, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { LogTimeModal } from "@/components/tasks/LogTimeModal";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { useCreateTask } from "@/hooks/useTasks";
import { useServices } from "@/hooks/useServices";
import { toast } from "sonner";

const Dashboard = () => {
  const { user } = useAuth();
  const { data: tasks = [], isLoading: isLoadingTasks, refetch: refetchTasks } = useTasks();
  const { data: projects = [], isLoading: isLoadingProjects } = useProjects();
  const { data: services = [] } = useServices();
  const createTask = useCreateTask();

  const [logTimeModalOpen, setLogTimeModalOpen] = useState(false);
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);

  const handleLogTime = () => setLogTimeModalOpen(true);
  const handleNewTask = () => setCreateTaskModalOpen(true);
  const handleNewProject = () => toast.info("New Project - Funcionalidad en desarrollo");
  const handleAddMember = () => toast.info("Add Member - Funcionalidad en desarrollo");

  const handleCreateTask = (data: any) => {
    createTask.mutate(data, {
      onSuccess: () => {
        toast.success("Tarea creada correctamente");
        setLogTimeModalOpen(false);
        setCreateTaskModalOpen(false);
        refetchTasks();
      },
      onError: (error: any) => {
        toast.error(`Error: ${error.message}`);
      }
    });
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';

  const tareasCount = tasks.length;
  const proyectosCount = projects.length;

  const horasTotal = tasks.reduce((acc, task) => {
    if (task.start_time && task.end_time) {
      const start = new Date(task.start_time).getTime();
      const end = new Date(task.end_time).getTime();
      const hours = (end - start) / (1000 * 60 * 60);
      return acc + hours;
    }
    return acc;
  }, 0);

  const tareasCompletadas = tasks.filter(t => t.status === 'Completed').length;
  const isLoading = isLoadingTasks || isLoadingProjects;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {isLoading ? "Cargando..." : `¡Hola, ${userName}! 👋`}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Aquí tienes un resumen de lo que está pasando con tus proyectos hoy.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Tareas Registradas" value={tareasCount} subtitle="Total en el sistema" icon={CheckSquare} trend={{ value: 12, positive: true }} delay={100} />
            <MetricCard title="Horas Registradas" value={`${horasTotal.toFixed(1)}h`} subtitle="Tiempo total invertido" icon={Clock} trend={{ value: 8, positive: true }} delay={150} />
            <MetricCard title="Proyectos" value={proyectosCount} subtitle="Total registrados" icon={FolderKanban} trend={{ value: 2, positive: true }} delay={200} />
            <MetricCard title="Tareas Completadas" value={tareasCompletadas} subtitle="Historial de éxito" icon={TrendingUp} trend={{ value: 5, positive: true }} delay={250} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ActivityFeed />
            </div>
            <div>
              <QuickActions
                onLogTime={handleLogTime}
                onNewTask={handleNewTask}
                onNewProject={handleNewProject}
                onAddMember={handleAddMember}
              />
            </div>
          </div>
        </>
      )}

      {/* Modales */}
      <LogTimeModal open={logTimeModalOpen} onOpenChange={setLogTimeModalOpen} projects={projects} onSubmit={handleCreateTask} />
      <CreateTaskModal open={createTaskModalOpen} onOpenChange={setCreateTaskModalOpen} projects={projects} services={services} onSuccess={() => { refetchTasks(); setCreateTaskModalOpen(false); }} />
    </DashboardLayout>
  );
};

export default Dashboard;