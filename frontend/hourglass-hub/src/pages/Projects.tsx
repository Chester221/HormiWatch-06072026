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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Search, MoreVertical, Calendar, Clock, ArrowUpRight,
  Pencil, Loader2, Trash2, Crown, Users, AlertTriangle
} from "lucide-react";
import { ProjectDetailModal } from "@/components/projects/ProjectDetailModal";
import { ProjectFormModal } from "@/components/projects/ProjectFormModal";
import { cn } from "@/lib/utils";
import { useProjects, useDeleteProject } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
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
  teamLead: { name: string; avatar: string; id?: string };
  team: { name: string; avatar: string; id?: string; role?: string }[];
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
  const { user, profile } = useAuth();

  // ✅ Roles
  const userRole = profile?.role;
  const isAdmin = userRole === 'Admin';
  const isManager = userRole === 'Manager';
  const isTechnician = userRole === 'Technician';

  // ✅ Solo Manager puede crear/editar/eliminar (Admin solo lectura)
  const canEdit = isManager;
  const canCreate = isManager;
  const canDelete = isManager;

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; projectId: string; projectName: string }>({
    open: false, projectId: '', projectName: ''
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: rawProjects = [], isLoading: loading, refetch } = useProjects();

  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase.from('project_members').select('*, profiles(id, full_name, avatar_url, role)');
      setProjectMembers(data || []);
    };
    fetchMembers();
  }, [rawProjects]);

  const getProjectLeader = (projectId: string) => {
    const leader = projectMembers.find(pm => pm.project_id === projectId && pm.role_in_project === 'leader');
    if (leader?.profiles) return { name: leader.profiles.full_name || 'Sin nombre', avatar: leader.profiles.avatar_url || '', id: leader.profiles.id };
    return null;
  };

  const getProjectTeam = (projectId: string) => {
    return projectMembers.filter(pm => pm.project_id === projectId && pm.role_in_project !== 'leader')
      .map(pm => ({ name: pm.profiles?.full_name || 'Sin nombre', avatar: pm.profiles?.avatar_url || '', id: pm.profiles?.id, role: pm.role_in_project }));
  };

  const projects: Project[] = rawProjects.map((item: any) => {
    const hoursPool = item.pool_hours || 0;
    const hoursConsumed = item.hours_consumed || 0;
    const leader = getProjectLeader(item.id);
    const team = getProjectTeam(item.id);
    return {
      id: item.id, name: item.name, client: item.clients?.name || "Sin cliente", clientId: item.client_id,
      status: item.status || "active", hoursPool, hoursConsumed,
      progress: hoursPool > 0 ? Math.min((hoursConsumed / hoursPool) * 100, 100) : 0,
      endDate: item.end_date || new Date().toISOString(), startDate: item.start_date, rate: item.hourly_rate || 0,
      teamLead: leader || { name: "Sin líder", avatar: "", id: undefined }, team,
    };
  });

  // ✅ Filtrar proyectos según rol
  const filteredProjects = projects.filter(p => {
    // Admin: ve todos (solo lectura)
    // Manager: ve todos
    if (isAdmin || isManager) return true;
    // Technician: solo proyectos donde está asignado
    if (isTechnician) {
      return p.team.some(m => m.id === user?.id) || p.teamLead.id === user?.id;
    }
    return true;
  }).filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.client.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleProjectClick = (p: Project) => { setSelectedProject(p); setDetailModalOpen(true); };
  const handleCreateProject = () => { 
    if (!canCreate) return;
    setEditingProject(null); 
    setFormModalOpen(true); 
  };
  const handleEditProject = (p: Project, e?: React.MouseEvent) => { 
    if (!canEdit) return;
    if (e) e.stopPropagation(); 
    setEditingProject(p); 
    setFormModalOpen(true); 
  };

  const handleDeleteClick = (id: string, name: string, e: React.MouseEvent) => {
    if (!canDelete) return;
    e.stopPropagation();
    setDeleteDialog({ open: true, projectId: id, projectName: name });
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteProjectMutation.mutateAsync({ projectId: deleteDialog.projectId, userId: user?.id || '' });
      toast.success(`"${deleteDialog.projectName}" eliminado`);
      setDeleteDialog({ open: false, projectId: '', projectName: '' });
      refetch();
    } catch (error: any) { toast.error(`Error: ${error.message}`); }
    setIsDeleting(false);
  };

  const handleMemberClick = (memberId: string, e: React.MouseEvent) => { e.stopPropagation(); navigate(`/team?member=${memberId}`); };

  const handleDetailModalClose = (open: boolean) => {
    setDetailModalOpen(open);
    if (!open) { queryClient.invalidateQueries({ queryKey: ['projects'] }); refetch(); }
  };

  const handleFormModalClose = (open: boolean) => {
    setFormModalOpen(open);
    if (!open) { queryClient.invalidateQueries({ queryKey: ['projects'] }); refetch(); }
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between opacity-0 animate-fade-in">
        <div><h1 className="text-3xl font-bold tracking-tight text-foreground">Proyectos</h1><p className="mt-1 text-muted-foreground">Gestiona y monitorea todos los proyectos de tu equipo</p></div>
        {/* ✅ Solo Manager puede crear nuevos proyectos */}
        {canCreate && (
          <Button className="gap-2 shadow-glow" onClick={handleCreateProject}>
            <Plus className="h-4 w-4" />Nuevo Proyecto
          </Button>
        )}
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center opacity-0 animate-fade-in" style={{ animationDelay: "100ms" }}>
        <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar proyectos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-muted/50 border-transparent focus:border-primary focus:bg-card" /></div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64 w-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.length === 0 && <div className="col-span-full text-center text-muted-foreground py-10">No se encontraron proyectos.</div>}
          {filteredProjects.map((project, index) => (
            <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
              onClick={() => handleProjectClick(project)}
              className={cn("group relative rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 cursor-pointer")}
            >
              <div className="mb-4 flex items-start justify-between">
                <Badge variant="outline" className={cn("text-xs", statusConfig[project.status]?.class || statusConfig.active.class)}>{statusConfig[project.status]?.label || "Activo"}</Badge>
                {/* ✅ Solo Manager puede ver menú de acciones */}
                {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-border">
                      <DropdownMenuItem className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handleProjectClick(project); }}>Ver Detalles</DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer gap-2" onClick={(e) => handleEditProject(project, e)}><Pencil className="h-3.5 w-3.5" /> Editar Proyecto</DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer gap-2 text-red-500" onClick={(e) => handleDeleteClick(project.id, project.name, e)}><Trash2 className="h-3.5 w-3.5" /> Eliminar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <h3 className="mb-1 text-lg font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{project.name}</h3>
              <p className="mb-4 text-sm text-muted-foreground">{project.client}</p>
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between text-sm"><span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Horas</span><span className="font-medium text-foreground">{project.hoursConsumed.toFixed(1)}h / {project.hoursPool}h</span></div>
                <Progress value={Math.min(project.progress, 100)} className="h-2 bg-muted" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <TooltipProvider><Tooltip><TooltipTrigger asChild><div className="relative" onClick={(e) => project.teamLead.id && handleMemberClick(project.teamLead.id, e)}><Avatar className="h-6 w-6 border-1.5 border-card ring-1 ring-amber-500/40"><AvatarImage src={project.teamLead.avatar} /><AvatarFallback className="bg-amber-500/10 text-amber-600 text-[9px] font-bold">{project.teamLead.name?.charAt(0).toUpperCase() || '?'}</AvatarFallback></Avatar></div></TooltipTrigger><TooltipContent side="bottom" className="text-[11px] py-1 px-2"><p className="font-medium">{project.teamLead.name}</p><p className="text-muted-foreground">👑 Líder</p></TooltipContent></Tooltip></TooltipProvider>
                  {project.team.length > 0 && <div className="w-px h-4 bg-border/50 mx-0.5" />}
                  <div className="flex -space-x-1.5">
                    {project.team.slice(0, 3).map((member, i) => (
                      <TooltipProvider key={i}><Tooltip><TooltipTrigger asChild><Avatar className="h-6 w-6 border-1.5 border-card hover:scale-110 transition-transform cursor-pointer" onClick={(e) => member.id && handleMemberClick(member.id, e)}><AvatarImage src={member.avatar} /><AvatarFallback className="bg-muted text-muted-foreground text-[9px] font-bold">{member.name?.charAt(0).toUpperCase() || '?'}</AvatarFallback></Avatar></TooltipTrigger><TooltipContent side="bottom" className="text-[11px] py-1 px-2"><p className="font-medium">{member.name}</p><p className="text-muted-foreground">👤 Miembro</p></TooltipContent></Tooltip></TooltipProvider>
                    ))}
                    {project.team.length > 3 && <div className="flex h-6 w-6 items-center justify-center rounded-full border-1.5 border-card bg-muted text-[9px] font-bold text-muted-foreground">+{project.team.length - 3}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground"><Calendar className="h-3 w-3" />{new Date(project.endDate).toLocaleDateString("es-ES", { month: "short", day: "numeric" })}</div>
              </div>
              <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0"><ArrowUpRight className="h-5 w-5 text-primary" /></div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <DialogContent className="sm:max-w-md bg-card border-border p-0 overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-red-500/10 to-red-500/5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/20 ring-4 ring-red-500/10"><AlertTriangle className="h-6 w-6 text-red-500" /></div>
              <div><DialogTitle className="text-lg font-semibold">Eliminar Proyecto</DialogTitle><p className="text-sm text-muted-foreground mt-0.5">Esta acción no se puede deshacer</p></div>
            </div>
          </div>
          <div className="p-6 pt-4">
            <p className="text-sm text-foreground">¿Eliminar permanentemente <span className="font-semibold text-red-400">"{deleteDialog.projectName}"</span>?</p>
            <div className="mt-3 bg-red-500/5 border border-red-500/10 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-400">Si el proyecto no tiene tareas, se eliminará directamente. Si tiene tareas, solo se eliminará si está completado o cancelado.</p>
            </div>
          </div>
          <DialogFooter className="p-4 pt-0 gap-2">
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, projectId: '', projectName: '' })} className="flex-1">Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting} className="flex-1 font-medium">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Trash2 className="h-4 w-4 mr-1.5" />}Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProjectDetailModal project={selectedProject} open={detailModalOpen} onOpenChange={handleDetailModalClose} />
      <ProjectFormModal open={formModalOpen} onOpenChange={handleFormModalClose} project={editingProject} />
    </DashboardLayout>
  );
};

export default Projects;