import { useState, useMemo } from "react";
import { format, subDays, startOfWeek, endOfWeek, isWithinInterval, differenceInDays, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  CheckSquare, Clock, FolderKanban, Loader2, 
  AlertTriangle, RefreshCw, Shield, Users, Building2, 
  Target, Award, Activity, CheckCircle, Clock as ClockIcon,
  TrendingUp, TrendingDown, PieChart, BarChart, UserCheck,
  CalendarDays, Zap, ArrowUpRight, ArrowDownRight, Minus,
  ChevronRight, Eye, LayoutDashboard, ListTodo, UserPlus,
  Plus, Search, Filter, X, Mail, Phone, MapPin, Briefcase,
  Hash, Timer, DollarSign, Star, MessageSquare,
  Maximize2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks, useCreateTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { useClientsWithContacts } from "@/hooks/useClientes";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { ManageMemberModal } from "@/components/team/ManageMemberModal";
import { CreateServiceModal } from "@/components/services/CreateServiceModal";
import { useServices } from "@/hooks/useServices";
import { useHolidays } from "@/hooks/useHolidays";
import { calculateTaskBreakdown } from "@/lib/hoursCalculator";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

const getWeekRanges = () => {
  const today = new Date();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const lastWeekStart = subDays(currentWeekStart, 7);
  const lastWeekEnd = subDays(currentWeekEnd, 7);
  return { currentWeekStart, currentWeekEnd, lastWeekStart, lastWeekEnd };
};

// Componente de Proyecto Mejorado
const ProjectCard = ({ project, index }: { project: any; index: number }) => {
  const statusConfig = {
    completed: { 
      bg: "bg-emerald-50 dark:bg-emerald-950/30", 
      text: "text-emerald-700 dark:text-emerald-400", 
      border: "border-emerald-200 dark:border-emerald-800",
      icon: CheckCircle,
      gradient: "from-emerald-500 to-emerald-400",
      label: "Completado"
    },
    in_progress: { 
      bg: "bg-blue-50 dark:bg-blue-950/30", 
      text: "text-blue-700 dark:text-blue-400", 
      border: "border-blue-200 dark:border-blue-800",
      icon: Activity,
      gradient: "from-blue-500 to-blue-400",
      label: "En Progreso"
    },
    delayed: { 
      bg: "bg-red-50 dark:bg-red-950/30", 
      text: "text-red-700 dark:text-red-400", 
      border: "border-red-200 dark:border-red-800",
      icon: AlertTriangle,
      gradient: "from-red-500 to-red-400",
      label: "Atrasado"
    },
    not_started: { 
      bg: "bg-slate-50 dark:bg-slate-950/30", 
      text: "text-slate-700 dark:text-slate-400", 
      border: "border-slate-200 dark:border-slate-800",
      icon: ClockIcon,
      gradient: "from-slate-400 to-slate-300",
      label: "Sin Iniciar"
    },
  };

  const status = statusConfig[project.status] || statusConfig.not_started;
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -2 }}
      className="group"
    >
      <Card className="hover:shadow-xl transition-all duration-300 border-border/50 hover:border-primary/30 overflow-hidden bg-gradient-to-br from-card to-muted/5">
        <div className={`h-1.5 bg-gradient-to-r ${status.gradient}`} />
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {project.name}
                </h4>
                {project.isDelayed && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>¡Atrasado por {project.daysDelayed} días!</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{project.client}</span>
              </div>
            </div>
            <Badge variant="outline" className={`${status.bg} ${status.text} ${status.border} ml-2 gap-1 px-2.5 py-1 flex-shrink-0`}>
              <StatusIcon className="h-3 w-3" />
              <span className="text-xs font-medium">{project.isDelayed ? `+${project.daysDelayed}d` : status.label}</span>
            </Badge>
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground font-medium">Progreso</span>
              <span className="font-bold text-foreground">{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-2" />
          </div>

          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="text-center p-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
              <p className="text-base font-bold text-foreground">{project.total}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Tareas</p>
            </div>
            <div className="text-center p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-colors">
              <p className="text-base font-bold text-emerald-600">{project.completed}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Listas</p>
            </div>
            <div className="text-center p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/40 transition-colors">
              <p className="text-base font-bold text-blue-600">{project.hours.toFixed(1)}h</p>
              <p className="text-[10px] text-muted-foreground font-medium">Horas</p>
            </div>
            <div className="text-center p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/20 hover:bg-purple-100 dark:hover:bg-purple-950/40 transition-colors">
              <p className="text-base font-bold text-purple-600">{project.teamSize}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Equipo</p>
            </div>
          </div>

          <Separator className="mb-3" />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>{format(new Date(project.startDate), "dd/MM")}</span>
              <ChevronRight className="h-3 w-3" />
              <span>{format(new Date(project.endDate), "dd/MM")}</span>
            </div>
            {project.isDelayed ? (
              <span className="text-red-500 font-semibold flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                +{project.daysDelayed}d
              </span>
            ) : (
              <span className="text-emerald-500 font-semibold">
                {project.daysRemaining}d restantes
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Componente de Técnico Mejorado
const TechnicianCard = ({ tech, index, onViewDetails }: { tech: any; index: number; onViewDetails: (tech: any) => void }) => {
  const rankGradient = index === 0 ? 'from-amber-400 to-orange-500' :
                       index === 1 ? 'from-slate-300 to-slate-500' :
                       index === 2 ? 'from-amber-600 to-amber-800' :
                       'from-slate-400 to-slate-500';

  const efficiencyColor = tech.trend > 10 ? 'text-emerald-500' : 
                          tech.trend > 0 ? 'text-blue-500' : 
                          tech.trend < 0 ? 'text-red-500' : 'text-muted-foreground';
  const TrendIcon = tech.trend > 0 ? TrendingUp : tech.trend < 0 ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -3 }}
      className="group cursor-pointer"
      onClick={() => onViewDetails(tech)}
    >
      <Card className="hover:shadow-xl transition-all duration-300 border-border/50 hover:border-purple-300 dark:hover:border-purple-700 overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <Avatar className="h-14 w-14 ring-2 ring-offset-2 ring-offset-background ring-purple-100 dark:ring-purple-900">
                <AvatarFallback className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-purple-700 dark:text-purple-300 font-bold text-lg">
                  {tech.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.05 + 0.2, type: "spring" }}
                className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br ${rankGradient} flex items-center justify-center text-white text-xs font-bold shadow-lg`}
              >
                {index + 1}
              </motion.div>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                {tech.name}
              </h4>
              <p className="text-xs text-muted-foreground">{tech.projectCount} proyectos</p>
            </div>
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Eye className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-muted/40">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-[10px] text-muted-foreground font-medium">HORAS</span>
              </div>
              <p className="text-lg font-bold text-foreground">{tech.hours.toFixed(1)}h</p>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/40">
              <div className="flex items-center gap-1.5 mb-1">
                <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-[10px] text-muted-foreground font-medium">TAREAS</span>
              </div>
              <p className="text-lg font-bold">
                <span className="text-emerald-600">{tech.completedTasks}</span>
                <span className="text-muted-foreground text-sm">/{tech.tasks}</span>
              </p>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Eficiencia</span>
              <div className={`flex items-center gap-1 font-semibold ${efficiencyColor}`}>
                <TrendIcon className="h-3 w-3" />
                <span>{Math.abs(tech.trend)}%</span>
              </div>
            </div>
            <Progress 
              value={tech.tasks > 0 ? (tech.completedTasks / tech.tasks) * 100 : 0} 
              className="h-1.5" 
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Modal de Detalles del Técnico
const TechnicianDetailsModal = ({ tech, open, onOpenChange, tasks, projects, clients }: any) => {
  const techTasks = useMemo(() => {
    return tasks
      .filter((t: any) => t.technician_id === tech?.id)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [tasks, tech]);

  const techProjects = useMemo(() => {
    const projectIds = new Set(techTasks.map((t: any) => t.project_id));
    return projects.filter((p: any) => projectIds.has(p.id)).map((p: any) => {
      const projectTasks = techTasks.filter((t: any) => t.project_id === p.id);
      const client = clients.find((c: any) => c.id === p.client_id);
      return {
        ...p,
        clientName: client?.name || "Sin cliente",
        taskCount: projectTasks.length,
        completedTasks: projectTasks.filter((t: any) => t.status === 'Completed').length,
      };
    });
  }, [techTasks, projects, clients]);

  if (!tech) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 ring-4 ring-purple-100 dark:ring-purple-900">
              <AvatarFallback className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-2xl font-bold">
                {tech.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-2xl">{tech.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-3 mt-1">
                <Badge variant="outline" className="gap-1">
                  <Briefcase className="h-3 w-3" />
                  {tech.projectCount} proyectos
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <CheckSquare className="h-3 w-3" />
                  {tech.completedTasks}/{tech.tasks} tareas
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {tech.hours.toFixed(1)}h
                </Badge>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-blue-500" />
                Proyectos Asignados
              </h3>
              <div className="grid gap-3">
                {techProjects.map((project: any) => (
                  <div key={project.id} className="p-4 rounded-lg border bg-muted/20">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{project.name}</h4>
                        <p className="text-sm text-muted-foreground">{project.clientName}</p>
                      </div>
                      <Badge variant="outline">
                        {project.completedTasks}/{project.taskCount} tareas
                      </Badge>
                    </div>
                    <Progress 
                      value={project.taskCount > 0 ? (project.completedTasks / project.taskCount) * 100 : 0} 
                      className="h-1.5" 
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-500" />
                Actividad Reciente
              </h3>
              <div className="space-y-2">
                {techTasks.slice(0, 10).map((task: any) => (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
                    <div className={`p-2 rounded-lg ${
                      task.status === 'Completed' ? 'bg-emerald-500/10' : 
                      task.status === 'InProgress' ? 'bg-blue-500/10' : 'bg-amber-500/10'
                    }`}>
                      {task.status === 'Completed' ? 
                        <CheckCircle className="h-4 w-4 text-emerald-500" /> : 
                        <ClockIcon className="h-4 w-4 text-amber-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.description || "Sin descripción"}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(task.created_at), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {(task.duration_in_minutes ? task.duration_in_minutes / 60 : (task.normal_hours || 0) + (task.overtime_hours || 0)).toFixed(1)}h
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

const DashboardMG = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const userRole = profile?.role;
  const isManager = userRole === 'Manager';

  if (!isManager) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <motion.div 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            transition={{ type: "spring" }}
            className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-red-500/20 mb-6"
          >
            <Shield className="h-12 w-12 text-amber-500" />
          </motion.div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Acceso Restringido</h2>
          <p className="text-muted-foreground text-center max-w-md">
            El Dashboard Gerencial es exclusivo para usuarios con rol de Manager.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const { data: tasks = [], isLoading: isLoadingTasks, error: tasksError, refetch: refetchTasks } = useTasks();
  const { data: projects = [], isLoading: isLoadingProjects, error: projectsError, refetch: refetchProjects } = useProjects();
  const { data: clients = [] } = useClientsWithContacts();
  const { data: services = [] } = useServices();
  const { holidays } = useHolidays();
  const createTasksMutation = useCreateTasks();

  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [manageMemberModalOpen, setManageMemberModalOpen] = useState(false);
  const [createServiceModalOpen, setCreateServiceModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("resumen");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTechnician, setSelectedTechnician] = useState<any>(null);
  const [techModalOpen, setTechModalOpen] = useState(false);
  const [projectFilter, setProjectFilter] = useState("");
  const [isResumenModalOpen, setIsResumenModalOpen] = useState(false);

  const handleNewTask = () => setCreateTaskModalOpen(true);
  const handleNewProject = () => setCreateProjectModalOpen(true);
  const handleManageMember = () => setManageMemberModalOpen(true);
  const handleNewService = () => setCreateServiceModalOpen(true);
  const handleViewTechnician = (tech: any) => {
    setSelectedTechnician(tech);
    setTechModalOpen(true);
  };

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
    
    const calculateHours = (taskList: any[]) => 
      taskList.reduce((acc: number, task: any) => {
        return acc + (task.duration_in_minutes ? task.duration_in_minutes / 60 : (task.normal_hours || 0) + (task.overtime_hours || 0));
      }, 0);
    
    const currentWeekHours = calculateHours(currentWeekTasks);
    const lastWeekHours = calculateHours(lastWeekTasks);
    const totalHours = calculateHours(tasks);
    
    const tareasCount = tasks.length;
    const tareasCompletadas = tasks.filter((t: any) => t.status === 'Completed').length;
    const tareasPendientes = tasks.filter((t: any) => t.status === 'Pending').length;
    const tareasEnProgreso = tasks.filter((t: any) => t.status === 'InProgress').length;
    
    const clientesAtendidosSet = new Set();
    tasks.forEach((task: any) => {
      const project = projects.find((p: any) => p.id === task.project_id);
      if (project?.client_id) clientesAtendidosSet.add(project.client_id);
    });
    const clientesAtendidos = clientesAtendidosSet.size;
    
    const proyectosActivos = projects.filter((p: any) => p.status !== 'Completed').length;
    const proyectosAtrasados = projects.filter((p: any) => {
      const endDate = new Date(p.end_date);
      const projectTasks = tasks.filter((t: any) => t.project_id === p.id);
      const completed = projectTasks.filter((t: any) => t.status === 'Completed').length;
      const progress = projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : 0;
      return endDate < new Date() && progress < 100;
    }).length;
    
    const horasTrendValue = lastWeekHours === 0 ? (currentWeekHours > 0 ? 100 : 0) : Math.round(((currentWeekHours - lastWeekHours) / lastWeekHours) * 100);
    const tareasTrendValue = lastWeekTasks.length === 0 ? (currentWeekTasks.length > 0 ? 100 : 0) : Math.round(((currentWeekTasks.length - lastWeekTasks.length) / lastWeekTasks.length) * 100);
    
    return {
      horas: { total: totalHours, weekly: currentWeekHours, trend: { value: Math.abs(horasTrendValue), positive: horasTrendValue >= 0 } },
      proyectos: { count: projects.length, activos: proyectosActivos, atrasados: proyectosAtrasados, completados: projects.filter((p: any) => p.status === 'Completed').length, trend: { value: 0, positive: true } },
      clientes: { atendidos: clientesAtendidos, total: clients.length },
      tareas: { count: tareasCount, completed: tareasCompletadas, pending: tareasPendientes, inProgress: tareasEnProgreso, trend: { value: Math.abs(tareasTrendValue), positive: tareasTrendValue >= 0 } },
      equipo: { tecnicosActivos: new Set(currentWeekTasks.map((t: any) => t.technician_id)).size, totalTecnicos: new Set(tasks.map((t: any) => t.technician_id)).size }
    };
  }, [tasks, projects, clients]);

  const hoursByClient = useMemo(() => {
    const clientHours: Record<string, { name: string; hours: number; color: string; projectCount: number }> = {};
    const colors = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899", "#6366f1"];
    
    tasks.forEach((task: any) => {
      const project = projects.find((p: any) => p.id === task.project_id);
      const client = clients.find((c: any) => c.id === project?.client_id);
      const clientName = client?.name || "Sin Cliente";
      const hours = task.duration_in_minutes ? task.duration_in_minutes / 60 : (task.normal_hours || 0) + (task.overtime_hours || 0);
      
      if (!clientHours[clientName]) {
        clientHours[clientName] = { name: clientName, hours: 0, color: colors[Object.keys(clientHours).length % colors.length], projectCount: 0 };
      }
      clientHours[clientName].hours += hours;
      if (project && !clientHours[clientName].projectCount) {
        clientHours[clientName].projectCount = projects.filter((p: any) => p.client_id === client?.id).length;
      }
    });
    
    return Object.values(clientHours).sort((a, b) => b.hours - a.hours);
  }, [tasks, projects, clients]);

  const technicianPerformance = useMemo(() => {
    const { currentWeekStart, currentWeekEnd, lastWeekStart, lastWeekEnd } = getWeekRanges();
    const techData: Record<string, any> = {};
    
    tasks.forEach((task: any) => {
      const techId = task.technician_id;
      const hours = task.duration_in_minutes ? task.duration_in_minutes / 60 : (task.normal_hours || 0) + (task.overtime_hours || 0);
      const taskDate = new Date(task.start_time || task.created_at);
      
      if (!techData[techId]) {
        techData[techId] = { id: techId, name: `Técnico ${techId.slice(0, 8)}`, hours: 0, lastWeekHours: 0, tasks: 0, completedTasks: 0, projects: new Set(), trend: 0 };
      }
      
      techData[techId].hours += hours;
      techData[techId].tasks += 1;
      if (task.status === 'Completed') techData[techId].completedTasks += 1;
      if (task.project_id) techData[techId].projects.add(task.project_id);
      if (isWithinInterval(taskDate, { start: lastWeekStart, end: lastWeekEnd })) techData[techId].lastWeekHours += hours;
    });
    
    Object.values(techData).forEach((tech: any) => {
      tech.trend = tech.lastWeekHours > 0 ? Math.round(((tech.hours - tech.lastWeekHours) / tech.lastWeekHours) * 100) : tech.hours > 0 ? 100 : 0;
      tech.projectCount = tech.projects.size;
    });
    
    return Object.values(techData).sort((a: any, b: any) => b.hours - a.hours);
  }, [tasks]);

  const projectStatus = useMemo(() => {
    return projects.map((project: any) => {
      const projectTasks = tasks.filter((t: any) => t.project_id === project.id);
      const completed = projectTasks.filter((t: any) => t.status === 'Completed').length;
      const pending = projectTasks.filter((t: any) => t.status === 'Pending').length;
      const inProgress = projectTasks.filter((t: any) => t.status === 'InProgress').length;
      const total = projectTasks.length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      const projectHours = projectTasks.reduce((acc: number, task: any) => acc + (task.duration_in_minutes ? task.duration_in_minutes / 60 : (task.normal_hours || 0) + (task.overtime_hours || 0)), 0);
      const endDate = new Date(project.end_date);
      const startDate = new Date(project.start_date);
      const today = new Date();
      const isDelayed = endDate < today && progress < 100;
      const daysDelayed = isDelayed ? differenceInDays(today, endDate) : 0;
      const daysRemaining = !isDelayed ? differenceInDays(endDate, today) : 0;
      
      let status = "active";
      if (progress === 100) status = "completed";
      else if (isDelayed) status = "delayed";
      else if (inProgress > 0 || completed > 0) status = "in_progress";
      else status = "not_started";
      
      const client = clients.find((c: any) => c.id === project.client_id);
      const teamMembers = projectTasks.map((t: any) => t.technician_id).filter((v: any, i: number, a: any[]) => a.indexOf(v) === i);
      
      return { id: project.id, name: project.name, description: project.description, client: client?.name || "Sin Cliente", progress, completed, pending, inProgress, total, hours: projectHours, status, isDelayed, daysDelayed, daysRemaining, startDate: project.start_date, endDate: project.end_date, teamSize: teamMembers.length };
    }).sort((a, b) => {
      if (a.isDelayed && !b.isDelayed) return -1;
      if (!a.isDelayed && b.isDelayed) return 1;
      return b.progress - a.progress;
    });
  }, [projects, tasks, clients]);

  const recentTasks = useMemo(() => {
    return [...tasks]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map((task: any) => {
        const project = projects.find((p: any) => p.id === task.project_id);
        const client = clients.find((c: any) => c.id === project?.client_id);
        return { ...task, projectName: project?.name || "Sin proyecto", clientName: client?.name || "Sin cliente", hours: task.duration_in_minutes ? task.duration_in_minutes / 60 : (task.normal_hours || 0) + (task.overtime_hours || 0) };
      });
  }, [tasks, projects, clients]);

  const teamByProject = useMemo(() => {
    const projectTeams: Record<string, any> = {};
    projects.forEach((project: any) => {
      const projectTasks = tasks.filter((t: any) => t.project_id === project.id);
      const members = new Map();
      projectTasks.forEach((task: any) => {
        const techId = task.technician_id;
        if (!members.has(techId)) members.set(techId, { id: techId, name: `Técnico ${techId.slice(0, 8)}`, tasks: 0, completedTasks: 0, hours: 0 });
        const member = members.get(techId);
        member.tasks += 1;
        if (task.status === 'Completed') member.completedTasks += 1;
        member.hours += task.duration_in_minutes ? task.duration_in_minutes / 60 : (task.normal_hours || 0) + (task.overtime_hours || 0);
      });
      if (members.size > 0) {
        projectTeams[project.id] = { projectId: project.id, projectName: project.name, client: clients.find((c: any) => c.id === project.client_id)?.name || "Sin cliente", members: Array.from(members.values()), totalMembers: members.size, totalHours: Array.from(members.values()).reduce((acc, m) => acc + m.hours, 0) };
      }
    });
    return Object.values(projectTeams);
  }, [projects, tasks, clients]);

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
      project_id: data.projectId, service_id: data.serviceId, technician_id: user.id,
      start_time: `${day.date}T${data.startTime}:00`, end_time: `${day.date}T${data.endTime}:00`,
      description: data.description, status: 'Pending', priority: 'Medium',
      applied_hourly_rate: hourlyRate, normal_hours: day.normalHours, overtime_hours: day.overtimeHours,
      normal_pay: day.normalPay, overtime_pay: day.overtimePay, total_pay: day.totalPay,
    }));

    createTasksMutation.mutate(tasksToCreate, {
      onSuccess: () => { toast.success("Tarea registrada correctamente"); setCreateTaskModalOpen(false); refetchTasks(); queryClient.invalidateQueries({ queryKey: ['tasks'] }); },
      onError: (error: any) => { toast.error(`Error al crear tarea: ${error.message}`); },
    });
  };

  const getTaskStatusBadge = (status: string) => {
    switch (status) {
      case "Completed": return { label: "Completada", icon: CheckCircle, className: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" };
      case "InProgress": return { label: "En Progreso", icon: Activity, className: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800" };
      case "Pending": return { label: "Pendiente", icon: ClockIcon, className: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800" };
      default: return { label: status, icon: ClockIcon, className: "bg-slate-50 dark:bg-slate-950/30 text-slate-700" };
    }
  };

  // ✅ FUNCIÓN AGREGADA - getProjectStatusBadge
  const getProjectStatusBadge = (status: string, isDelayed: boolean) => {
    if (isDelayed) {
      return { label: "Atrasado", icon: AlertTriangle, className: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800" };
    }
    switch (status) {
      case "completed":
        return { label: "Completado", icon: CheckCircle, className: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" };
      case "in_progress":
        return { label: "En Progreso", icon: Activity, className: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800" };
      case "delayed":
        return { label: "Atrasado", icon: AlertTriangle, className: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800" };
      default:
        return { label: "Sin Iniciar", icon: ClockIcon, className: "bg-slate-50 dark:bg-slate-950/30 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800" };
    }
  };

  const userName = profile?.full_name || user?.email?.split('@')[0] || 'Manager';
  const isLoading = isLoadingTasks || isLoadingProjects;
  const hasError = tasksError || projectsError;

  const filteredProjects = projectFilter 
    ? projectStatus.filter(p => p.name.toLowerCase().includes(projectFilter.toLowerCase()) || p.client.toLowerCase().includes(projectFilter.toLowerCase()))
    : projectStatus;

  return (
    <DashboardLayout>
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Dashboard Gerencial
            </h1>
            <p className="mt-1.5 text-muted-foreground flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-amber-500" />
              {userName} · 
              {metrics.tareas.pending > 0 && <span className="text-amber-500 font-medium">{metrics.tareas.pending} pendientes</span>}
              {metrics.proyectos.atrasados > 0 && <span className="text-red-500 font-medium"> · {metrics.proyectos.atrasados} atrasados</span>}
              {metrics.tareas.pending === 0 && metrics.proyectos.atrasados === 0 && <span className="text-emerald-500 font-medium">Todo al día</span>}
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" onClick={handleNewTask} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20">
              <Plus className="h-4 w-4" />
              Nueva Tarea
            </Button>
            <Button size="sm" onClick={handleNewProject} variant="outline" className="gap-1.5">
              <FolderKanban className="h-4 w-4" />
              Proyecto
            </Button>
            <Button size="sm" onClick={handleNewService} variant="outline" className="gap-1.5">
              <Briefcase className="h-4 w-4" />
              Servicio
            </Button>
            <Button size="sm" onClick={handleManageMember} variant="outline" className="gap-1.5">
              <UserCheck className="h-4 w-4" />
              Equipo
            </Button>
            <Button variant="ghost" size="icon" onClick={() => { refetchTasks(); refetchProjects(); }}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : hasError ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center h-48 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 mb-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <p className="text-foreground font-medium mb-1">Error al cargar los datos</p>
          <p className="text-sm text-muted-foreground mb-4">No se pudo conectar con el servidor</p>
          <Button variant="outline" size="sm" onClick={() => { refetchTasks(); refetchProjects(); }} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Reintentar
          </Button>
        </motion.div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Horas Totales" value={`${metrics.horas.total.toFixed(1)}h`} subtitle={`${metrics.horas.trend.positive ? '↑' : '↓'} ${metrics.horas.trend.value}% vs semana pasada`} icon={Clock} trend={metrics.horas.trend} delay={100} />
            <MetricCard title="Proyectos Activos" value={metrics.proyectos.activos} subtitle={`${metrics.proyectos.atrasados} atrasados · ${metrics.proyectos.count} totales`} icon={FolderKanban} trend={metrics.proyectos.trend} delay={150} />
            <MetricCard title="Clientes Atendidos" value={metrics.clientes.atendidos} subtitle={`de ${metrics.clientes.total} clientes totales`} icon={Building2} trend={{ value: Math.round((metrics.clientes.atendidos / Math.max(metrics.clientes.total, 1)) * 100), positive: true }} delay={200} />
            <MetricCard title="Tareas Completadas" value={metrics.tareas.completed} subtitle={`${metrics.tareas.trend.positive ? '↑' : '↓'} ${metrics.tareas.trend.value}% vs semana pasada`} icon={CheckSquare} trend={metrics.tareas.trend} delay={250} />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-muted/50 p-1 rounded-xl w-full justify-start gap-1 overflow-x-auto">
              <TabsTrigger value="resumen" className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm transition-all">
                <LayoutDashboard className="h-4 w-4" />
                Resumen
              </TabsTrigger>
              <TabsTrigger value="proyectos" className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm transition-all">
                <FolderKanban className="h-4 w-4" />
                Proyectos
                {metrics.proyectos.atrasados > 0 && (
                  <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{metrics.proyectos.atrasados}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="equipo" className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm transition-all">
                <Users className="h-4 w-4" />
                Equipo
              </TabsTrigger>
              <TabsTrigger value="tareas" className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm transition-all">
                <ListTodo className="h-4 w-4" />
                Tareas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="resumen" className="mt-0">
  {/* Encabezado del Resumen */}
  <div className="mb-6">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Panel de Control</h2>
        <p className="text-sm text-muted-foreground">Visión general del rendimiento</p>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setIsResumenModalOpen(true)}
        className="gap-1.5"
      >
        <Maximize2 className="h-3.5 w-3.5" />
        Ver análisis completo
      </Button>
    </div>
  </div>

  {/* Grid 2 columnas - izquierda: KPIs compactos, derecha: alertas */}
  <div className="grid gap-6 lg:grid-cols-3">
    {/* Columna izquierda - KPIs compactos (2 columnas internas) */}
    <div className="lg:col-span-2">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Horas */}
        <div className="bg-card border border-border/50 rounded-xl p-4 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Clock className="h-4 w-4 text-emerald-600" />
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              metrics.horas.trend.positive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' : 
              metrics.horas.trend.negative ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'
            }`}>
              {metrics.horas.trend.positive ? `+${metrics.horas.trend.value}%` : 
               metrics.horas.trend.negative ? `-${metrics.horas.trend.value}%` : '0%'}
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">{metrics.horas.total.toFixed(1)}h</p>
          <p className="text-xs text-muted-foreground mt-1">Horas registradas</p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Esta semana: {metrics.horas.weekly.toFixed(1)}h</span>
            </div>
          </div>
        </div>

        {/* Proyectos */}
        <div className="bg-card border border-border/50 rounded-xl p-4 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <FolderKanban className="h-4 w-4 text-blue-600" />
            </div>
            {metrics.proyectos.atrasados > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400">
                {metrics.proyectos.atrasados} atrasados
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-foreground">{metrics.proyectos.activos}</p>
          <p className="text-xs text-muted-foreground mt-1">Proyectos activos</p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>✅ {metrics.proyectos.completados} completados</span>
            <span>·</span>
            <span>📁 {metrics.proyectos.count} totales</span>
          </div>
        </div>

        {/* Clientes */}
        <div className="bg-card border border-border/50 rounded-xl p-4 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Building2 className="h-4 w-4 text-purple-600" />
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted">
              {Math.round((metrics.clientes.atendidos / Math.max(metrics.clientes.total, 1)) * 100)}% cobertura
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">{metrics.clientes.atendidos}</p>
          <p className="text-xs text-muted-foreground mt-1">Clientes atendidos</p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>de {metrics.clientes.total} clientes totales</span>
          </div>
        </div>

        {/* Tareas */}
        <div className="bg-card border border-border/50 rounded-xl p-4 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <CheckSquare className="h-4 w-4 text-amber-600" />
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              metrics.tareas.trend.positive ? 'bg-emerald-100 text-emerald-700' : 
              metrics.tareas.trend.negative ? 'bg-red-100 text-red-700' : 'bg-muted'
            }`}>
              {metrics.tareas.trend.positive ? `+${metrics.tareas.trend.value}%` : 
               metrics.tareas.trend.negative ? `-${metrics.tareas.trend.value}%` : '0%'}
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">{metrics.tareas.completed}</p>
          <p className="text-xs text-muted-foreground mt-1">Tareas completadas</p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="text-blue-500">🔄 {metrics.tareas.inProgress} en curso</span>
            <span>·</span>
            <span className="text-amber-500">⏳ {metrics.tareas.pending} pendientes</span>
          </div>
        </div>
      </div>
    </div>

    {/* Columna derecha - Alertas y métricas destacadas */}
    <div className="space-y-4">
      {/* Proyectos en Riesgo */}
      {projectStatus.filter(p => p.isDelayed).length > 0 && (
        <div className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-red-700 dark:text-red-400">Proyectos en Riesgo</span>
          </div>
          <div className="space-y-2">
            {projectStatus.filter(p => p.isDelayed).slice(0, 2).map(project => (
              <div key={project.id} className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">{project.name}</span>
                <Badge variant="destructive" className="text-[10px]">+{project.daysDelayed}d</Badge>
              </div>
            ))}
            {projectStatus.filter(p => p.isDelayed).length > 2 && (
              <p className="text-xs text-red-600 mt-2">
                +{projectStatus.filter(p => p.isDelayed).length - 2} proyectos más
              </p>
            )}
          </div>
        </div>
      )}

      {/* Métricas de Eficiencia */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">Eficiencia General</span>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Tasa de Completitud</span>
              <span className="font-semibold">{metrics.tareas.count > 0 ? Math.round((metrics.tareas.completed / metrics.tareas.count) * 100) : 0}%</span>
            </div>
            <Progress value={metrics.tareas.count > 0 ? (metrics.tareas.completed / metrics.tareas.count) * 100 : 0} className="h-1.5" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Técnicos Activos</span>
              <span className="font-semibold">{metrics.equipo.tecnicosActivos} / {metrics.equipo.totalTecnicos}</span>
            </div>
            <Progress value={metrics.equipo.totalTecnicos > 0 ? (metrics.equipo.tecnicosActivos / metrics.equipo.totalTecnicos) * 100 : 0} className="h-1.5" />
          </div>
        </div>
      </div>

      {/* Top Cliente Rápido */}
      {hoursByClient.length > 0 && (
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold">Mejor Cliente</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{hoursByClient[0].name}</p>
              <p className="text-xs text-muted-foreground">{hoursByClient[0].hours.toFixed(1)} horas</p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-[10px]">
                {Math.round((hoursByClient[0].hours / (hoursByClient.reduce((sum, c) => sum + c.hours, 0))) * 100)}% del total
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>

  {/* Resumen de Técnicos */}
  {technicianPerformance.length > 0 && (
    <div className="mt-6">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Users className="h-4 w-4 text-purple-500" />
        Técnicos Destacados
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {technicianPerformance.slice(0, 3).map((tech: any, idx: number) => {
          const efficiency = tech.tasks > 0 ? (tech.completedTasks / tech.tasks) * 100 : 0;
          return (
            <div key={tech.id} className="bg-card border border-border/50 rounded-xl p-3 hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                  idx === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                  idx === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-500' :
                  'bg-gradient-to-br from-amber-600 to-amber-700'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{tech.name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{tech.hours.toFixed(1)}h</span>
                    <span>·</span>
                    <span>{tech.completedTasks}/{tech.tasks} tareas</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-semibold ${tech.trend > 0 ? 'text-emerald-500' : tech.trend < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {tech.trend > 0 ? '+' : ''}{tech.trend}%
                  </span>
                  <div className="w-12 h-1 bg-muted rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${efficiency}%` }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )}

  {/* Modal de Análisis Completo */}
  <Dialog open={isResumenModalOpen} onOpenChange={setIsResumenModalOpen}>
    <DialogContent className="max-w-4xl w-[90vw] h-[85vh] bg-card border-border flex flex-col p-0 rounded-2xl shadow-2xl overflow-hidden">
      <div className="p-5 border-b border-border shrink-0 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
              <LayoutDashboard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Análisis Completo</h2>
              <p className="text-xs text-muted-foreground">Métricas detalladas del negocio</p>
            </div>
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1 px-6 py-5">
        <div className="space-y-6">
          {/* KPIs Principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/30 dark:from-emerald-950/20 dark:to-emerald-900/10 border border-emerald-100 dark:border-emerald-800 text-center">
              <Clock className="h-5 w-5 text-emerald-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{metrics.horas.total.toFixed(1)}h</p>
              <p className="text-xs text-muted-foreground">Horas Totales</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10 border border-blue-100 dark:border-blue-800 text-center">
              <FolderKanban className="h-5 w-5 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{metrics.proyectos.activos}</p>
              <p className="text-xs text-muted-foreground">Proyectos Activos</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/30 dark:from-purple-950/20 dark:to-purple-900/10 border border-purple-100 dark:border-purple-800 text-center">
              <Building2 className="h-5 w-5 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{metrics.clientes.atendidos}</p>
              <p className="text-xs text-muted-foreground">Clientes Atendidos</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/30 dark:from-amber-950/20 dark:to-amber-900/10 border border-amber-100 dark:border-amber-800 text-center">
              <CheckSquare className="h-5 w-5 text-amber-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{metrics.tareas.completed}</p>
              <p className="text-xs text-muted-foreground">Tareas Completadas</p>
            </div>
          </div>

          <Separator />

          {/* Top Clientes */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-500" />
              Top Clientes por Horas
            </h3>
            <div className="space-y-3">
              {hoursByClient.slice(0, 8).map((client, idx) => {
                const maxHours = hoursByClient[0]?.hours || 1;
                const percentage = (client.hours / maxHours) * 100;
                return (
                  <div key={client.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ backgroundColor: client.color }}
                        >
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-foreground">{client.name}</span>
                      </div>
                      <span className="font-semibold">{client.hours.toFixed(1)}h</span>
                    </div>
                    <Progress value={percentage} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Estado de Proyectos */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-blue-500" />
              Estado de Proyectos
            </h3>
            <div className="space-y-3">
              {projectStatus.slice(0, 6).map((project) => {
                const statusBadge = getProjectStatusBadge(project.status, project.isDelayed);
                const StatusIcon = statusBadge.icon;
                return (
                  <div key={project.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{project.name}</p>
                        <Badge variant="outline" className={`${statusBadge.className} text-[9px] px-1.5`}>
                          <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
                          {statusBadge.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{project.client}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{project.progress}%</p>
                      <p className="text-[9px] text-muted-foreground">{project.completed}/{project.total} tareas</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Ranking de Técnicos */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              Ranking de Técnicos
            </h3>
            <div className="space-y-2">
              {technicianPerformance.map((tech: any, idx: number) => {
                const efficiency = tech.tasks > 0 ? (tech.completedTasks / tech.tasks) * 100 : 0;
                return (
                  <div key={tech.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/20 transition-all">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
                      idx === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                      idx === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-500' :
                      idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700' :
                      'bg-gradient-to-br from-blue-500 to-indigo-600'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <p className="text-sm font-medium">{tech.name}</p>
                        <p className="text-sm font-semibold">{tech.hours.toFixed(1)}h</p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                            style={{ width: `${efficiency}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-muted-foreground">{Math.round(efficiency)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollArea>
    </DialogContent>
  </Dialog>
</TabsContent>

            <TabsContent value="proyectos" className="space-y-4 mt-0">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <FolderKanban className="h-5 w-5 text-blue-500" />
                        Portafolio de Proyectos
                      </CardTitle>
                      <CardDescription>{projectStatus.length} proyectos en total</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input 
                          placeholder="Buscar proyecto..." 
                          className="pl-8 h-9 w-48 text-sm"
                          value={projectFilter}
                          onChange={(e) => setProjectFilter(e.target.value)}
                        />
                        {projectFilter && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute right-0 top-0 h-9 w-9"
                            onClick={() => setProjectFilter("")}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-1 p-0.5 bg-muted rounded-lg">
                        <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('grid')}>
                          <LayoutDashboard className="h-4 w-4" />
                        </Button>
                        <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('list')}>
                          <ListTodo className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[650px]">
                    {filteredProjects.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <FolderKanban className="h-12 w-12 text-muted-foreground mb-3" />
                        <p className="text-sm font-medium">No se encontraron proyectos</p>
                        <p className="text-xs text-muted-foreground">Intenta con otro filtro</p>
                      </div>
                    ) : viewMode === 'grid' ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        {filteredProjects.map((project, idx) => (
                          <ProjectCard key={project.id} project={project} index={idx} />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredProjects.map((project, idx) => (
                          <ProjectCard key={project.id} project={project} index={idx} />
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="equipo" className="space-y-4 mt-0">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <Award className="h-4 w-4 text-purple-500" />
                          Rendimiento Individual
                        </CardTitle>
                        <CardDescription className="text-xs">Ranking por horas trabajadas</CardDescription>
                      </div>
                      <Badge variant="outline" className="text-xs">{technicianPerformance.length} técnicos</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px] pr-2">
                      <div className="grid gap-3">
                        {technicianPerformance.map((tech: any, idx: number) => (
                          <TechnicianCard 
                            key={tech.id} 
                            tech={tech} 
                            index={idx} 
                            onViewDetails={handleViewTechnician}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-blue-500" />
                        Equipo por Proyecto
                      </CardTitle>
                      <CardDescription className="text-xs">Distribución del equipo</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px] pr-2">
                      <div className="space-y-4">
                        {teamByProject.map((projectTeam) => (
                          <motion.div
                            key={projectTeam.projectId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-lg border bg-muted/10 hover:border-blue-200 dark:hover:border-blue-800 transition-all"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="font-medium text-sm">{projectTeam.projectName}</h4>
                                <p className="text-xs text-muted-foreground">{projectTeam.client}</p>
                              </div>
                              <div className="flex gap-1.5">
                                <Badge variant="outline" className="text-[10px] gap-1">
                                  <Users className="h-2.5 w-2.5" />
                                  {projectTeam.totalMembers}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] gap-1">
                                  <Clock className="h-2.5 w-2.5" />
                                  {projectTeam.totalHours.toFixed(1)}h
                                </Badge>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {projectTeam.members.map((member: any) => (
                                <div 
                                  key={member.id} 
                                  className="flex items-center gap-2.5 p-2 rounded-md bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                                  onClick={() => {
                                    const tech = technicianPerformance.find((t: any) => t.id === member.id);
                                    if (tech) handleViewTechnician(tech);
                                  }}
                                >
                                  <Avatar className="h-7 w-7">
                                    <AvatarFallback className="text-[10px] bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                                      {member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{member.name}</p>
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                      <span>{member.hours.toFixed(1)}h</span>
                                      <span>·</span>
                                      <span>{member.completedTasks}/{member.tasks} tareas</span>
                                    </div>
                                  </div>
                                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="tareas" className="space-y-4 mt-0">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Actividad Reciente
                      </CardTitle>
                      <CardDescription>Últimas tareas registradas en el sistema</CardDescription>
                    </div>
                    <Button size="sm" onClick={handleNewTask} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                      <Plus className="h-4 w-4" />
                      Nueva Tarea
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[650px]">
                    <div className="space-y-2">
                      {recentTasks.map((task: any, idx: number) => {
                        const statusBadge = getTaskStatusBadge(task.status);
                        const StatusIcon = statusBadge.icon;
                        return (
                          <motion.div
                            key={task.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className="group flex items-center gap-4 p-3.5 rounded-xl border border-border/50 hover:border-primary/30 hover:shadow-sm transition-all bg-card"
                          >
                            <div className={`p-2.5 rounded-xl ${
                              task.status === 'Completed' ? 'bg-emerald-500/10' : 
                              task.status === 'InProgress' ? 'bg-blue-500/10' : 'bg-amber-500/10'
                            }`}>
                              <StatusIcon className={`h-5 w-5 ${
                                task.status === 'Completed' ? 'text-emerald-500' : 
                                task.status === 'InProgress' ? 'text-blue-500' : 'text-amber-500'
                              }`} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                  {task.description || "Sin descripción"}
                                </p>
                                <Badge variant="outline" className={`${statusBadge.className} text-[10px] px-1.5 py-0`}>
                                  {statusBadge.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <FolderKanban className="h-3 w-3" />
                                  {task.projectName}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {task.clientName}
                                </span>
                                <span className="flex items-center gap-1">
                                  <CalendarDays className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(task.created_at), { addSuffix: true, locale: es })}
                                </span>
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <p className="text-lg font-bold text-foreground">{task.hours.toFixed(1)}h</p>
                              <p className="text-[10px] text-muted-foreground">registradas</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      <TechnicianDetailsModal 
        tech={selectedTechnician}
        open={techModalOpen}
        onOpenChange={setTechModalOpen}
        tasks={tasks}
        projects={projects}
        clients={clients}
      />

      <CreateTaskModal
        open={createTaskModalOpen}
        onOpenChange={setCreateTaskModalOpen}
        projects={projects}
        services={services}
        onSuccess={() => { refetchTasks(); setCreateTaskModalOpen(false); }}
      />
      <CreateProjectModal
        open={createProjectModalOpen}
        onOpenChange={setCreateProjectModalOpen}
        onSuccess={() => { refetchProjects(); setCreateProjectModalOpen(false); }}
      />
      <ManageMemberModal
        open={manageMemberModalOpen}
        onOpenChange={setManageMemberModalOpen}
        onSuccess={() => { setManageMemberModalOpen(false); queryClient.invalidateQueries({ queryKey: ['team_members'] }); }}
      />
      <CreateServiceModal
        open={createServiceModalOpen}
        onOpenChange={setCreateServiceModalOpen}
        onSuccess={() => { setCreateServiceModalOpen(false); }}
      />
    </DashboardLayout>
  );
};

export default DashboardMG;