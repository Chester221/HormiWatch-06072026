import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus, Search, Calendar, Clock, X,
  Pencil, Loader2, Trash2, Crown, Users, AlertTriangle,
  FolderKanban, CheckCircle, TrendingUp, Building2, ChevronLeft, ChevronRight, Filter,
  LayoutGrid, LayoutList, Lock
} from "lucide-react";
import { ProjectDetailModal } from "@/components/projects/ProjectDetailModal";
import { ProjectFormModal } from "@/components/projects/ProjectFormModal";
import { cn } from "@/lib/utils";
import { useProjects, useDeleteProject } from "@/hooks/useProjects";
import { useClients } from "@/hooks/useClientes";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const HORMI_BLUE = '#0DA2E7';

const statusConfig: Record<string, { label: string; class: string; color: string }> = {
  active: { label: "Activo", class: "bg-emerald-50 text-emerald-700 border-emerald-200", color: "#10b981" },
  completed: { label: "Cerrado", class: "bg-gray-100 text-gray-600 border-gray-300", color: "#6b7280" },
  "on-hold": { label: "En Pausa", class: "bg-amber-50 text-amber-700 border-amber-200", color: "#f59e0b" },
  "In Progress": { label: "En Progreso", class: "bg-sky-50 text-sky-700 border-sky-200", color: HORMI_BLUE },
  "Not Started": { label: "Sin Empezar", class: "bg-slate-50 text-slate-700 border-slate-200", color: "#6b7280" },
  "Cancelled": { label: "Cancelado", class: "bg-red-50 text-red-700 border-red-200", color: "#ef4444" },
  inactive: { label: "Inactivo", class: "bg-amber-50 text-amber-700 border-amber-200", color: "#f59e0b" },
  default: { label: "Activo", class: "bg-emerald-50 text-emerald-700 border-emerald-200", color: "#10b981" }
};

export default function Projects() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const queryClient = useQueryClient();
  const deleteProjectMutation = useDeleteProject();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const userRole = profile?.role;
  const isAdmin = userRole === 'Admin';
  const isManager = userRole === 'Manager';
  const canEdit = isManager;
  const canCreate = isManager;

  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; projectId: string; projectName: string }>({ open: false, projectId: '', projectName: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  // Carrusel
  const [carouselPage, setCarouselPage] = useState(0);
  const projectsPerCarousel = 3;
  const [showAllModal, setShowAllModal] = useState(false);

  // Estados del modal "Ver Todos"
  const [modalSearch, setModalSearch] = useState("");
  const [modalStatusFilter, setModalStatusFilter] = useState("all");
  const [modalView, setModalView] = useState<'grid' | 'compact'>('grid');
  const [modalPage, setModalPage] = useState(1);
  const modalItemsPerPage = 6;

  const { data: rawProjects = [], isLoading: loading, refetch } = useProjects();
  const { data: clients = [] } = useClients("");

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

  const projects = rawProjects.map((item: any) => {
    const hoursPool = item.pool_hours || 0;
    const hoursConsumed = item.hours_consumed || 0;
    const leader = getProjectLeader(item.id);
    const team = getProjectTeam(item.id);
    const projectTasks = item.tasks || [];
    const totalTasks = projectTasks.length;
    const completedTasksCount = projectTasks.filter((t: any) => t.status === 'Completed').length;
    const progressByTasks = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;
    const progressByHours = hoursPool > 0 ? Math.min(Math.round((hoursConsumed / hoursPool) * 100), 100) : 0;
    const progress = totalTasks > 0 ? Math.min(progressByTasks, progressByHours) : progressByHours;
    const lastTaskDate = projectTasks.length > 0
      ? new Date(Math.max(...projectTasks.map((t: any) => new Date(t.created_at).getTime())))
      : new Date(item.created_at);
    const daysSinceLastActivity = Math.floor((new Date().getTime() - lastTaskDate.getTime()) / (1000 * 60 * 60 * 24));
    const isInactive = daysSinceLastActivity > 30 && progress < 100;
    let status = item.status || "active";
    if (progress >= 100) status = "completed";
    else if (isInactive) status = "inactive";
    else if (completedTasksCount > 0) status = "In Progress";
    const isClosed = status === "completed";
    const isDelayed = new Date(item.end_date || new Date()) < new Date() && progress < 100 && !isClosed;

    return {
      id: item.id, name: item.name, client: item.clients?.name || "Sin cliente", clientId: item.client_id,
      status, hoursPool, hoursConsumed, progress, completedTasksCount, totalTasks,
      endDate: item.end_date || new Date().toISOString(), startDate: item.start_date,
      rate: item.hourly_rate || 0, isClosed, isDelayed, isInactive,
      teamLead: leader || { name: "Sin líder", avatar: "", id: undefined }, team,
    };
  });

  const filteredProjects = projects.filter(p => {
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.client.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    if (isAdmin || isManager) return matchesSearch && matchesStatus;
    if (userRole === 'Technician') return matchesSearch && matchesStatus && (p.team.some(m => m.id === user?.id) || p.teamLead.id === user?.id);
    return matchesSearch && matchesStatus;
  });

  // Modal filtrado
  const modalFilteredProjects = filteredProjects.filter(p => {
    const matchesSearch = !modalSearch || p.name.toLowerCase().includes(modalSearch.toLowerCase()) || p.client.toLowerCase().includes(modalSearch.toLowerCase());
    const matchesStatus = modalStatusFilter === "all" || p.status === modalStatusFilter;
    return matchesSearch && matchesStatus;
  });
  const modalTotalPages = Math.ceil(modalFilteredProjects.length / modalItemsPerPage);
  const modalCurrentProjects = modalFilteredProjects.slice((modalPage - 1) * modalItemsPerPage, modalPage * modalItemsPerPage);

  const totalCarouselPages = Math.ceil(filteredProjects.length / projectsPerCarousel);
  const carouselProjects = filteredProjects.slice(carouselPage * projectsPerCarousel, (carouselPage + 1) * projectsPerCarousel);
  const nextCarousel = () => setCarouselPage(p => (p + 1) % Math.max(totalCarouselPages, 1));
  const prevCarousel = () => setCarouselPage(p => (p - 1 + Math.max(totalCarouselPages, 1)) % Math.max(totalCarouselPages, 1));

  const stats = {
    total: projects.length,
    active: projects.filter(p => !p.isClosed && !p.isInactive).length,
    completed: projects.filter(p => p.isClosed).length,
    delayed: projects.filter(p => p.isDelayed).length,
    inactive: projects.filter(p => p.isInactive).length,
  };

  const handleProjectClick = (p: any) => { setSelectedProject(p); setDetailModalOpen(true); };
  const handleCreateProject = () => { if (!canCreate) return; setEditingProject(null); setFormModalOpen(true); };
  const handleEditProject = (p: any, e?: React.MouseEvent) => { if (!canEdit || p.isClosed) return; if (e) e.stopPropagation(); setEditingProject(p); setFormModalOpen(true); };
  const handleDeleteClick = (id: string, name: string, e: React.MouseEvent) => { if (!canEdit) return; e.stopPropagation(); setDeleteDialog({ open: true, projectId: id, projectName: name }); };
  const handleMemberClick = (memberId: string, e: React.MouseEvent) => { e.stopPropagation(); navigate(`/team?member=${memberId}`); };

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

  const getStatusColor = (status: string) => statusConfig[status]?.color || HORMI_BLUE;

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#0DA2E7]/20 to-[#0DA2E7]/5">
                <FolderKanban className="h-6 w-6" style={{ color: HORMI_BLUE }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Proyectos</h1>
                <p className="text-sm text-muted-foreground">{stats.total} proyectos · {stats.active} activos · {stats.completed} cerrados</p>
              </div>
            </div>
          </div>
          {canCreate && (
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button onClick={handleCreateProject} size="sm" className="gap-2 text-white" style={{ backgroundColor: HORMI_BLUE }}>
                <Plus className="h-4 w-4" /> Nuevo Proyecto
              </Button>
            </motion.div>
          )}
        </motion.div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { icon: FolderKanban, label: "Total Proyectos", value: stats.total, sub: `${stats.completed} cerrados`, delay: 0.05 },
            { icon: TrendingUp, label: "Activos", value: stats.active, sub: "En progreso", delay: 0.1 },
            { icon: CheckCircle, label: "Cerrados", value: stats.completed, sub: "Completados", delay: 0.15 },
            { icon: AlertTriangle, label: "Atrasados", value: stats.delayed, sub: "Requieren atención", delay: 0.2 },
            { icon: Clock, label: "Inactivos", value: stats.inactive, sub: "Sin actividad", delay: 0.25 },
          ].map((metric, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: metric.delay }} className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/5 transition-transform duration-300 group-hover:scale-150" />
              <div className="absolute right-4 top-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
                  <metric.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="space-y-1.5 pr-14 p-4 pb-3">
                <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">{metric.value}</p>
                {metric.sub && <p className="text-[10px] text-muted-foreground">{metric.sub}</p>}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filtro */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCarouselPage(0); }}>
            <SelectTrigger className="h-9 w-[160px] text-xs">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="In Progress">En Progreso</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="completed">Cerrados</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
              <SelectItem value="on-hold">En Pausa</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* ═══════════ CARRUSEL ═══════════ */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" style={{ color: HORMI_BLUE }} /></div>
        ) : filteredProjects.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 rounded-xl border border-border bg-card">
            <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No se encontraron proyectos</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Mostrando {carouselPage * projectsPerCarousel + 1}-{Math.min((carouselPage + 1) * projectsPerCarousel, filteredProjects.length)} de {filteredProjects.length}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => setShowAllModal(true)}>
                  <FolderKanban className="h-3.5 w-3.5" /> Ver Todos
                </Button>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevCarousel} disabled={totalCarouselPages <= 1}><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="text-xs text-muted-foreground min-w-[40px] text-center">{carouselPage + 1}/{Math.max(totalCarouselPages, 1)}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextCarousel} disabled={totalCarouselPages <= 1}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>

            <div className="overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div key={carouselPage} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.35, ease: "easeInOut" }} className="grid gap-4 md:grid-cols-3">
                  {carouselProjects.map((project, idx) => {
                    const statusColor = getStatusColor(project.status);
                    const statusInfo = statusConfig[project.status] || statusConfig.default;
                    const clientData = clients.find((c: any) => c.name === project.client);
                    return (
                      <motion.div key={project.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.08, duration: 0.3 }}
                        whileHover={{ y: -4, scale: 1.02 }} onClick={() => handleProjectClick(project)}
                        className={cn("rounded-2xl border border-border/50 bg-card hover:shadow-xl transition-all duration-300 cursor-pointer group relative overflow-hidden", project.isClosed && "opacity-75")}
                      >
                        <div className="absolute top-0 left-0 right-0 h-1 transition-all duration-300" style={{ backgroundColor: statusColor }} />
                        <div className="p-4 pt-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {clientData?.logo_url ? (
                                <img src={clientData.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover ring-1 ring-border shrink-0" />
                              ) : (
                                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center ring-1 ring-border shrink-0"><Building2 className="h-4 w-4 text-muted-foreground" /></div>
                              )}
                              <div className="min-w-0">
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate">{project.client}</p>
                                <h3 className="text-sm font-bold text-foreground group-hover:text-[#0DA2E7] transition-colors truncate">{project.name}</h3>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              {project.isClosed && <Lock className="h-3 w-3 text-gray-400" />}
                              {project.isDelayed && !project.isClosed && <Badge variant="outline" className="text-[9px] bg-red-50 text-red-600 border-red-200">!</Badge>}
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 font-medium ${statusInfo.class}`}>{statusInfo.label}</Badge>
                            </div>
                          </div>
                          <div className="mb-3">
                            <div className="flex justify-between text-[10px] mb-1"><span className="text-muted-foreground">Progreso</span><span className="font-bold" style={{ color: statusColor }}>{project.progress}%</span></div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${project.progress}%` }} transition={{ duration: 1, delay: idx * 0.06 }} className="h-full rounded-full" style={{ backgroundColor: statusColor }} />
                            </div>
                          </div>
                          <div className="space-y-1.5 mb-3 text-[10px] text-muted-foreground">
                            <div className="flex items-center gap-1.5"><Clock className="h-3 w-3 shrink-0" /><span>{project.hoursConsumed.toFixed(0)}h de {project.hoursPool}h</span></div>
                            <div className="flex items-center gap-1.5"><Users className="h-3 w-3 shrink-0" /><span>{project.team.length + (project.teamLead.id ? 1 : 0)} miembros</span></div>
                            <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3 shrink-0" /><span>Entrega: {new Date(project.endDate).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</span></div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-border/50">
                            <div className="flex items-center gap-1">
                              {project.teamLead.id && (
                                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                  <Avatar className="h-6 w-6 ring-1 ring-amber-400/50 cursor-pointer" onClick={(e) => handleMemberClick(project.teamLead.id!, e)}>
                                    <AvatarImage src={project.teamLead.avatar} /><AvatarFallback className="text-[7px] bg-amber-100 text-amber-700 font-bold">{project.teamLead.name?.charAt(0) || '?'}</AvatarFallback>
                                  </Avatar>
                                </TooltipTrigger><TooltipContent side="bottom" className="text-[10px]"><p>👑 {project.teamLead.name}</p></TooltipContent></Tooltip></TooltipProvider>
                              )}
                              <div className="flex -space-x-1">
                                {project.team.slice(0, 3).map((m: any, i: number) => (
                                  <TooltipProvider key={i}><Tooltip><TooltipTrigger asChild>
                                    <Avatar className="h-6 w-6 ring-1 ring-border cursor-pointer" onClick={(e) => m.id && handleMemberClick(m.id, e)}>
                                      <AvatarImage src={m.avatar} /><AvatarFallback className="text-[7px]">{m.name?.charAt(0) || '?'}</AvatarFallback>
                                    </Avatar>
                                  </TooltipTrigger><TooltipContent side="bottom" className="text-[10px]"><p>{m.name}</p></TooltipContent></Tooltip></TooltipProvider>
                                ))}
                                {project.team.length > 3 && <div className="h-6 w-6 rounded-full bg-muted ring-1 ring-border flex items-center justify-center text-[8px]">+{project.team.length - 3}</div>}
                              </div>
                            </div>
                            {canEdit && !project.isClosed && (
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-[#0DA2E7]/10 hover:text-[#0DA2E7] rounded-lg" onClick={(e) => handleEditProject(project, e)}><Pencil className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-500 rounded-lg" onClick={(e) => handleDeleteClick(project.id, project.name, e)}><Trash2 className="h-3.5 w-3.5" /></Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>

            {totalCarouselPages > 1 && (
              <div className="flex items-center justify-center gap-1.5">
                {Array.from({ length: totalCarouselPages }).map((_, i) => (
                  <button key={i} onClick={() => setCarouselPage(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === carouselPage ? 'w-6' : 'w-1.5 bg-muted-foreground/30'}`}
                    style={i === carouselPage ? { backgroundColor: HORMI_BLUE } : {}}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Diálogo Eliminar */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Eliminar Proyecto</DialogTitle></DialogHeader>
          <div className="py-4"><p className="text-muted-foreground">¿Eliminar <strong className="text-red-500">"{deleteDialog.projectName}"</strong>?</p></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, projectId: '', projectName: '' })}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>{isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ MODAL VER TODOS - PREMIUM ═══════════ */}
      <Dialog open={showAllModal} onOpenChange={setShowAllModal}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col bg-card border-border p-0 rounded-2xl shadow-2xl">
          <div className="relative p-5 bg-gradient-to-r from-[#0DA2E7]/15 via-[#0DA2E7]/5 to-transparent border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0DA2E7] to-[#0B8BC7] shadow-lg">
                  <FolderKanban className="h-5 w-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">Todos los Proyectos</DialogTitle>
                  <p className="text-xs text-muted-foreground">{modalFilteredProjects.length} proyectos</p>
                </div>
              </div>
              <div className="flex items-center border border-border rounded-lg overflow-hidden">
                <button onClick={() => setModalView('grid')} className={`p-2 transition-all ${modalView === 'grid' ? 'bg-[#0DA2E7]/10 text-[#0DA2E7]' : 'text-muted-foreground hover:bg-muted'}`}><LayoutGrid className="h-4 w-4" /></button>
                <button onClick={() => setModalView('compact')} className={`p-2 transition-all ${modalView === 'compact' ? 'bg-[#0DA2E7]/10 text-[#0DA2E7]' : 'text-muted-foreground hover:bg-muted'}`}><LayoutList className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Buscar por nombre o cliente..." value={modalSearch} onChange={(e) => { setModalSearch(e.target.value); setModalPage(1); }} className="pl-9 h-9 text-xs bg-background border-border" />
                {modalSearch && <button onClick={() => { setModalSearch(""); setModalPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
              </div>
              <Select value={modalStatusFilter} onValueChange={(v) => { setModalStatusFilter(v); setModalPage(1); }}>
                <SelectTrigger className="h-9 w-[150px] text-xs"><Filter className="h-3.5 w-3.5 mr-1.5" /><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="In Progress">En Progreso</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="completed">Cerrados</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                  <SelectItem value="on-hold">En Pausa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {modalFilteredProjects.length === 0 ? (
              <div className="text-center py-16">
                <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-sm text-muted-foreground">No se encontraron proyectos</p>
              </div>
            ) : (
              <>
                <div className={cn("grid gap-4", modalView === 'grid' ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4")}>
                  <AnimatePresence>
                    {modalCurrentProjects.map((project, idx) => {
                      const statusColor = getStatusColor(project.status);
                      const statusInfo = statusConfig[project.status] || statusConfig.default;
                      const clientData = clients.find((c: any) => c.name === project.client);
                      return (
                        <motion.div key={project.id} initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: idx * 0.03, duration: 0.3 }}
                          whileHover={{ y: -4, scale: 1.02 }} onClick={() => { setShowAllModal(false); handleProjectClick(project); }}
                          className={cn("rounded-2xl border border-border/50 bg-card hover:shadow-xl transition-all duration-300 cursor-pointer group relative overflow-hidden", project.isClosed && "opacity-75")}
                        >
                          <div className="absolute top-0 left-0 right-0 h-1 transition-all duration-300" style={{ backgroundColor: statusColor }} />
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                          {modalView === 'grid' ? (
                            <div className="p-4 pt-5">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {clientData?.logo_url ? (
                                    <img src={clientData.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover ring-1 ring-border shrink-0" />
                                  ) : (
                                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center ring-1 ring-border shrink-0"><Building2 className="h-4 w-4 text-muted-foreground" /></div>
                                  )}
                                  <div className="min-w-0"><p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate">{project.client}</p><h3 className="text-sm font-bold text-foreground group-hover:text-[#0DA2E7] transition-colors truncate">{project.name}</h3></div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {project.isClosed && <Lock className="h-3 w-3 text-gray-400" />}
                                  {project.isDelayed && !project.isClosed && <Badge variant="outline" className="text-[9px] bg-red-50 text-red-600 border-red-200">!</Badge>}
                                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 font-medium ${statusInfo.class}`}>{statusInfo.label}</Badge>
                                </div>
                              </div>
                              <div className="mb-3"><div className="flex justify-between text-[10px] mb-1"><span className="text-muted-foreground">Progreso</span><span className="font-bold" style={{ color: statusColor }}>{project.progress}%</span></div><div className="h-2 bg-muted rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${project.progress}%` }} transition={{ duration: 1, delay: idx * 0.05 }} className="h-full rounded-full" style={{ backgroundColor: statusColor }} /></div></div>
                              <div className="space-y-1.5 mb-3 text-[10px] text-muted-foreground">
                                <div className="flex items-center gap-1.5"><Clock className="h-3 w-3 shrink-0" /><span>{project.hoursConsumed.toFixed(0)}h de {project.hoursPool}h</span></div>
                                <div className="flex items-center gap-1.5"><Users className="h-3 w-3 shrink-0" /><span>{project.team.length + (project.teamLead.id ? 1 : 0)} miembros</span></div>
                                <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3 shrink-0" /><span>Entrega: {new Date(project.endDate).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</span></div>
                              </div>
                              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                                <div className="flex items-center gap-1">
                                  {project.teamLead.id && <Avatar className="h-6 w-6 ring-1 ring-amber-400/50 cursor-pointer" onClick={(e) => handleMemberClick(project.teamLead.id!, e)}><AvatarImage src={project.teamLead.avatar} /><AvatarFallback className="text-[7px] bg-amber-100 text-amber-700 font-bold">{project.teamLead.name?.charAt(0) || '?'}</AvatarFallback></Avatar>}
                                  <div className="flex -space-x-1">
                                    {project.team.slice(0, 3).map((m: any, i: number) => (
                                      <Avatar key={i} className="h-6 w-6 ring-1 ring-border cursor-pointer" onClick={(e) => m.id && handleMemberClick(m.id, e)}><AvatarImage src={m.avatar} /><AvatarFallback className="text-[7px]">{m.name?.charAt(0) || '?'}</AvatarFallback></Avatar>
                                    ))}
                                    {project.team.length > 3 && <div className="h-6 w-6 rounded-full bg-muted ring-1 ring-border flex items-center justify-center text-[8px]">+{project.team.length - 3}</div>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 pt-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {clientData?.logo_url ? <img src={clientData.logo_url} alt="" className="h-5 w-5 rounded object-cover shrink-0" /> : <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                                  <p className="text-[10px] text-muted-foreground font-medium truncate">{project.client}</p>
                                </div>
                                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 font-medium shrink-0 ${statusInfo.class}`}>{statusInfo.label}</Badge>
                              </div>
                              <h3 className="text-xs font-bold text-foreground group-hover:text-[#0DA2E7] transition-colors truncate mb-2">{project.name}</h3>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2"><motion.div initial={{ width: 0 }} animate={{ width: `${project.progress}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full" style={{ backgroundColor: statusColor }} /></div>
                              <div className="flex items-center justify-between text-[9px] text-muted-foreground"><span>{project.progress}%</span><span>{project.hoursConsumed.toFixed(0)}/{project.hoursPool}h</span><span>{new Date(project.endDate).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</span></div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {modalTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-border">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setModalPage(p => Math.max(1, p - 1))} disabled={modalPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: modalTotalPages }, (_, i) => i + 1).filter(p => p === 1 || p === modalTotalPages || Math.abs(p - modalPage) <= 1).map((p, idx2, arr) => (
                        <div key={p} className="flex items-center gap-1">{idx2 > 0 && arr[idx2 - 1] !== p - 1 && <span className="text-xs text-muted-foreground">...</span>}<button onClick={() => setModalPage(p)} className={`h-8 w-8 rounded-lg text-xs font-medium transition-all ${p === modalPage ? 'bg-[#0DA2E7] text-white shadow-md' : 'hover:bg-muted text-muted-foreground'}`}>{p}</button></div>
                      ))}
                    </div>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setModalPage(p => Math.min(modalTotalPages, p + 1))} disabled={modalPage === modalTotalPages}><ChevronRight className="h-4 w-4" /></Button>
                    <span className="text-xs text-muted-foreground ml-2">Pág. {modalPage} de {modalTotalPages}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ProjectDetailModal project={selectedProject} open={detailModalOpen} onOpenChange={setDetailModalOpen} />
      <ProjectFormModal open={formModalOpen} onOpenChange={setFormModalOpen} project={editingProject} />
    </DashboardLayout>
  );
}