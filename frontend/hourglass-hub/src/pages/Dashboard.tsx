import { useState, useMemo } from "react";
import { format, subDays, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { Button } from "@/components/ui/button";
import { CheckSquare, Clock, FolderKanban, TrendingUp, Loader2, AlertTriangle, RefreshCw, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks, useCreateTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { AddUserModal } from "@/components/team/AddUserModal";
import { ManageMemberModal } from "@/components/team/ManageMemberModal";
import { CreateServiceModal } from "@/components/services/CreateServiceModal";
import { useServices } from "@/hooks/useServices";
import { useHolidays } from "@/hooks/useHolidays";
import { calculateTaskBreakdown } from "@/lib/hoursCalculator";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

// Helper para obtener el rango de fechas
const getWeekRanges = () => {
  const today = new Date();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const lastWeekStart = subDays(currentWeekStart, 7);
  const lastWeekEnd = subDays(currentWeekEnd, 7);
  return { currentWeekStart, currentWeekEnd, lastWeekStart, lastWeekEnd };
};

const TechnicianDashboard = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const userRole = profile?.role;
  const isTechnician = userRole === 'Technician';
  const isManager = userRole === 'Manager';
  const isAdmin = userRole === 'Admin';

  // ✅ Solo Técnicos pueden ver este dashboard
  if (!isTechnician) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 mb-4">
            <Shield className="h-10 w-10 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Acceso Restringido</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Este dashboard es exclusivo para Técnicos.
            <br />
            {isManager && "Como Manager, usa el Dashboard Gerencial."}
            {isAdmin && "Como Administrador, ve a Control de Usuarios."}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const { data: allTasks = [], isLoading: isLoadingTasks, error: tasksError, refetch: refetchTasks } = useTasks();
  const { data: allProjects = [], isLoading: isLoadingProjects, error: projectsError, refetch: refetchProjects } = useProjects();
  const { data: services = [] } = useServices();
  const { holidays } = useHolidays();
  const createTasksMutation = useCreateTasks();

  // ✅ Filtrar SOLO las tareas del técnico actual
  const tasks = useMemo(() => {
    return allTasks.filter((task: any) => task.technician_id === user?.id);
  }, [allTasks, user?.id]);

  // ✅ Filtrar SOLO los proyectos donde el técnico está asignado
  const projects = useMemo(() => {
    return allProjects.filter((project: any) => {
      return project.members?.some((m: any) => m.id === user?.id) || 
             project.technician_id === user?.id ||
             project.project_leader_id === user?.id;
    });
  }, [allProjects, user?.id]);

  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [manageMemberModalOpen, setManageMemberModalOpen] = useState(false);
  const [createServiceModalOpen, setCreateServiceModalOpen] = useState(false);

  const handleNewTask = () => setCreateTaskModalOpen(true);
  const handleNewProject = () => setCreateProjectModalOpen(true);
  const handleAddUser = () => setAddUserModalOpen(true);
  const handleManageMember = () => setManageMemberModalOpen(true);
  const handleNewService = () => setCreateServiceModalOpen(true);

  const handleCreateTask = async (data: any) => {
    if (!user) return toast.error("Debes iniciar sesión");
    if (!data.projectId) return toast.error("Selecciona un proyecto");
    if (!data.serviceId) return toast.error("Selecciona un servicio");

    const dateStr = format(data.date, "yyyy-MM-dd");
    const start_time = new Date(`${dateStr}T${data.startTime}:00`).toISOString();
    let end_time: string;
    if (data.endTime <= data.startTime) {
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
        setCreateTaskModalOpen(false);
        refetchTasks();
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      },
      onError: (error: any) => {
        toast.error(`Error al crear tarea: ${error.message}`);
      },
    });
  };

  // 📊 Calcular métricas SOLO para el técnico
  const metrics = useMemo(() => {
    const { currentWeekStart, currentWeekEnd, lastWeekStart, lastWeekEnd } = getWeekRanges();
    
    const currentWeekTasks = tasks.filter((task: any) => {
      const taskDate = new Date(task.start_time || task.created_at);
      return isWithinInterval(taskDate, { start: currentWeekStart, end: currentWeekEnd });
    });
    
    const lastWeekTasks = tasks.filter((task: any) => {
      const taskDate = new Date(task.start_time || task.created_at);
      return isWithinInterval(taskDate, { start: lastWeekStart, end: lastWeekEnd });
    });
    
    const currentWeekHours = currentWeekTasks.reduce((acc: number, task: any) => {
      if (task.duration_in_minutes) return acc + (task.duration_in_minutes / 60);
      if (task.start_time && task.end_time) {
        return acc + Math.abs(new Date(task.end_time).getTime() - new Date(task.start_time).getTime()) / 3600000;
      }
      return acc + ((task.normal_hours || 0) + (task.overtime_hours || 0));
    }, 0);
    
    const lastWeekHours = lastWeekTasks.reduce((acc: number, task: any) => {
      if (task.duration_in_minutes) return acc + (task.duration_in_minutes / 60);
      if (task.start_time && task.end_time) {
        return acc + Math.abs(new Date(task.end_time).getTime() - new Date(task.start_time).getTime()) / 3600000;
      }
      return acc + ((task.normal_hours || 0) + (task.overtime_hours || 0));
    }, 0);
    
    const tareasCount = tasks.length;
    const tareasCompletadas = tasks.filter((t: any) => t.status === 'Completed').length;
    const tareasPendientes = tasks.filter((t: any) => t.status === 'Pending').length;
    const horasTotal = tasks.reduce((acc: number, task: any) => {
      if (task.duration_in_minutes) return acc + (task.duration_in_minutes / 60);
      if (task.start_time && task.end_time) {
        return acc + Math.abs(new Date(task.end_time).getTime() - new Date(task.start_time).getTime()) / 3600000;
      }
      return acc + ((task.normal_hours || 0) + (task.overtime_hours || 0));
    }, 0);
    const completionRate = tareasCount > 0 ? Math.round((tareasCompletadas / tareasCount) * 100) : 0;
    
    const tareasTrendValue = lastWeekTasks.length === 0 ? 0 : Math.round(((currentWeekTasks.length - lastWeekTasks.length) / lastWeekTasks.length) * 100);
    const horasTrendValue = lastWeekHours === 0 ? 0 : Math.round(((currentWeekHours - lastWeekHours) / lastWeekHours) * 100);
    
    return {
      tareas: {
        count: tareasCount,
        completed: tareasCompletadas,
        pending: tareasPendientes,
        trend: { value: Math.abs(tareasTrendValue), positive: tareasTrendValue >= 0 }
      },
      horas: {
        total: horasTotal,
        trend: { value: Math.abs(horasTrendValue), positive: horasTrendValue >= 0 }
      },
      proyectos: { count: projects.length, trend: { value: 0, positive: true } },
      completitud: {
        rate: completionRate,
        completed: tareasCompletadas,
        total: tareasCount,
        trend: { value: 0, positive: true }
      }
    };
  }, [tasks, projects]);

  const userName = profile?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const isLoading = isLoadingTasks || isLoadingProjects;
  const hasError = tasksError || projectsError;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {isLoading ? "Cargando..." : `Hola, ${userName}.`}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {(() => {
            const pendingCount = metrics.tareas.pending;
            if (pendingCount === 0) return "Todas tus tareas están completadas. Buen trabajo.";
            if (pendingCount === 1) return "Tienes 1 tarea pendiente por completar.";
            return `Tienes ${pendingCount} tareas pendientes por completar.`;
          })()}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : hasError ? (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500 mb-3" />
          <p className="text-foreground font-medium mb-1">Error al cargar los datos</p>
          <p className="text-sm text-muted-foreground mb-4">No se pudo conectar con el servidor</p>
          <Button variant="outline" size="sm" onClick={() => { refetchTasks(); refetchProjects(); }} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Reintentar
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Mis Tareas"
              value={metrics.tareas.count}
              subtitle={`${metrics.tareas.completed} completadas · ${metrics.tareas.pending} pendientes`}
              icon={CheckSquare}
              trend={metrics.tareas.trend}
              delay={100}
            />
            <MetricCard
              title="Mis Horas"
              value={`${metrics.horas.total.toFixed(1)}h`}
              subtitle="Tiempo total invertido"
              icon={Clock}
              trend={metrics.horas.trend}
              delay={150}
            />
            <MetricCard
              title="Mis Proyectos"
              value={metrics.proyectos.count}
              subtitle="Proyectos asignados"
              icon={FolderKanban}
              trend={metrics.proyectos.trend}
              delay={200}
            />
            <MetricCard
              title="Mi Completitud"
              value={`${metrics.completitud.rate}%`}
              subtitle={`${metrics.completitud.completed} de ${metrics.completitud.total} tareas`}
              icon={TrendingUp}
              trend={metrics.completitud.trend}
              delay={250}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ActivityFeed />
            </div>
            <div>
              <QuickActions
                onNewTask={handleNewTask}
                onNewProject={handleNewProject}
                onAddUser={handleAddUser}
                onManageMember={handleManageMember}
                onNewService={handleNewService}
              />
            </div>
          </div>
        </>
      )}

      <CreateTaskModal
        open={createTaskModalOpen}
        onOpenChange={(open) => setCreateTaskModalOpen(open)}
        projects={projects}
        services={services}
        onSuccess={() => { refetchTasks(); setCreateTaskModalOpen(false); }}
      />
      <CreateProjectModal
        open={createProjectModalOpen}
        onOpenChange={(open) => setCreateProjectModalOpen(open)}
        onSuccess={() => { refetchProjects(); setCreateProjectModalOpen(false); }}
      />
      <AddUserModal
        open={addUserModalOpen}
        onOpenChange={setAddUserModalOpen}
        onSuccess={() => { setAddUserModalOpen(false); }}
      />
      <ManageMemberModal
        open={manageMemberModalOpen}
        onOpenChange={setManageMemberModalOpen}
        onSuccess={() => { setManageMemberModalOpen(false); queryClient.invalidateQueries({ queryKey: ['team_members'] }); }}
      />
      <CreateServiceModal
        open={createServiceModalOpen}
        onOpenChange={(open) => setCreateServiceModalOpen(open)}
        onSuccess={() => { setCreateServiceModalOpen(false); }}
      />
    </DashboardLayout>
  );
};

export default TechnicianDashboard;