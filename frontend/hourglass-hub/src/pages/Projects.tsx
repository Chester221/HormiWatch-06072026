import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Calendar,
  Clock,
  ArrowUpRight,
  Pencil,
  Loader2,
  Trash2
} from "lucide-react";
import { ProjectDetailModal } from "@/components/projects/ProjectDetailModal";
import { ProjectFormModal } from "@/components/projects/ProjectFormModal";
import { cn } from "@/lib/utils";
import { useProjects, useDeleteProject } from "@/hooks/useProjects";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

// Interfaz adaptada para el Frontend
export interface Project {
  id: string;
  name: string;
  client: string;
  clientId?: string;
  status: "active" | "completed" | "on-hold" | "planning" | "In Progress" | "Not Started" | "Cancelled";
  progress: number;
  hoursConsumed: number;
  hoursPool: number;
  endDate: string;
  startDate?: string;
  rate?: number;
  teamLead: {
    name: string;
    avatar: string;
    id?: string;
  };
  team: {
    name: string;
    avatar: string;
    id?: string;
  }[];
}

// Configuración de colores para los estados
const statusConfig: Record<string, { label: string; class: string }> = {
  active: { label: "Activo", class: "bg-green-500/10 text-green-600 border-green-500/20" },
  completed: { label: "Completado", class: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  "on-hold": { label: "En Pausa", class: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  planning: { label: "Planificación", class: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
  // Supabase Enum Values
  "Not Started": { label: "Por Empezar", class: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
  "In Progress": { label: "En Progreso", class: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  "Completed": { label: "Terminado", class: "bg-green-500/10 text-green-600 border-green-500/20" },
  "On Hold": { label: "En Espera", class: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  "Cancelled": { label: "Cancelado", class: "bg-red-500/10 text-red-600 border-red-500/20" },
  // Fallback
  default: { label: "Desconocido", class: "bg-slate-100 text-slate-500 border-slate-200" }
};

const Projects = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  const deleteProjectMutation = useDeleteProject();

  // Estados para modales
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Obtener proyectos desde Supabase
  const { data: rawProjects = [], isLoading: loading, refetch } = useProjects();

  // Transformar datos de Supabase a formato del frontend
  const projects: Project[] = rawProjects.map((item: any) => {
    const isExpired = item.end_date && new Date(item.end_date) < new Date();
    const status = item.status || (isExpired ? "completed" : "active");
    const hoursPool = item.pool_hours || 0;
    const hoursConsumed = item.hours_consumed || 0;

    return {
      id: item.id,
      name: item.name,
      client: item.clients?.name || "Sin cliente",
      clientId: item.client_id,
      status: status as Project["status"],
      hoursPool,
      hoursConsumed,
      progress: hoursPool > 0 ? (hoursConsumed / hoursPool) * 100 : 0,
      endDate: item.end_date || new Date().toISOString(),
      startDate: item.start_date,
      rate: item.hourly_rate || 0,
      teamLead: {
        name: item.project_leader?.full_name || "Sin líder",
        avatar: item.project_leader?.avatar_url || "",
        id: item.project_leader_id,
      },
      team: [], // Se cargará aparte si es necesario
    };
  });

  // Filtrado local (Buscador)
  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.client.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setDetailModalOpen(true);
  };

  const handleCreateProject = () => {
    setEditingProject(null);
    setFormModalOpen(true);
  };

  const handleEditProject = (project: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProject(project);
    setFormModalOpen(true);
  };

  // Función para eliminar proyecto
  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
  e.stopPropagation();
  
  if (!window.confirm("¿Estás seguro de eliminar este proyecto? Si tiene tareas asociadas, no se podrá eliminar.")) return;

  deleteProjectMutation.mutate(id);
};

  return (
    <DashboardLayout>
      {/* Encabezado de Página */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between opacity-0 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Proyectos</h1>
          <p className="mt-1 text-muted-foreground">
            Gestiona y monitorea todos los proyectos de tu equipo
          </p>
        </div>
        <Button className="gap-2 shadow-glow" onClick={handleCreateProject}>
          <Plus className="h-4 w-4" />
          Nuevo Proyecto
        </Button>
      </div>

      {/* Filtros y Buscador */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center opacity-0 animate-fade-in" style={{ animationDelay: "100ms" }}>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar proyectos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/50 border-transparent focus:border-primary focus:bg-card"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
        </Button>
      </div>

      {/* Grid de Proyectos */}
      {loading ? (
        <div className="flex justify-center items-center h-64 w-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-10">
              No se encontraron proyectos.
            </div>
          )}
          {filteredProjects.map((project, index) => (
            <div
              key={project.id}
              onClick={() => handleProjectClick(project)}
              className={cn(
                "group relative rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 cursor-pointer",
                "opacity-0 animate-fade-in"
              )}
              style={{ animationDelay: `${150 + index * 50}ms` }}
            >
              {/* Cabecera de la Tarjeta */}
              <div className="mb-4 flex items-start justify-between">
                <Badge
                  variant="outline"
                  className={cn("text-xs", statusConfig[project.status]?.class || statusConfig.active.class)}
                >
                  {statusConfig[project.status]?.label || "Activo"}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card border-border">
                    <DropdownMenuItem className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handleProjectClick(project); }}>
                      Ver Detalles
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer gap-2" onClick={(e) => handleEditProject(project, e)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Editar Proyecto
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer gap-2 text-red-500 focus:text-red-500" onClick={(e) => handleDeleteProject(project.id, e)}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Título y Cliente */}
              <h3 className="mb-1 text-lg font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                {project.name}
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">{project.client}</p>

              {/* Progreso de Horas */}
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Horas
                  </span>
                  <span className="font-medium text-foreground">
                    {project.hoursConsumed}h / {project.hoursPool}h
                  </span>
                </div>
                <Progress
                  value={project.progress}
                  className="h-2 bg-muted"
                />
              </div>

              {/* Footer (Equipo y Fechas) */}
              <div className="flex items-center justify-between">
                {/* Equipo */}
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 border-2 border-card ring-2 ring-primary/20">
                    <AvatarImage src={project.teamLead.avatar} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                      {project.teamLead.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Renderizado condicional del equipo */}
                  <div className="flex -space-x-2 ml-2">
                    {project.team.slice(0, 3).map((member, i) => (
                      <Avatar key={i} className="h-7 w-7 border-2 border-card">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                          {member.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {project.team.length > 3 && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-medium text-muted-foreground">
                        +{project.team.length - 3}
                      </div>
                    )}
                  </div>
                </div>

                {/* Fecha Fin */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(project.endDate).toLocaleDateString("es-ES", {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  })}
                </div>
              </div>

              {/* Flecha Hover */}
              <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                <ArrowUpRight className="h-5 w-5 text-primary" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Detalle */}
      <ProjectDetailModal
        project={selectedProject}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />

      {/* Modal de Formulario (Crear/Editar) */}
      <ProjectFormModal
        open={formModalOpen}
        onOpenChange={(open) => {
          setFormModalOpen(open);
          if (!open) {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
          }
        }}
        project={editingProject}
      />
    </DashboardLayout>
  );
};

export default Projects;