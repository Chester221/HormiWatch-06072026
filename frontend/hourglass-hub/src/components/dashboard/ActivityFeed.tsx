import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, FolderKanban, CheckSquare } from "lucide-react";

export function ActivityFeed() {
  const { data: tasks = [] } = useTasks();
  const { data: projects = [] } = useProjects();

  // Crear actividades combinadas
  const activities = [
    ...tasks.slice(0, 5).map(task => ({
      id: task.id,
      type: "task",
      title: task.title || "Tarea",
      created_at: task.created_at,
      icon: CheckSquare,
      iconColor: "text-primary",
    })),
    ...projects.slice(0, 5).map(project => ({
      id: project.id,
      type: "project",
      title: project.name,
      created_at: project.created_at,
      icon: FolderKanban,
      iconColor: "text-cyan-500",
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (activities.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Clock className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">No hay actividad reciente</p>
          <p className="text-xs">Crea tareas o proyectos para ver actividad aquí</p>
        </div>
      </div>
    );
  }

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
                  {activity.type === "task" ? "Tarea:" : "Proyecto:"} {activity.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: es })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}