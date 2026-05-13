import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, CheckSquare, FolderKanban } from "lucide-react";

export function ActivityFeed() {
  // Aseguramos que siempre sean arrays
  const { data: tasks = [] } = useTasks();
  const { data: projects = [] } = useProjects();

  // Si no hay datos, mostramos mensaje
  if (tasks.length === 0 && projects.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Clock className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">No hay actividad reciente</p>
        </div>
      </div>
    );
  }

  // Combinar tareas y proyectos en una sola lista de actividades
  const activities = [
    ...tasks.slice(0, 5).map(task => ({
      id: task.id,
      type: "task",
      title: task.title || "Tarea sin título",
      time: task.created_at,
      icon: CheckSquare,
      iconColor: "text-primary",
    })),
    ...projects.slice(0, 5).map(project => ({
      id: project.id,
      type: "project",
      title: project.name,
      time: project.created_at,
      icon: FolderKanban,
      iconColor: "text-cyan-500",
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
   .slice(0, 5);

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity) => {
          const Icon = activity.icon;
          return (
            <div key={activity.id} className="flex items-start gap-3">
              <div className={`mt-0.5 ${activity.iconColor}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {activity.type === "task" ? "📋 Tarea:" : "📁 Proyecto:"} {activity.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.time), { addSuffix: true, locale: es })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}