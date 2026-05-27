import { useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { 
  CheckSquare, 
  FolderKanban, 
  Clock, 
  Download,
  ArrowUpRight,
  Sun,
  Moon,
  Calendar,
  ListFilter,
  User
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

type FilterType = "all" | "task" | "project" | "export";

export function ActivityFeed() {
  const { data: tasks = [] } = useTasks();
  const { data: projects = [] } = useProjects();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>("all");

  const activities = [
    ...tasks.slice(0, 8).map(task => {
      const isDiurno = !task.normal_hours || task.normal_hours > 0;
      const hasOvertime = (task as any).overtime_hours > 0;
      const isHoliday = (task as any).is_holiday;
      
      let icon = Clock;
      let color = "text-blue-500";
      let bg = "bg-blue-500/10";
      let tipoActividad = "Tarea registrada";
      
      if (isHoliday) {
        icon = Calendar;
        color = "text-red-500";
        bg = "bg-red-500/10";
        tipoActividad = "Tarea en feriado";
      } else if (hasOvertime && isDiurno) {
        icon = Moon;
        color = "text-purple-500";
        bg = "bg-purple-500/10";
        tipoActividad = "Tarea mixta";
      } else if (hasOvertime) {
        icon = Moon;
        color = "text-amber-500";
        bg = "bg-amber-500/10";
        tipoActividad = "Tarea nocturna";
      } else {
        icon = Sun;
        color = "text-emerald-500";
        bg = "bg-emerald-500/10";
        tipoActividad = "Tarea diurna";
      }
      
      return {
        id: `task-${task.id}`,
        type: "task" as const,
        icon,
        color,
        bg,
        title: task.description || "Sin descripción",
        subtitle: `${tipoActividad} · ${task.projects?.name || "General"}`,
        time: task.created_at,
        link: "/tasks",
        extra: task.status === 'Completed' ? '✅' : '⏳',
        user: task.technician?.full_name || "Técnico",
      };
    }),
    
    ...projects.slice(0, 4).map(project => ({
      id: `project-${project.id}`,
      type: "project" as const,
      icon: FolderKanban,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
      title: project.name,
      subtitle: `Nuevo proyecto${project.client_id ? ' · Con cliente' : ''}`,
      time: project.created_at,
      link: "/projects",
      extra: project.status === 'active' ? '🟢' : '⚪',
      user: (project as any).created_by_name || "Admin",
    })),
    
    ...tasks.filter(t => t.status === 'Completed').slice(0, 2).map(task => ({
      id: `export-${task.id}`,
      type: "export" as const,
      icon: Download,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
      title: `Exportación de tareas`,
      subtitle: `Proyecto: ${task.projects?.name || "General"}`,
      time: new Date().toISOString(),
      link: null,
      extra: '📥',
      user: profile?.full_name || "Usuario",
    })),
  ]
  .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const filteredActivities = filter === "all" 
    ? activities 
    : activities.filter(a => a.type === filter);

  const getTimeAgo = (time: string) => {
    try {
      return formatDistanceToNow(new Date(time), { addSuffix: true, locale: es });
    } catch {
      return "hace un momento";
    }
  };

  const filters: { value: FilterType; label: string; color: string }[] = [
    { value: "all", label: "Todo", color: "bg-slate-500/10 text-slate-600" },
    { value: "task", label: "Tareas", color: "bg-emerald-500/10 text-emerald-600" },
    { value: "project", label: "Proyectos", color: "bg-indigo-500/10 text-indigo-600" },
    { value: "export", label: "Export", color: "bg-cyan-500/10 text-cyan-600" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-6 flex flex-col" style={{ height: "420px" }}>
      {/* Header con filtros al lado */}
      <div className="flex items-center justify-between mb-1 shrink-0">
        <h3 className="text-lg font-semibold text-foreground">Actividad Reciente</h3>
        <div className="flex items-center gap-1.5">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-all ${
                filter === f.value
                  ? f.color + " ring-1 ring-current/20"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-4 shrink-0">Últimas tareas y proyectos registrados</p>

      {filteredActivities.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <ListFilter className="h-8 w-8 opacity-30 mb-2" />
          <p className="text-sm font-medium">Sin actividad</p>
          <p className="text-xs mt-1">No hay registros de este tipo</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-2 space-y-1 custom-scrollbar">
          {filteredActivities.map((activity) => {
            const Icon = activity.icon;
            const isClickable = activity.link !== null;
            
            return (
              <div
                key={activity.id}
                onClick={() => isClickable && navigate(activity.link)}
                className={`group flex items-start gap-3 p-3 rounded-xl transition-all ${
                  isClickable 
                    ? "hover:bg-muted/50 cursor-pointer" 
                    : "cursor-default"
                }`}
              >
                {/* TAMAÑO ORIGINAL RESTAURADO */}
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${activity.bg} ${activity.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {/* TAMAÑO ORIGINAL RESTAURADO */}
                    <p className="text-sm font-medium text-foreground truncate">{activity.title}</p>
                    <span className="text-xs shrink-0">{activity.extra}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{activity.subtitle}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {/* TAMAÑO ORIGINAL RESTAURADO */}
                    <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {activity.user}
                    </span>
                    <span className="text-xs text-muted-foreground/60">·</span>
                    <span className="text-xs text-muted-foreground/60">
                      {getTimeAgo(activity.time)}
                    </span>
                  </div>
                </div>
                {isClickable && (
                  <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-center">
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}