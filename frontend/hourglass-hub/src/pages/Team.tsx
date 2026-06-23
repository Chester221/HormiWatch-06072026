import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AddMemberModal } from "@/components/team/AddMemberModal";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Search, Mail, Phone, Shield, Wrench, UserX, UserCheck,
  UserCog, Loader2, AlertTriangle, FolderKanban, Trash2, Users,
  Crown, User as UserIcon, Filter, CheckCircle, TrendingUp, Clock, ChevronLeft, ChevronRight
} from "lucide-react";
import { TeamMemberFormModal } from "@/components/team/TeamMemberFormModal";
import { useTeamMembers, useUpdateTeamMember, TeamMember } from "@/hooks/useTeamMembers";
import { useProjects } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

const HORMI_BLUE = '#0DA2E7';

export default function Team() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  const { data: teamMembers = [], isLoading, refetch } = useTeamMembers();
  const { data: projects = [] } = useProjects();
  const updateMemberMutation = useUpdateTeamMember();
  const { profile } = useAuth();
  const canViewTeam = profile?.role === 'Admin' || profile?.role === 'Manager';
  const isAdmin = profile?.role === 'Admin';

  const [formModal, setFormModal] = useState<{ open: boolean; member: any }>({ open: false, member: null });
  const [assignDialog, setAssignDialog] = useState<{
    open: boolean; member: TeamMember | null; selectedProjects: string[]; projectRoles: Record<string, string>;
  }>({ open: false, member: null, selectedProjects: [], projectRoles: {} });

  const fetchProjectMembers = async () => {
    const { data } = await supabase.from('project_members').select('*, profiles(*), projects(id, name)');
    setProjectMembers(data || []);
  };

  useEffect(() => { fetchProjectMembers(); }, []);

  const visibleMembers = isAdmin ? teamMembers : teamMembers.filter(m => m.role !== 'Admin');

  const filteredMembers = visibleMembers.filter(m => {
    const matchesSearch = !searchQuery || 
      (m.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.email?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === "all" || m.role === roleFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && m.is_active !== false) ||
      (statusFilter === "suspended" && m.is_active === false);
    const matchesProject = projectFilter === "all" || 
      projectMembers.some(pm => pm.project_id === projectFilter && pm.user_id === m.id);
    return matchesSearch && matchesRole && matchesStatus && matchesProject;
  });

  const roleOrder: Record<string, number> = { Admin: 0, Manager: 1, Technician: 2 };
  const sortedMembers = [...filteredMembers].sort((a, b) => (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99));

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentMembers = sortedMembers.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(sortedMembers.length / itemsPerPage);

  const getProjectMembers = (projectId: string) => projectMembers.filter(pm => pm.project_id === projectId);
  const getProjectLeader = (projectId: string) => projectMembers.find(pm => pm.project_id === projectId && pm.role_in_project === 'leader');

  const stats = {
    total: teamMembers.length,
    active: teamMembers.filter(m => m.is_active !== false).length,
    admins: teamMembers.filter(m => m.role === 'Admin').length,
    managers: teamMembers.filter(m => m.role === 'Manager').length,
    technicians: teamMembers.filter(m => m.role === 'Technician').length,
    suspended: teamMembers.filter(m => m.is_active === false).length,
  };

  const handleEdit = (m: any) => setFormModal({ open: true, member: { ...m, name: m.full_name || m.name || "", avatar: m.avatar_url || m.avatar } });
  
  const handleAssign = (m: TeamMember) => {
    const currentAssignments = projectMembers.filter(pm => pm.user_id === m.id);
    setAssignDialog({
      open: true, member: m,
      selectedProjects: currentAssignments.map(pm => pm.project_id),
      projectRoles: Object.fromEntries(currentAssignments.map(pm => [pm.project_id, pm.role_in_project || 'member'])),
    });
  };

  const toggleProjectSelection = (projectId: string) => {
    setAssignDialog(prev => {
      const isSelected = prev.selectedProjects.includes(projectId);
      const newSelected = isSelected ? prev.selectedProjects.filter(id => id !== projectId) : [...prev.selectedProjects, projectId];
      const newRoles = { ...prev.projectRoles };
      
      if (!isSelected && !newRoles[projectId]) {
        const memberRole = prev.member?.role;
        const canBeLeader = memberRole === 'Manager' || memberRole === 'Admin';
        
        if (canBeLeader) {
          const existingLeader = getProjectLeader(projectId);
          if (existingLeader && existingLeader.user_id !== prev.member?.id) {
            newRoles[projectId] = 'member';
          } else {
            newRoles[projectId] = 'leader';
          }
        } else {
          newRoles[projectId] = 'member';
        }
      }
      
      if (isSelected) {
        delete newRoles[projectId];
      }
      
      return { ...prev, selectedProjects: newSelected, projectRoles: newRoles };
    });
  };

  const toggleProjectRole = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentRole = assignDialog.projectRoles[projectId] || 'member';
    
    // 🔥 Validar que solo Managers/Admins puedan ser líderes
    const memberRole = assignDialog.member?.role;
    if (currentRole !== 'leader' && memberRole !== 'Manager' && memberRole !== 'Admin') {
      toast.error('Solo los Managers pueden ser líderes de proyecto');
      return;
    }
    
    if (currentRole !== 'leader') {
      const existingLeader = getProjectLeader(projectId);
      if (existingLeader && existingLeader.user_id !== assignDialog.member?.id) {
        toast.error(`Este proyecto ya tiene un líder: ${existingLeader.profiles?.full_name || 'Otro miembro'}`);
        return;
      }
    }
    setAssignDialog(prev => ({ ...prev, projectRoles: { ...prev.projectRoles, [projectId]: currentRole === 'leader' ? 'member' : 'leader' } }));
  };

  const confirmAssign = async () => {
    if (!assignDialog.member) return;
    for (const projectId of assignDialog.selectedProjects) {
      if (assignDialog.projectRoles[projectId] === 'leader') {
        const existingLeader = getProjectLeader(projectId);
        if (existingLeader && existingLeader.user_id !== assignDialog.member.id) {
          toast.error(`El proyecto ya tiene un líder asignado.`); return;
        }
      }
    }
    try {
      await supabase.from('project_members').delete().eq('user_id', assignDialog.member.id);
      if (assignDialog.selectedProjects.length > 0) {
        await supabase.from('project_members').insert(
          assignDialog.selectedProjects.map(projectId => ({
            project_id: projectId, user_id: assignDialog.member!.id,
            role_in_project: assignDialog.projectRoles[projectId] || 'member',
          }))
        );
      }
      toast.success("Proyectos actualizados");
      setAssignDialog({ open: false, member: null, selectedProjects: [], projectRoles: {} });
      await fetchProjectMembers();
    } catch (e: any) { toast.error(`Error: ${e.message}`); }
  };

  const handleFormSubmit = (data: any) => {
    if (data.id) {
      updateMemberMutation.mutate({
        id: data.id,
        data: {
          full_name: data.name,
          email: data.email,
          role: data.role,
          phone: data.phone,
          cedula: data.cedula,
          avatar_url: data.avatar || undefined,
        }
      });
    }
    setFormModal({ open: false, member: null });
  };

  if (!canViewTeam) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <Shield className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold text-foreground">Acceso Restringido</h2>
          <p className="text-muted-foreground mt-2">No tienes permisos para ver el equipo</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#0DA2E7]/20 to-[#0DA2E7]/5">
                <Users className="h-6 w-6" style={{ color: HORMI_BLUE }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Equipo</h1>
                <p className="text-sm text-muted-foreground">{stats.total} miembros · {stats.active} activos</p>
              </div>
            </div>
          </div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button onClick={() => setAddMemberOpen(true)} size="sm" className="gap-2 text-white" style={{ backgroundColor: HORMI_BLUE }}>
              <UserCog className="h-4 w-4" /> Agregar Miembro
            </Button>
          </motion.div>
        </motion.div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { icon: Users, label: "Total", value: stats.total, sub: "miembros", delay: 0.05 },
            { icon: CheckCircle, label: "Activos", value: stats.active, sub: "sin suspender", delay: 0.1 },
            { icon: Crown, label: "Admins", value: stats.admins, sub: "administradores", delay: 0.15 },
            { icon: Shield, label: "Managers", value: stats.managers, sub: "gestores", delay: 0.2 },
            { icon: Wrench, label: "Técnicos", value: stats.technicians, sub: "miembros", delay: 0.25 },
            { icon: Clock, label: "Suspendidos", value: stats.suspended, sub: "inactivos", delay: 0.3 },
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

        {/* Filtros */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Buscar por nombre o email..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-3 py-2 h-9 text-xs rounded-lg border border-border bg-muted/50 focus:outline-none focus:border-[#0DA2E7]/30"
            />
          </div>
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="h-9 w-[120px] text-xs"><Filter className="h-3.5 w-3.5 mr-1.5" /><SelectValue placeholder="Rol" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Manager">Manager</SelectItem>
              <SelectItem value="Technician">Técnico</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="h-9 w-[120px] text-xs"><Filter className="h-3.5 w-3.5 mr-1.5" /><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="suspended">Suspendidos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={(v) => { setProjectFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="h-9 w-[150px] text-xs"><FolderKanban className="h-3.5 w-3.5 mr-1.5" /><SelectValue placeholder="Proyecto" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los proyectos</SelectItem>
              {projects.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Grid de Miembros */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" style={{ color: HORMI_BLUE }} /></div>
        ) : currentMembers.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 rounded-xl border border-border bg-card">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-sm text-muted-foreground">No se encontraron miembros</p>
          </motion.div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence>
                {currentMembers.map((member, idx) => (
                  <MemberCard key={member.id} member={member} idx={idx} onEdit={handleEdit} onAssign={handleAssign} />
                ))}
              </AnimatePresence>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-xs text-muted-foreground min-w-[60px] text-center">Pág. {currentPage} de {totalPages}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modales */}
      <AddMemberModal open={addMemberOpen} onOpenChange={setAddMemberOpen} onSuccess={() => refetch()} />
      {formModal.open && <TeamMemberFormModal open={formModal.open} onOpenChange={(o) => setFormModal({ open: o, member: o ? formModal.member : null })} member={formModal.member} onSubmit={handleFormSubmit} />}

      {/* ═══════════ GESTIONAR PROYECTOS - PREMIUM ═══════════ */}
      <Dialog open={assignDialog.open} onOpenChange={(o) => setAssignDialog({ open: o, member: o ? assignDialog.member : null, selectedProjects: [], projectRoles: {} })}>
        <DialogContent className="sm:max-w-lg bg-card border-border p-0 overflow-hidden rounded-2xl shadow-2xl">
          <div className="relative p-5 bg-gradient-to-r from-[#0DA2E7]/15 via-[#0DA2E7]/5 to-transparent border-b border-border">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#0DA2E7]/5 rounded-full blur-2xl" />
            <div className="flex items-center gap-3 relative">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0DA2E7] to-[#0B8BC7] shadow-lg shadow-[#0DA2E7]/30">
                <FolderKanban className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Gestionar Proyectos</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Asignar o remover a <strong className="text-foreground">{assignDialog.member?.full_name || assignDialog.member?.email}</strong> de proyectos
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-2 max-h-[400px] overflow-y-auto">
            {projects.length === 0 ? (
              <div className="text-center py-12"><FolderKanban className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" /><p className="text-sm text-muted-foreground">No hay proyectos</p></div>
            ) : (
              projects.map((project: any) => {
                const isSelected = assignDialog.selectedProjects.includes(project.id);
                const role = assignDialog.projectRoles[project.id] || 'member';
                const currentLeader = getProjectLeader(project.id);
                const isLeader = role === 'leader';
                const hasOtherLeader = currentLeader && currentLeader.user_id !== assignDialog.member?.id;
                const isCurrentlyAssigned = projectMembers.some(pm => pm.project_id === project.id && pm.user_id === assignDialog.member?.id);
                const currentRole = projectMembers.find(pm => pm.project_id === project.id && pm.user_id === assignDialog.member?.id)?.role_in_project;
                const isCurrentlyLeader = currentRole === 'leader';
                const canBeLeader = assignDialog.member?.role === 'Manager' || assignDialog.member?.role === 'Admin';

                return (
                  <motion.div key={project.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isSelected 
                        ? isLeader 
                          ? 'border-amber-400/60 bg-amber-50/50' 
                          : 'border-[#0DA2E7]/40 bg-[#0DA2E7]/5'
                        : isCurrentlyAssigned
                          ? 'border-border/50 bg-muted/10'
                          : 'border-border/50 bg-muted/5 hover:bg-muted/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        onClick={() => {
                          if (isCurrentlyLeader && isSelected) {
                            toast.error('No puedes remover al líder del proyecto. Asigna otro líder primero.');
                            return;
                          }
                          toggleProjectSelection(project.id);
                        }} 
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 cursor-pointer transition-all ${
                          isSelected 
                            ? isLeader ? 'bg-amber-500 border-amber-500' : 'bg-[#0DA2E7] border-[#0DA2E7]'
                            : 'border-muted-foreground/30 hover:border-[#0DA2E7]/40'
                        }`}
                      >
                        {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{project.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {hasOtherLeader && (
                            <span className="text-[10px] text-amber-600 flex items-center gap-1">
                              <Crown className="h-2.5 w-2.5" />Líder: {currentLeader.profiles?.full_name || 'Asignado'}
                            </span>
                          )}
                          {isCurrentlyAssigned && !isSelected && (
                            <span className="text-[10px] text-red-500">Será removido al guardar</span>
                          )}
                          <span className="text-[10px] text-muted-foreground">{getProjectMembers(project.id).length} miembros</span>
                        </div>
                      </div>

                      {isSelected && canBeLeader && (
                        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                          <Button
                            size="sm"
                            variant={isLeader ? 'default' : 'outline'}
                            className={`h-7 text-[10px] px-2.5 gap-1 transition-all ${
                              isLeader 
                                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500' 
                                : 'border-border hover:border-[#0DA2E7]/30 hover:text-[#0DA2E7]'
                            }`}
                            onClick={(e) => {
                              if (hasOtherLeader && !isLeader) {
                                toast.error('Este proyecto ya tiene un líder asignado');
                                return;
                              }
                              toggleProjectRole(project.id, e);
                            }}
                            disabled={hasOtherLeader && !isLeader}
                          >
                            {isLeader ? <><Crown className="h-3 w-3" /> Líder</> : <><UserIcon className="h-3 w-3" /> Miembro</>}
                          </Button>
                        </motion.div>
                      )}
                      
                      {isSelected && !canBeLeader && (
                        <span className="text-[10px] text-muted-foreground bg-muted/20 px-2 py-1 rounded-lg">Miembro</span>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          <div className="p-5 pt-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">
                {assignDialog.selectedProjects.length === 0 ? 'Sin proyectos seleccionados' : `${assignDialog.selectedProjects.length} proyecto(s) seleccionado(s)`}
              </p>
              {assignDialog.selectedProjects.length > 0 && (
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setAssignDialog(prev => ({ ...prev, selectedProjects: [], projectRoles: {} }))}>Limpiar selección</Button>
              )}
            </div>

            <div className="mb-3 p-2.5 rounded-lg bg-amber-50 border border-amber-100 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-[10px] text-amber-700">
                Solo <strong>Managers</strong> pueden ser líderes de proyecto. Los Técnicos solo pueden ser miembros.
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setAssignDialog({ open: false, member: null, selectedProjects: [], projectRoles: {} })} className="flex-1 rounded-lg">Cancelar</Button>
              <Button onClick={confirmAssign} className="flex-1 text-white rounded-lg" style={{ backgroundColor: HORMI_BLUE }}>
                <FolderKanban className="h-4 w-4 mr-1.5" />
                {assignDialog.selectedProjects.length > 0 ? 'Guardar Cambios' : 'Quitar de todos'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

// ═══════════════ MEMBER CARD ═══════════════
function MemberCard({ member, projectRole, onEdit, onAssign, onRemove, showRemove, idx }: any) {
  const roleBadge = (() => {
    switch (member?.role) {
      case "Admin": return { icon: Crown, className: "bg-amber-50 text-amber-700 border-amber-200" };
      case "Manager": return { icon: Shield, className: "bg-blue-50 text-blue-700 border-blue-200" };
      case "Technician": return { icon: Wrench, className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      default: return { icon: Wrench, className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    }
  })();
  const RoleIcon = roleBadge.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: idx * 0.04, duration: 0.3 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="rounded-xl border border-border/50 bg-card hover:shadow-xl hover:border-[#0DA2E7]/20 transition-all duration-300 group relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#0DA2E7]/40 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="relative">
            <Avatar className="h-11 w-11 ring-2 ring-border group-hover:ring-[#0DA2E7]/40 transition-all">
              <AvatarImage src={member?.avatar_url || ""} />
              <AvatarFallback className="text-xs font-semibold bg-muted text-muted-foreground">{(member?.full_name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2)}</AvatarFallback>
            </Avatar>
            {member?.is_active !== false && <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-emerald-400 rounded-full ring-2 ring-card" />}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 gap-1 font-medium ${roleBadge.className}`}><RoleIcon className="h-2.5 w-2.5" />{member?.role}</Badge>
            {projectRole === 'leader' && <Badge className="bg-amber-50 text-amber-700 text-[10px] px-1.5 py-0 gap-1 border-amber-200"><Crown className="h-2.5 w-2.5" /> Líder</Badge>}
          </div>
        </div>
        <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-[#0DA2E7] transition-colors">{member?.full_name || "Sin nombre"}</h3>
        <div className="space-y-1 mt-2">
          {member?.email && <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{member.email}</span></div>}
          {member?.phone && <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Phone className="h-3 w-3 shrink-0" /><span>{member.phone}</span></div>}
        </div>
        <div className="flex items-center justify-end gap-0.5 pt-3 mt-3 border-t border-border/50">
          <TooltipProvider>
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-[#0DA2E7]/10 hover:text-[#0DA2E7]" onClick={() => onEdit(member)}><UserCog className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent side="top"><p className="text-xs">Editar</p></TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-[#0DA2E7]/10 hover:text-[#0DA2E7]" onClick={() => onAssign(member)}><FolderKanban className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent side="top"><p className="text-xs">Proyectos</p></TooltipContent></Tooltip>
            {showRemove && (
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-red-100 hover:text-red-500" onClick={onRemove}><Trash2 className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent side="top"><p className="text-xs">Remover</p></TooltipContent></Tooltip>
            )}
          </TooltipProvider>
        </div>
      </div>
    </motion.div>
  );
}