import { useState, useMemo, useEffect } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/lib/supabase/client";
import { 
  FolderKanban, 
  Clock, 
  Download,
  CheckSquare,
  Users,
  UserPlus,
  UserMinus,
  Pencil,
  Maximize2,
  X,
  ChevronRight,
  Activity,
  Calendar
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

type ActivityType = "all" | "tasks" | "projects" | "exports" | "project_events";

interface ProjectEvent {
  id: string;
  type: "project_event";
  action: "assigned" | "removed" | "member_added" | "member_removed" | "updated";
  title: string;
  description: string;
  projectName: string;
  projectId: string;
  user: string;
  time: string;
}

interface Activity {
  id: string;
  type: "task" | "project" | "export" | "project_event";
  title: string;
  description: string;
  user: string;
  time: string;
  action?: string;
  projectId?: string;
  projectName?: string;
  eventType?: string;
}

const ActivityList = ({ 
  tasks, 
  projects, 
  user, 
  profile, 
  isTechnician, 
  isManagerOrAdmin,
  selectedType 
}: {
  tasks: any[];
  projects: any[];
  user: any;
  profile: any;
  isTechnician: boolean;
  isManagerOrAdmin: boolean;
  selectedType: ActivityType;
}) => {
  const navigate = useNavigate();
  const [projectEvents, setProjectEvents] = useState<ProjectEvent[]>([]);

  useEffect(() => {
    const fetchProjectEvents = async () => {
      if (!user?.id) return;

      let query = supabase
        .from('project_activities')
        .select('*, projects(name)')
        .order('created_at', { ascending: false })
        .limit(20);

      if (isTechnician) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;
      if (!error && data) {
        const events: ProjectEvent[] = data.map((event: any) => {
          let actionText = "";
          
          switch (event.action_type) {
            case 'assigned':
              actionText = "Te han asignado al proyecto";
              break;
            case 'removed':
              actionText = "Te han eliminado del proyecto";
              break;
            case 'member_added':
              actionText = "Nuevo miembro en el proyecto";
              break;
            case 'member_removed':
              actionText = "Miembro eliminado del proyecto";
              break;
            case 'updated':
              actionText = "Proyecto actualizado";
              break;
            default:
              actionText = "Actividad en el proyecto";
          }

          return {
            id: event.id,
            type: "project_event",
            action: event.action_type,
            title: event.projects?.name || "Proyecto",
            description: actionText,
            projectName: event.projects?.name || "Proyecto",
            projectId: event.project_id,
            user: profile?.full_name || "Usuario",
            time: event.created_at,
          };
        });
        setProjectEvents(events);
      }
    };

    fetchProjectEvents();
  }, [user, isTechnician, profile]);

  const userTasks = useMemo(() => {
    if (isTechnician) {
      return tasks.filter((t: any) => t.created_by === user?.id);
    }
    return tasks;
  }, [tasks, isTechnician, user]);

  const userProjects = useMemo(() => {
    if (isTechnician) {
      const projectIds = new Set(userTasks.map((t: any) => t.project_id).filter(Boolean));
      return projects.filter((p: any) => projectIds.has(p.id));
    }
    return projects;
  }, [projects, userTasks, isTechnician]);

  const userExports = useMemo(() => {
    return userTasks
      .filter(t => t.status === 'Completed')
      .slice(0, 5)
      .map(t => ({
        id: `export-${t.id}`,
        title: `Exportación de tareas`,
        description: t.description || "Sin descripción",
        time: t.updated_at || t.created_at,
      }));
  }, [userTasks]);

  const activities: Activity[] = useMemo(() => {
    const allActivities: Activity[] = [];

    projectEvents.forEach(event => {
      allActivities.push({
        id: event.id,
        type: "project_event",
        title: event.projectName,
        description: event.description,
        user: event.user,
        time: event.time,
        projectId: event.projectId,
        projectName: event.projectName,
        eventType: event.action,
      });
    });

    userTasks.slice(0, 10).forEach(task => {
      let actionText = "";
      if (task.status === 'Completed') actionText = "Completada";
      else if (task.status === 'In Progress') actionText = "En progreso";
      else actionText = "Pendiente";

      allActivities.push({
        id: `task-${task.id}`,
        type: "task",
        title: task.projects?.name || "Proyecto General",
        description: task.description || "Tarea registrada",
        user: profile?.full_name || "Tú",
        time: task.created_at,
        action: actionText,
      });
    });

    if (isManagerOrAdmin || userProjects.length > 0) {
      userProjects.slice(0, 4).forEach(project => {
        const projectTasks = userTasks.filter((t: any) => String(t.project_id) === String(project.id));
        allActivities.push({
          id: `project-${project.id}`,
          type: "project",
          title: project.name,
          description: `${projectTasks.length} tareas · ${projectTasks.filter(t => t.status === 'Completed').length} completadas`,
          user: profile?.full_name || "Tú",
          time: project.created_at,
          projectId: project.id,
          projectName: project.name,
        });
      });
    }

    userExports.forEach(exp => {
      allActivities.push({
        id: exp.id,
        type: "export",
        title: "Exportación de tareas",
        description: exp.description,
        user: profile?.full_name || "Tú",
        time: exp.time,
      });
    });

    return allActivities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [userTasks, userProjects, userExports, projectEvents, profile, isManagerOrAdmin]);

  const filteredActivities = activities.filter(activity => {
    if (selectedType === "all") return true;
    if (selectedType === "tasks") return activity.type === "task";
    if (selectedType === "projects") return activity.type === "project";
    if (selectedType === "exports") return activity.type === "export";
    if (selectedType === "project_events") return activity.type === "project_event";
    return true;
  });

  const groupedActivities = useMemo(() => {
    const groups: { [key: string]: Activity[] } = {};
    filteredActivities.forEach(activity => {
      const date = new Date(activity.time);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let groupKey = "";
      if (date.toDateString() === today.toDateString()) {
        groupKey = "HOY";
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = "AYER";
      } else {
        groupKey = formatDistanceToNow(date, { addSuffix: true, locale: es }).toUpperCase();
      }
      
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(activity);
    });
    return groups;
  }, [filteredActivities]);

  const getTimeAgo = (time: string) => {
    try {
      return formatDistanceToNow(new Date(time), { addSuffix: true, locale: es });
    } catch {
      return "hace un momento";
    }
  };

  const getIcon = (activity: Activity) => {
    if (activity.type === "task") return <CheckSquare className="h-4 w-4 text-primary" />;
    
    if (activity.type === "project_event") {
      switch (activity.eventType) {
        case 'assigned': return <UserPlus className="h-4 w-4 text-green-500" />;
        case 'removed': return <UserMinus className="h-4 w-4 text-red-500" />;
        case 'member_added': return <Users className="h-4 w-4 text-blue-500" />;
        case 'member_removed': return <UserMinus className="h-4 w-4 text-orange-500" />;
        case 'updated': return <Pencil className="h-4 w-4 text-purple-500" />;
        default: return <FolderKanban className="h-4 w-4 text-indigo-500" />;
      }
    }
    
    if (activity.type === "project") return <FolderKanban className="h-4 w-4 text-indigo-500" />;
    if (activity.type === "export") return <Download className="h-4 w-4 text-cyan-500" />;
    
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const isClickable = (activity: Activity) => {
    if (activity.type === "task") return true;
    if (activity.type === "project" && isTechnician) return false;
    if (activity.type === "project" && !isTechnician) return true;
    return false;
  };

  const handleClick = (activity: Activity) => {
    if (activity.type === "task") navigate("/tasks");
    if (activity.type === "project" && !isTechnician) navigate("/projects");
  };

  return (
    <div className="h-full overflow-y-auto p-4 custom-scrollbar space-y-6">
      {Object.entries(groupedActivities).length === 0 ? (
        <div className="flex flex-col items-center justify-center text-muted-foreground h-full">
          <Activity className="h-12 w-12 opacity-30 mb-3" />
          <p className="text-sm font-medium">No hay actividad reciente</p>
          <p className="text-xs mt-1">Las actividades aparecerán aquí cuando registres tareas</p>
        </div>
      ) : (
        Object.entries(groupedActivities).map(([date, items]) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-3 w-3 text-primary" />
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider">{date}</h4>
              <div className="flex-1 h-px bg-gradient-to-r from-primary/20 to-transparent" />
            </div>
            <div className="space-y-3 pl-2">
              {items.map((activity) => (
                <div
                  key={activity.id}
                  onClick={() => isClickable(activity) && handleClick(activity)}
                  className={`group p-3 rounded-xl transition-all duration-200 ${
                    isClickable(activity) 
                      ? "hover:bg-muted/50 hover:shadow-md cursor-pointer" 
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      {getIcon(activity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-semibold text-foreground">{activity.title}</p>
                        {activity.action && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            activity.action === "Completada" ? "bg-emerald-500/10 text-emerald-600" :
                            activity.action === "En progreso" ? "bg-amber-500/10 text-amber-600" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {activity.action}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {activity.user}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60">•</span>
                        <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getTimeAgo(activity.time)}
                        </span>
                      </div>
                    </div>
                    {isClickable(activity) && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export function ActivityFeed() {
  const { data: tasks = [] } = useTasks();
  const { data: projects = [] } = useProjects();
  const { user, profile } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ActivityType>("all");

  const userRole = profile?.role || 'Technician';
  const isTechnician = userRole === 'Technician';
  const isManagerOrAdmin = userRole === 'Admin' || userRole === 'Manager';

  const typeButtons: { value: ActivityType; label: string; icon: any }[] = [
    { value: "all", label: "Todo", icon: Activity },
    { value: "tasks", label: "Tareas", icon: CheckSquare },
    { value: "projects", label: "Proyectos", icon: FolderKanban },
    { value: "exports", label: "Exportaciones", icon: Download },
    { value: "project_events", label: "Eventos", icon: Calendar },
  ];

  return (
    <>
      <div 
        className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col"
        style={{ height: "420px" }}
      >
        <div className="p-4 border-b border-border shrink-0 bg-gradient-to-r from-card to-muted/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Actividad Reciente</h3>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
              title="Expandir"
            >
              <Maximize2 className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {typeButtons.map((btn) => (
              <button
                key={btn.value}
                onClick={() => setSelectedType(btn.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  selectedType === btn.value
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <btn.icon className="h-3 w-3" />
                {btn.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 min-h-0">
          <ActivityList 
            tasks={tasks}
            projects={projects}
            user={user}
            profile={profile}
            isTechnician={isTechnician}
            isManagerOrAdmin={isManagerOrAdmin}
            selectedType={selectedType}
          />
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl w-[90vw] h-[85vh] bg-card border-border flex flex-col p-0 rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex flex-col h-full">
            <div className="p-5 border-b border-border shrink-0 bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold text-foreground">Actividad Reciente</h2>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Historial de tareas, proyectos y eventos del sistema
              </p>
              
              <div className="flex items-center gap-1.5 flex-wrap mt-4">
                {typeButtons.map((btn) => (
                  <button
                    key={btn.value}
                    onClick={() => setSelectedType(btn.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      selectedType === btn.value
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <btn.icon className="h-3 w-3" />
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex-1 min-h-0">
              <ActivityList 
                tasks={tasks}
                projects={projects}
                user={user}
                profile={profile}
                isTechnician={isTechnician}
                isManagerOrAdmin={isManagerOrAdmin}
                selectedType={selectedType}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}