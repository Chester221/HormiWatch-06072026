import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, CheckSquare, FolderKanban, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ActivityFeed() {
  const { data: tasks = [] } = useTasks();
  const { data: projects = [] } = useProjects();
  const navigate = useNavigate();

  const activities = [
    ...tasks.slice(0, 5).map(task => ({
      id: task.id,
      type: "task" as const,
      title: task.description || "Sin descripción",
      subtitle: task.projects?.name || "Sin proyecto",
      status: task.status,
      time: task.created_at,
      icon: CheckSquare,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      link: "/tasks",
    })),
    ...projects.slice(0, 5).map(project => ({
      id: project.id,
      type: "project" as const,
      title: project.name,
      subtitle: project.description || "Sin descripción",
      status: project.status,
      time: project.created_at,
      icon: FolderKanban,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      link: "/projects",
    })),
  ]
  .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  .slice(0, 6);

  if (activities.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">Actividad Reciente</h3>
        <p className="text-xs text-muted-foreground mb-4">Últimas tareas y proyectos registrados</p>
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50 mb-3">
            <Clock className="h-6 w-6 opacity-40" />
          </div>
          <p className="text-sm font-medium">No hay actividad aún</p>
          <p className="text-xs mt-1">Registra tu primera tarea o proyecto</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed": return { label: "Completado", class: "bg-emerald-500/10 text-emerald-600" };
      case "In Progress": case "active": return { label: "En progreso", class: "bg-blue-500/10 text-blue-600" };
      case "Pending": return { label: "Pendiente", class: "bg-amber-500/10 text-amber-600" };
      default: return { label: status, class: "bg-slate-500/10 text-slate-600" };
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-semibold text-foreground">Actividad Reciente</h3>
        <span className="text-xs text-muted-foreground">{activities.length} registros</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Últimas tareas y proyectos registrados en el sistema</p>

      <div className="space-y-1">
        {activities.map((activity) => {
          const Icon = activity.icon;
          const badge = getStatusBadge(activity.status);
          return (
            <div
              key={activity.id}
              onClick={() => navigate(activity.link)}
              className="group flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-all cursor-pointer"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${activity.bg} ${activity.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{activity.title}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${badge.class}`}>
                    {badge.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{activity.subtitle}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(activity.time), { addSuffix: true, locale: es })}
                </p>
              </div>
              <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-center">
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 