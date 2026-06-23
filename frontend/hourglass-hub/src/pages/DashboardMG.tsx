import { useState, useMemo } from "react";
import { format, subDays, startOfWeek, endOfWeek, isWithinInterval, differenceInDays } from "date-fns";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricCardMG } from "@/components/DashboardMG/MetricCardMG";
import { ActivityFeedMG } from "@/components/DashboardMG/ActivityFeedMG";
import { Button } from "@/components/ui/button";
import {
  Clock, FolderKanban, Loader2,
  AlertTriangle, RefreshCw, Shield, Building2, CheckSquare,
  Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks, useCreateTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { useClientsWithContacts } from "@/hooks/useClientes";
import { useServices } from "@/hooks/useServices";
import { useHolidays } from "@/hooks/useHolidays";
import { useTechnicians } from "@/hooks/useTeamMembers";
import { calculateTaskBreakdown } from "@/lib/hoursCalculator";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

import TechnicianDetailsModal from "@/components/DashboardMG/TechnicianDetailsModal";
import ClientDetailsModal from "@/components/clients/ClientDetailsModal";
import AllClientsModal from "@/components/clients/AllClientsModal";

import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { ManageMemberModal } from "@/components/team/ManageMemberModal";
import { CreateServiceModal } from "@/components/services/CreateServiceModal";

const getWeekRanges = () => {
  const today = new Date();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const lastWeekStart = subDays(currentWeekStart, 7);
  const lastWeekEnd = subDays(currentWeekEnd, 7);
  return { currentWeekStart, currentWeekEnd, lastWeekStart, lastWeekEnd };
};

const CLIENT_COLORS = [
  "#3b82f6", "#6366f1", "#8b5cf6", "#06b6d4", "#14b8a6",
  "#10b981", "#f59e0b", "#f97316", "#ec4899", "#64748b",
];

const DashboardMG = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const userRole = profile?.role;
  const isManager = userRole === "Manager";

  if (!isManager) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring" }}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 mb-4"
          >
            <Shield className="h-10 w-10 text-amber-500" />
          </motion.div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Acceso Restringido</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Este apartado es exclusivo para usuarios con rol de Manager.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const {
    data: tasks = [],
    isLoading: isLoadingTasks,
    error: tasksError,
    refetch: refetchTasks,
  } = useTasks();
  const {
    data: projects = [],
    isLoading: isLoadingProjects,
    error: projectsError,
    refetch: refetchProjects,
  } = useProjects();
  const { data: clients = [] } = useClientsWithContacts();
  const { data: services = [] } = useServices();
  const { data: technicians = [] } = useTechnicians();
  const { holidays } = useHolidays();
  const createTasksMutation = useCreateTasks();

  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [manageMemberModalOpen, setManageMemberModalOpen] = useState(false);
  const [createServiceModalOpen, setCreateServiceModalOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<any>(null);
  const [techModalOpen, setTechModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [allClientsModalOpen, setAllClientsModalOpen] = useState(false);

  const handleViewAllClients = () => setAllClientsModalOpen(true);
  const handleNewTask = () => setCreateTaskModalOpen(true);
  const handleNewProject = () => setCreateProjectModalOpen(true);
  const handleManageMember = () => setManageMemberModalOpen(true);
  const handleNewService = () => setCreateServiceModalOpen(true);
  const handleRefresh = () => { refetchTasks(); refetchProjects(); };
  const handleViewTechnician = (tech: any) => {
    setSelectedTechnician(tech);
    setTechModalOpen(true);
  };
  const handleViewAllTechnicians = () => {};
  const handleViewClient = (client: any) => {
    setSelectedClient(client);
    setClientModalOpen(true);
  };

  const metrics = useMemo(() => {
    const { currentWeekStart, currentWeekEnd, lastWeekStart, lastWeekEnd } = getWeekRanges();
    const currentWeekTasks = tasks.filter((task: any) => isWithinInterval(new Date(task.start_time || task.created_at), { start: currentWeekStart, end: currentWeekEnd }));
    const lastWeekTasks = tasks.filter((task: any) => isWithinInterval(new Date(task.start_time || task.created_at), { start: lastWeekStart, end: lastWeekEnd }));
    const calculateHours = (taskList: any[]) => taskList.reduce((acc: number, task: any) => acc + (task.duration_in_minutes ? task.duration_in_minutes / 60 : (task.normal_hours || 0) + (task.overtime_hours || 0)), 0);
    const currentWeekHours = calculateHours(currentWeekTasks);
    const lastWeekHours = calculateHours(lastWeekTasks);
    const totalHours = calculateHours(tasks);
    const tareasCount = tasks.length;
    const tareasCompletadas = tasks.filter((t: any) => t.status === "Completed").length;
    const tareasPendientes = tasks.filter((t: any) => t.status === "Pending").length;
    const clientesAtendidosSet = new Set();
    tasks.forEach((task: any) => { const p = projects.find((pr: any) => pr.id === task.project_id); if (p?.clients?.name) clientesAtendidosSet.add(p.clients.name); });
    const proyectosActivos = projects.filter((p: any) => p.status !== "Completed").length;
    const proyectosAtrasados = projects.filter((p: any) => { const endDate = new Date(p.end_date); const pt = tasks.filter((t: any) => t.project_id === p.id); const comp = pt.filter((t: any) => t.status === "Completed").length; const prog = pt.length > 0 ? Math.round((comp / pt.length) * 100) : 0; return endDate < new Date() && prog < 100; }).length;
    const horasTrendValue = lastWeekHours === 0 ? (currentWeekHours > 0 ? 100 : 0) : Math.round(((currentWeekHours - lastWeekHours) / lastWeekHours) * 100);
    const tareasTrendValue = lastWeekTasks.length === 0 ? (currentWeekTasks.length > 0 ? 100 : 0) : Math.round(((currentWeekTasks.length - lastWeekTasks.length) / lastWeekTasks.length) * 100);
    return {
      horas: { total: totalHours, weekly: currentWeekHours, trend: { value: Math.abs(horasTrendValue), positive: horasTrendValue >= 0 } },
      proyectos: { count: projects.length, activos: proyectosActivos, atrasados: proyectosAtrasados, completados: projects.filter((p: any) => p.status === "Completed").length, trend: { value: 0, positive: true } },
      clientes: { atendidos: clientesAtendidosSet.size, total: clients.length },
      tareas: { count: tareasCount, completed: tareasCompletadas, pending: tareasPendientes, trend: { value: Math.abs(tareasTrendValue), positive: tareasTrendValue >= 0 } },
      equipo: { tecnicosActivos: new Set(currentWeekTasks.map((t: any) => t.technician_id)).size, totalTecnicos: new Set(tasks.map((t: any) => t.technician_id)).size },
    };
  }, [tasks, projects, clients]);

  const projectStatus = useMemo(() => {
    return projects.map((project: any) => {
      const projectTasks = tasks.filter((t: any) => t.project_id === project.id);
      const completed = projectTasks.filter((t: any) => t.status === "Completed").length;
      const inProgress = projectTasks.filter((t: any) => t.status === "InProgress").length;
      const total = projectTasks.length;
      const projectHours = projectTasks.reduce((acc: number, task: any) => acc + (task.duration_in_minutes ? task.duration_in_minutes / 60 : (task.normal_hours || 0) + (task.overtime_hours || 0)), 0);
      const progress = project.pool_hours > 0 
        ? Math.min(100, Math.round((projectHours / project.pool_hours) * 100))
        : (total > 0 ? Math.round((completed / total) * 100) : 0);
      const endDate = new Date(project.end_date);
      const startDate = new Date(project.start_date);
      const today = new Date();
      const isDelayed = endDate < today && progress < 100;
      const daysDelayed = isDelayed ? differenceInDays(today, endDate) : 0;
      const daysRemaining = !isDelayed ? differenceInDays(endDate, today) : 0;
      let status = "active";
      if (progress >= 100 || (project.pool_hours > 0 && projectHours >= project.pool_hours)) status = "completed";
      else if (isDelayed) status = "delayed";
      else if (inProgress > 0 || completed > 0) status = "in_progress";
      else status = "not_started";
      const clientName = project.clients?.name || "Sin Cliente";
      const teamMembers = projectTasks.map((t: any) => t.technician_id).filter((v: any, i: number, a: any[]) => a.indexOf(v) === i);
      return { id: project.id, name: project.name, client: clientName, progress, completed, pending: projectTasks.filter((t: any) => t.status === "Pending").length, inProgress, total, hours: projectHours, status, isDelayed, daysDelayed, daysRemaining, startDate: project.start_date, endDate: project.end_date, teamSize: teamMembers.length, clientId: project.client_id, project_leader_id: project.project_leader_id };
    }).sort((a, b) => { if (a.isDelayed && !b.isDelayed) return -1; if (!a.isDelayed && b.isDelayed) return 1; return b.progress - a.progress; });
  }, [projects, tasks]);

  const technicianPerformance = useMemo(() => {
    const { lastWeekStart, lastWeekEnd } = getWeekRanges();
    const techData: Record<string, any> = {};
    tasks.forEach((task: any) => {
      const techId = task.technician_id;
      const hours = task.duration_in_minutes ? task.duration_in_minutes / 60 : (task.normal_hours || 0) + (task.overtime_hours || 0);
      const taskDate = new Date(task.start_time || task.created_at);
      if (!techData[techId]) {
  const techInfo = technicians.find((t: any) => t.id === techId);
  techData[techId] = { 
    id: techId, 
    name: techInfo?.full_name || techInfo?.name || `Técnico ${techId.slice(0, 8)}`,
    avatar_url: techInfo?.avatar_url || null,
    email: techInfo?.email || "",
    hours: 0, 
    lastWeekHours: 0, 
    tasks: 0, 
    completedTasks: 0, 
    projects: new Set(), 
    trend: 0 
  };
}
      techData[techId].hours += hours;
      techData[techId].tasks += 1;
      if (task.status === "Completed") techData[techId].completedTasks += 1;
      if (task.project_id) techData[techId].projects.add(task.project_id);
      if (isWithinInterval(taskDate, { start: lastWeekStart, end: lastWeekEnd })) techData[techId].lastWeekHours += hours;
    });
    Object.values(techData).forEach((tech: any) => { tech.trend = tech.lastWeekHours > 0 ? Math.round(((tech.hours - tech.lastWeekHours) / tech.lastWeekHours) * 100) : tech.hours > 0 ? 100 : 0; tech.projectCount = tech.projects.size; });
    return Object.values(techData).sort((a: any, b: any) => b.hours - a.hours);
  }, [tasks, technicians]);


  // 🔥 MOVER monthTasks ANTES de hoursByClient
  const monthTasks = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return [...tasks]
      .filter((task: any) => {
        const taskDate = new Date(task.start_time || task.created_at);
        return taskDate >= startOfMonth && taskDate <= endOfMonth;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((task: any) => {
        const project = projects.find((p: any) => p.id === task.project_id);
        return { 
          ...task, 
          projectName: project?.name || "Sin proyecto", 
          clientName: project?.clients?.name || "Sin cliente", 
          hours: task.duration_in_minutes ? task.duration_in_minutes / 60 : (task.normal_hours || 0) + (task.overtime_hours || 0) 
        };
      });
  }, [tasks, projects]);

  // 🔥 hoursByClient AHORA DESPUÉS de monthTasks - SOLO TAREAS COMPLETADAS
  const hoursByClient = useMemo(() => {
    const clientHours: Record<string, { hours: number; projectCount: number }> = {};
    const projectSet: Record<string, Set<string>> = {};
    
    // SOLO TAREAS COMPLETADAS
    const completedTasks = monthTasks.filter((t: any) => t.status === "Completed");
    
    completedTasks.forEach((task: any) => {
      const clientName = task.clientName || "Sin cliente";
      const hours = task.hours || 0;
      
      if (!clientHours[clientName]) {
        clientHours[clientName] = { hours: 0, projectCount: 0 };
        projectSet[clientName] = new Set();
      }
      
      clientHours[clientName].hours += hours;
      if (task.project_id) {
        projectSet[clientName].add(task.project_id);
      }
    });
    
    const colorMap: Record<string, string> = {};
    let colorIndex = 0;
    
    return Object.entries(clientHours)
      .map(([name, data]) => {
        if (!colorMap[name]) {
          colorMap[name] = CLIENT_COLORS[colorIndex % CLIENT_COLORS.length];
          colorIndex++;
        }
        return {
          name,
          hours: data.hours,
          projectCount: projectSet[name]?.size || 0,
          color: colorMap[name],
        };
      })
      .sort((a, b) => b.hours - a.hours);
  }, [monthTasks]);

  const handleCreateTask = async (data: any) => {
    if (!user) return toast.error("Debes iniciar sesión");
    if (!data.projectId) return toast.error("Selecciona un proyecto");
    if (!data.serviceId) return toast.error("Selecciona un servicio");
    const dateStr = format(data.date, "yyyy-MM-dd");
    const start_time = new Date(`${dateStr}T${data.startTime}:00`).toISOString();
    let end_time: string;
    if (data.endTime <= data.startTime) { const nextDay = new Date(data.date); nextDay.setDate(nextDay.getDate() + 1); end_time = new Date(`${format(nextDay, "yyyy-MM-dd")}T${data.endTime}:00`).toISOString(); }
    else { end_time = new Date(`${dateStr}T${data.endTime}:00`).toISOString(); }
    const selectedService = services?.find((s: any) => s.id === data.serviceId);
    const hourlyRate = selectedService?.default_hourly_rate || 0;
    const holidaysList = (holidays.data || []).filter((h: any) => !h.is_working_day).map((h: any) => h.date);
    const breakdown = calculateTaskBreakdown(start_time, end_time, hourlyRate, holidaysList);
    const tasksToCreate = breakdown.days.map((day: any) => ({
      project_id: data.projectId, service_id: data.serviceId, technician_id: user.id,
      start_time: `${day.date}T${data.startTime}:00`, end_time: `${day.date}T${data.endTime}:00`,
      description: data.description, status: "Pending", priority: "Medium",
      applied_hourly_rate: hourlyRate, normal_hours: day.normalHours, overtime_hours: day.overtimeHours,
      normal_pay: day.normalPay, overtime_pay: day.overtimePay, total_pay: day.totalPay,
    }));
    createTasksMutation.mutate(tasksToCreate, {
      onSuccess: () => { toast.success("Tarea registrada"); setCreateTaskModalOpen(false); refetchTasks(); queryClient.invalidateQueries({ queryKey: ["tasks"] }); },
      onError: (error: any) => { toast.error(`Error: ${error.message}`); },
    });
  };

  const userName = profile?.full_name || user?.email?.split("@")[0] || "Manager";
  const isLoading = isLoadingTasks || isLoadingProjects;
  const hasError = tasksError || projectsError;

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />{userName}
          {metrics.tareas.pending > 0 && <span className="text-amber-500 font-medium">· {metrics.tareas.pending} pendientes</span>}
          {metrics.proyectos.atrasados > 0 && <span className="text-red-500 font-medium">· {metrics.proyectos.atrasados} atrasados</span>}
          {metrics.tareas.pending === 0 && metrics.proyectos.atrasados === 0 && <span className="text-emerald-500 font-medium">· Todo al día</span>}
        </p>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : hasError ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center h-48 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 mb-3"><AlertTriangle className="h-7 w-7 text-red-500" /></div>
          <p className="text-foreground font-medium mb-1">Error al cargar los datos</p>
          <p className="text-sm text-muted-foreground mb-4">No se pudo conectar con el servidor</p>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2"><RefreshCw className="h-4 w-4" /> Reintentar</Button>
        </motion.div>
      ) : (
        <>
          <div className="mb-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
              <MetricCardMG title="Horas Totales" value={`${metrics.horas.total.toFixed(1)}h`} subtitle={`${metrics.horas.weekly.toFixed(1)}h esta semana`} icon={Clock} trend={metrics.horas.trend} delay={100} />
              <MetricCardMG title="Proyectos Activos" value={metrics.proyectos.activos} subtitle={`${metrics.proyectos.completados} completados`} icon={FolderKanban} trend={{ value: Math.round((metrics.proyectos.activos / Math.max(metrics.proyectos.count, 1)) * 100), positive: true }} delay={150} />
              <MetricCardMG title="Clientes Atendidos" value={metrics.clientes.atendidos} subtitle={`de ${metrics.clientes.total} clientes`} icon={Building2} delay={200} />
              <MetricCardMG title="Tareas Completadas" value={metrics.tareas.completed} subtitle={`${metrics.tareas.pending} pendientes`} icon={CheckSquare} trend={metrics.tareas.trend} delay={250} />
            </div>
          </div>

          <ActivityFeedMG
            tasks={tasks}
            projects={projects}
            clients={clients}
            technicians={technicians}
            hoursByClient={hoursByClient}
            projectStatus={projectStatus}
            monthTasks={monthTasks}
            metrics={metrics}
            technicianPerformance={technicianPerformance}
            onViewClient={handleViewClient}
            onViewTechnician={handleViewTechnician}
            onViewAllClients={handleViewAllClients}
            onViewAllTechnicians={handleViewAllTechnicians}
          />
        </>
      )}

      <TechnicianDetailsModal tech={selectedTechnician} open={techModalOpen} onOpenChange={setTechModalOpen} tasks={tasks} projects={projects} clients={clients} />
      <ClientDetailsModal client={selectedClient} open={clientModalOpen} onOpenChange={setClientModalOpen} clients={clients} projects={projects} tasks={tasks} />
      <AllClientsModal open={allClientsModalOpen} onOpenChange={setAllClientsModalOpen} clients={hoursByClient} onViewClient={handleViewClient} totalClientHours={hoursByClient.reduce((sum, c) => sum + c.hours, 0) || 1} maxClientHours={hoursByClient[0]?.hours || 1} />
      <CreateTaskModal open={createTaskModalOpen} onOpenChange={setCreateTaskModalOpen} projects={projects} services={services} onSuccess={handleCreateTask} />
      <CreateProjectModal open={createProjectModalOpen} onOpenChange={setCreateProjectModalOpen} onSuccess={() => { setCreateProjectModalOpen(false); refetchProjects(); }} />
      <ManageMemberModal open={manageMemberModalOpen} onOpenChange={setManageMemberModalOpen} onSuccess={() => { setManageMemberModalOpen(false); queryClient.invalidateQueries({ queryKey: ["team_members"] }); }} />
      <CreateServiceModal open={createServiceModalOpen} onOpenChange={setCreateServiceModalOpen} onSuccess={() => setCreateServiceModalOpen(false)} />
    </DashboardLayout>
  );
};

export default DashboardMG;