import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Trash2,
  Crown,
  Users
} from "lucide-react";
import { ProjectDetailModal } from "@/components/projects/ProjectDetailModal";
import { ProjectFormModal } from "@/components/projects/ProjectFormModal";
import { cn } from "@/lib/utils";
import { useProjects, useDeleteProject } from "@/hooks/useProjects";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

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
    role?: string;
  }[];
}

const statusConfig: Record<string, { label: string; class: string }> = {
  active: { label: "Activo", class: "bg-green-500/10 text-green-600 border-green-500/20" },
  completed: { label: "Completado", class: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  "on-hold": { label: "En Pausa", class: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  planning: { label: "Planificación", class: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
  "Not Started": { label: "Por Empezar", class: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
  "In Progress": { label: "En Progreso", class: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  "Completed": { label: "Terminado", class: "bg-green-500/10 text-green-600 border-green-500/20" },
  "On Hold": { label: "En Espera", class: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  "Cancelled": { label: "Cancelado", class: "bg-red-500/10 text-red-600 border-red-500/20" },
  default: { label: "Desconocido", class: "bg-slate-100 text-slate-500 border-slate-200" }
};

const Projects = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const queryClient = useQueryClient();
  const deleteProjectMutation = useDeleteProject();
  const navigate = useNavigate();

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const { data: rawProjects = [], isLoading: loading, refetch } = useProjects();

  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase
        .from('project_members')
        .select('*, profiles(id, full_name, avatar_url, role)');
      setProjectMembers(data || []);
    };
    fetchMembers();
  }, []);

  const getProjectLeader = (projectId: string) => {
    const leader = projectMembers.find(
      pm => pm.project_id === projectId && pm.role_in_project === 'leader'
    );
    if (leader?.profiles) {
      return {
        name: leader.profiles.full_name || 'Sin nombre',
        avatar: leader.profiles.avatar_url || '',
        id: leader.profiles.id,
      };
    }
    return null;
  };

  const getProjectTeam = (projectId: string) => {
    return projectMembers
      .filter(pm => pm.project_id === projectId && pm.role_in_project !== 'leader')
      .map(pm => ({
        name: pm.profiles?.full_name || 'Sin nombre',
        avatar: pm.profiles?.avatar_url || '',
        id: pm.profiles?.id,
        role: pm.role_in_project,
      }));
  };

  const projects: Project[] = rawProjects.map((item: any) => {
    const hoursPool = item.pool_hours || 0;
    const hoursConsumed = item.hours_consumed || 0;
    const leader = getProjectLeader(item.id);
    const team = getProjectTeam(item.id);

    return {
      id: item.id,
      name: item.name,
      client: item.clients?.name || "Sin cliente",
      clientId: item.client_id,
      status: item.status || "active",
      hoursPool,
      hoursConsumed,
      progress: hoursPool > 0 ? (hoursConsumed / hoursPool) * 100 : 0,
      endDate: item.end_date || new Date().toISOString(),
      startDate: item.start_date,
      rate: item.hourly_rate || 0,
      teamLead: leader || {
        name: "Sin líder",
        avatar: "",
        id: undefined,
      },
      team: team,
    };
  });

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

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("¿Estás seguro de eliminar este proyecto?")) return;
    deleteProjectMutation.mutate(id);
  };

  const handleMemberClick = (memberId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/team`);
  };

  return (
    <DashboardLayout>
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
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleProjectClick(project)}
              className={cn(
                "group relative rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 cursor-pointer"
              )}
            >
              <div className="mb-4 flex items-start justify-between">
                <Badge variant="outline" className={cn("text-xs", statusConfig[project.status]?.class || statusConfig.active.class)}>
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
                      <Pencil className="h-3.5 w-3.5" /> Editar Proyecto
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer gap-2 text-red-500" onClick={(e) => handleDeleteProject(project.id, e)}>
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <h3 className="mb-1 text-lg font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                {project.name}
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">{project.client}</p>

              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Horas
                  </span>
                  <span className="font-medium text-foreground">
                    {project.hoursConsumed}h / {project.hoursPool}h
                  </span>
                </div>
                <Progress value={project.progress} className="h-2 bg-muted" />
              </div>

              {/* Footer: Equipo + Fecha - ESTILO CLICKUP */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="relative" onClick={(e) => project.teamLead.id && handleMemberClick(project.teamLead.id, e)}>
                          <Avatar className="h-6 w-6 border-1.5 border-card ring-1 ring-amber-500/40">
                            <AvatarImage src={project.teamLead.avatar} />
                            <AvatarFallback className="bg-amber-500/10 text-amber-600 text-[9px] font-bold">
                              {project.teamLead.name?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-[11px] py-1 px-2">
                        <p className="font-medium">{project.teamLead.name}</p>
                        <p className="text-muted-foreground">👑 Líder</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {project.team.length > 0 && (
                    <div className="w-px h-4 bg-border/50 mx-0.5" />
                  )}

                  <div className="flex -space-x-1.5">
                    {project.team.slice(0, 3).map((member, i) => (
                      <TooltipProvider key={i}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Avatar
                              className="h-6 w-6 border-1.5 border-card hover:scale-110 transition-transform cursor-pointer"
                              onClick={(e) => member.id && handleMemberClick(member.id, e)}
                            >
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback className="bg-muted text-muted-foreground text-[9px] font-bold">
                                {member.name?.charAt(0).toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-[11px] py-1 px-2">
                            <p className="font-medium">{member.name}</p>
                            <p className="text-muted-foreground">👤 Miembro</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                    {project.team.length > 3 && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full border-1.5 border-card bg-muted text-[9px] font-bold text-muted-foreground">
                        +{project.team.length - 3}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(project.endDate).toLocaleDateString("es-ES", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>

              <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                <ArrowUpRight className="h-5 w-5 text-primary" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <ProjectDetailModal project={selectedProject} open={detailModalOpen} onOpenChange={setDetailModalOpen} />
      <ProjectFormModal open={formModalOpen} onOpenChange={(open) => { setFormModalOpen(open); if (!open) queryClient.invalidateQueries({ queryKey: ['projects'] }); }} project={editingProject} />
    </DashboardLayout>
  );
};

export default Projects;