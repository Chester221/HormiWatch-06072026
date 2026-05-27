import { useState } from "react";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { CheckSquare, Clock, FolderKanban, TrendingUp, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks, useCreateTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { LogTimeModal } from "@/components/tasks/LogTimeModal";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { AddMemberModal } from "@/components/team/AddMemberModal";
import { useServices } from "@/hooks/useServices";
import { useHolidays } from "@/hooks/useHolidays";
import { calculateTaskBreakdown } from "@/lib/hoursCalculator";
import { toast } from "sonner";

const Dashboard = () => {
  const { user, profile } = useAuth();
  const { data: tasks = [], isLoading: isLoadingTasks, refetch: refetchTasks } = useTasks();
  const { data: projects = [], isLoading: isLoadingProjects, refetch: refetchProjects } = useProjects();
  const { data: services = [] } = useServices();
  const { holidays } = useHolidays();
  const createTasksMutation = useCreateTasks();

  const [logTimeModalOpen, setLogTimeModalOpen] = useState(false);
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);

  const handleLogTime = () => setLogTimeModalOpen(true);
  const handleNewTask = () => setCreateTaskModalOpen(true);
  const handleNewProject = () => setCreateProjectModalOpen(true);
  const handleAddMember = () => setAddMemberModalOpen(true);

  const handleCreateTask = async (data: any) => {
    if (!user) return toast.error("Debes iniciar sesión");

    const dateStr = format(data.date, "yyyy-MM-dd");
    const startHour = parseInt(data.startTime.split(':')[0]);
    const endHour = parseInt(data.endTime.split(':')[0]);
    const isNextDay = endHour < startHour;

    const start_time = new Date(`${dateStr}T${data.startTime}:00`).toISOString();
    let end_time: string;
    if (isNextDay) {
      const nextDay = new Date(data.date);
      nextDay.setDate(nextDay.getDate() + 1);
      end_time = new Date(`${format(nextDay, "yyyy-MM-dd")}T${data.endTime}:00`).toISOString();
    } else {
      end_time = new Date(`${dateStr}T${data.endTime}:00`).toISOString();
    }

    const selectedService = services?.find((s: any) => s.id === data.serviceId);
    const hourlyRate = selectedService?.default_hourly_rate || 0;
    const holidaysList = (holidays.data || []).filter((h: any) => !h.is_working_day).map((h: any) => h.date);
    const breakdown = calculateTaskBreakdown(start_time, end_time, hourlyRate, holidaysList);

    const tasksToCreate = breakdown.days.map((day: any) => ({
      project_id: data.projectId,
      service_id: data.serviceId,
      technician_id: user.id,
      start_time: `${day.date}T${data.startTime}:00`,
      end_time: `${day.date}T${data.endTime}:00`,
      description: data.motivo ? `[${data.motivo}] ${data.description || ''}` : data.description,
      status: data.completed ? 'Completed' : 'Pending',
      priority: 'Medium',
      applied_hourly_rate: hourlyRate,
      normal_hours: day.normalHours,
      overtime_hours: day.overtimeHours,
      normal_pay: day.normalPay,
      overtime_pay: day.overtimePay,
      total_pay: day.totalPay,
    }));

    createTasksMutation.mutate(tasksToCreate, {
      onSuccess: () => {
        toast.success("Tarea registrada correctamente");
        setLogTimeModalOpen(false);
        setCreateTaskModalOpen(false);
        refetchTasks();
      },
      onError: (error: any) => {
        toast.error(`Error al crear tarea: ${error.message}`);
      },
    });
  };

  const userName = profile?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const tareasCount = tasks.length;
  const proyectosCount = projects.length;

  const horasTotal = tasks.reduce((acc: number, task: any) => {
    if (task.start_time && task.end_time) {
      return acc + (new Date(task.end_time).getTime() - new Date(task.start_time).getTime()) / 3600000;
    }
    return acc;
  }, 0);

  const tareasCompletadas = tasks.filter((t: any) => t.status === 'Completed').length;
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

      <LogTimeModal open={logTimeModalOpen} onOpenChange={setLogTimeModalOpen} projects={projects} onSubmit={handleCreateTask} />
      <CreateTaskModal open={createTaskModalOpen} onOpenChange={setCreateTaskModalOpen} projects={projects} services={services} onSuccess={() => { refetchTasks(); setCreateTaskModalOpen(false); }} />
      <CreateProjectModal open={createProjectModalOpen} onOpenChange={setCreateProjectModalOpen} onSuccess={() => { refetchProjects(); setCreateProjectModalOpen(false); }} />
      <AddMemberModal open={addMemberModalOpen} onOpenChange={setAddMemberModalOpen} onSuccess={() => setAddMemberModalOpen(false)} />
    </DashboardLayout>
  );
};

export default Dashboard;