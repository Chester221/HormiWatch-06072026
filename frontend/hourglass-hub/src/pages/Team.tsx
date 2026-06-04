import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AddMemberModal } from "@/components/team/AddMemberModal";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Search, Mail, Phone, Shield, Wrench, Eye, UserX, UserCheck,
  UserCog, Loader2, AlertTriangle, FolderKanban, Trash2, Users,
  ChevronDown, ChevronUp, Crown, User as UserIcon
} from "lucide-react";
import { TeamMemberFormModal } from "@/components/team/TeamMemberFormModal";
import { useTeamMembers, useUpdateTeamMember, TeamMember } from "@/hooks/useTeamMembers";
import { useProjects } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

export default function Team() {
  const [searchQuery, setSearchQuery] = useState("");
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);
  
  const { data: teamMembers = [], isLoading, refetch } = useTeamMembers();
  const { data: projects = [] } = useProjects();
  const updateMemberMutation = useUpdateTeamMember();
  const { profile } = useAuth();
  const canViewTeam = profile?.role === 'Admin' || profile?.role === 'Manager';
  const isAdmin = profile?.role === 'Admin';

  const [formModal, setFormModal] = useState<{ open: boolean; member: any }>({ open: false, member: null });
  const [suspendDialog, setSuspendDialog] = useState<{ open: boolean; member: TeamMember | null }>({ open: false, member: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; member: TeamMember | null }>({ open: false, member: null });
  const [assignDialog, setAssignDialog] = useState<{
    open: boolean;
    member: TeamMember | null;
    selectedProjects: string[];
    projectRoles: Record<string, string>;
  }>({ open: false, member: null, selectedProjects: [], projectRoles: {} });

  // Cargar miembros de proyectos
  const fetchProjectMembers = async () => {
    const { data } = await supabase
      .from('project_members')
      .select('*, profiles(*), projects(id, name)');
    setProjectMembers(data || []);
  };

  useEffect(() => {
    fetchProjectMembers();
  }, []);

  const visibleMembers = isAdmin 
    ? teamMembers 
    : teamMembers.filter(m => m.role !== 'Admin');

  const filteredMembers = searchQuery
    ? visibleMembers.filter(m =>
        (m.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.email?.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : visibleMembers;

  const roleOrder: Record<string, number> = { Admin: 0, Manager: 1, Technician: 2, Viewer: 3 };
  const sortedMembers = [...filteredMembers].sort((a, b) => (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99));

  const projectsWithMembers = projects.filter((p: any) =>
    projectMembers.some(pm => pm.project_id === p.id)
  );

  const getProjectMembers = (projectId: string) =>
    projectMembers.filter(pm => pm.project_id === projectId);

  // Obtener líder de un proyecto
  const getProjectLeader = (projectId: string) =>
    projectMembers.find(pm => pm.project_id === projectId && pm.role_in_project === 'leader');

  // Validar si un proyecto ya tiene líder
  const projectHasLeader = (projectId: string) =>
    projectMembers.some(pm => pm.project_id === projectId && pm.role_in_project === 'leader');

  const toggleProject = (id: string) => {
    setExpandedProjects(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const membersWithoutProject = sortedMembers.filter(m =>
    !projectMembers.some(pm => pm.user_id === m.id)
  );

  const handleEdit = (m: any) => {
    setFormModal({
      open: true,
      member: {
        ...m,
        name: m.full_name || m.name || "",
        avatar: m.avatar_url || m.avatar,
      }
    });
  };
  const handleSuspend = (m: TeamMember) => setSuspendDialog({ open: true, member: m });
  const handleDelete = (m: TeamMember) => setDeleteDialog({ open: true, member: m });
  
  const handleAssign = (m: TeamMember) => {
    const currentAssignments = projectMembers.filter(pm => pm.user_id === m.id);
    const selectedProjects = currentAssignments.map(pm => pm.project_id);
    const projectRoles: Record<string, string> = {};
    currentAssignments.forEach(pm => {
      projectRoles[pm.project_id] = pm.role_in_project || 'member';
    });
    setAssignDialog({ open: true, member: m, selectedProjects, projectRoles });
  };

  const toggleProjectSelection = (projectId: string) => {
    setAssignDialog(prev => {
      const isSelected = prev.selectedProjects.includes(projectId);
      const newSelected = isSelected
        ? prev.selectedProjects.filter(id => id !== projectId)
        : [...prev.selectedProjects, projectId];
      const newRoles = { ...prev.projectRoles };
      if (!isSelected && !newRoles[projectId]) {
        newRoles[projectId] = 'member';
      }
      if (isSelected) {
        delete newRoles[projectId];
      }
      return { ...prev, selectedProjects: newSelected, projectRoles: newRoles };
    });
  };

  const toggleProjectRole = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Validar: Si va a ser líder y ya hay un líder en ese proyecto (que no sea esta persona)
    const currentRole = assignDialog.projectRoles[projectId] || 'member';
    if (currentRole !== 'leader') {
      // Va a cambiar a líder
      const existingLeader = getProjectLeader(projectId);
      if (existingLeader && existingLeader.user_id !== assignDialog.member?.id) {
        toast.error(`Este proyecto ya tiene un líder: ${existingLeader.profiles?.full_name || 'Otro miembro'}`);
        return;
      }
    }
    
    setAssignDialog(prev => ({
      ...prev,
      projectRoles: {
        ...prev.projectRoles,
        [projectId]: currentRole === 'leader' ? 'member' : 'leader',
      },
    }));
  };

  const confirmSuspend = async () => {
    if (!suspendDialog.member) return;
    const newStatus = !(suspendDialog.member as any).is_suspended;
    await supabase.from('profiles').update({ is_suspended: newStatus }).eq('id', suspendDialog.member.id);
    toast.success(newStatus ? "Suspendido" : "Reactivado");
    setSuspendDialog({ open: false, member: null });
    refetch();
  };

  const confirmDelete = async () => {
    if (!deleteDialog.member) return;
    await supabase.from('project_members').delete().eq('user_id', deleteDialog.member.id);
    await supabase.from('profiles').delete().eq('id', deleteDialog.member.id);
    toast.success("Eliminado");
    setDeleteDialog({ open: false, member: null });
    refetch();
  };

  const confirmAssign = async () => {
    if (!assignDialog.member) return;
    
    // Validar: No puede haber más de un líder por proyecto
    for (const projectId of assignDialog.selectedProjects) {
      const role = assignDialog.projectRoles[projectId] || 'member';
      if (role === 'leader') {
        const existingLeader = getProjectLeader(projectId);
        if (existingLeader && existingLeader.user_id !== assignDialog.member.id) {
          toast.error(`El proyecto ya tiene un líder asignado. Solo puede haber un líder por proyecto.`);
          return;
        }
      }
    }
    
    try {
      const { error: deleteError } = await supabase
        .from('project_members')
        .delete()
        .eq('user_id', assignDialog.member.id);
      
      if (deleteError) throw deleteError;

      if (assignDialog.selectedProjects.length > 0) {
        const inserts = assignDialog.selectedProjects.map(projectId => ({
          project_id: projectId,
          user_id: assignDialog.member!.id,
          role_in_project: assignDialog.projectRoles[projectId] || 'member',
        }));
        
        const { error: insertError } = await supabase
          .from('project_members')
          .insert(inserts);
        
        if (insertError) throw insertError;
      }

      toast.success("Proyectos actualizados correctamente");
      setAssignDialog({ open: false, member: null, selectedProjects: [], projectRoles: {} });
      await fetchProjectMembers();
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    }
  };

  const removeFromProject = async (pmId: string) => {
    const { error } = await supabase.from('project_members').delete().eq('id', pmId);
    if (!error) {
      setProjectMembers(prev => prev.filter(p => p.id !== pmId));
      toast.success("Removido del proyecto");
    }
  };

  const handleFormSubmit = (data: any) => {
    if (data.id) {
      updateMemberMutation.mutate({
        id: data.id,
        data: {
          full_name: data.name,
          email: data.email,
          role: data.role === 'admin' ? 'Admin' : data.role === 'technician' ? 'Technician' : data.role === 'viewer' ? 'Viewer' : data.role === 'manager' ? 'Manager' : data.role,
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
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Equipo</h1>
            <p className="text-muted-foreground">{teamMembers.length} miembros · {projectsWithMembers.length} proyectos activos</p>
          </div>
          <Button onClick={() => setAddMemberOpen(true)} className="gap-2">
            <UserCog className="h-4 w-4" /> Agregar Miembro
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-muted/50" />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <div className="space-y-6">
            {/* ═══════════ POR PROYECTO ═══════════ */}
            {projectsWithMembers.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FolderKanban className="h-5 w-5 text-primary" /> Proyectos con Equipo
                </h2>
                <div className="space-y-2">
                  {projectsWithMembers.map((project: any) => {
                    const members = getProjectMembers(project.id);
                    const leader = getProjectLeader(project.id);
                    const isExpanded = expandedProjects.includes(project.id);
                    return (
                      <Card key={project.id} className="border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden">
                        <div onClick={() => toggleProject(project.id)} className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <FolderKanban className="h-5 w-5 text-primary" />
                            <div>
                              <span className="font-medium">{project.name}</span>
                              {leader && (
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Crown className="h-3 w-3 text-amber-500" />
                                  {leader.profiles?.full_name || 'Sin nombre'}
                                </p>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-xs">{members.length} {members.length === 1 ? 'persona' : 'personas'}</Badge>
                          </div>
                          {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                        </div>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
                              <CardContent className="border-t border-border/50 pt-4 pb-4">
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                  {members.map((pm: any) => (
                                    <MemberCard
                                      key={pm.id}
                                      member={pm.profiles}
                                      projectRole={pm.role_in_project}
                                      onEdit={handleEdit}
                                      onSuspend={handleSuspend}
                                      onAssign={handleAssign}
                                      onRemove={() => removeFromProject(pm.id)}
                                      showRemove
                                    />
                                  ))}
                                </div>
                              </CardContent>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═══════════ MIEMBROS SIN PROYECTO ═══════════ */}
            {membersWithoutProject.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Sin Proyecto Asignado
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {membersWithoutProject.map((member, i) => (
                    <motion.div key={member.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                      <MemberCard member={member} onEdit={handleEdit} onSuspend={handleSuspend} onDelete={handleDelete} onAssign={handleAssign} />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AddMemberModal open={addMemberOpen} onOpenChange={setAddMemberOpen} onSuccess={() => refetch()} />
      {formModal.open && <TeamMemberFormModal open={formModal.open} onOpenChange={(o) => setFormModal({ open: o, member: o ? formModal.member : null })} member={formModal.member} onSubmit={handleFormSubmit} />}

      {/* Suspender */}
      <Dialog open={suspendDialog.open} onOpenChange={(o) => setSuspendDialog({ open: o, member: o ? suspendDialog.member : null })}>
        <DialogContent className="sm:max-w-md bg-card border-border p-0 overflow-hidden">
          <div className={`p-6 ${suspendDialog.member && (suspendDialog.member as any).is_suspended ? 'bg-gradient-to-r from-green-500/10 to-green-500/5' : 'bg-gradient-to-r from-amber-500/10 to-amber-500/5'}`}>
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-4 ${suspendDialog.member && (suspendDialog.member as any).is_suspended ? 'bg-green-500/20 ring-green-500/10' : 'bg-amber-500/20 ring-amber-500/10'}`}>
                {suspendDialog.member && (suspendDialog.member as any).is_suspended ? <UserCheck className="h-6 w-6 text-green-500" /> : <UserX className="h-6 w-6 text-amber-500" />}
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">{suspendDialog.member && (suspendDialog.member as any).is_suspended ? 'Reactivar Miembro' : 'Suspender Miembro'}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{suspendDialog.member && (suspendDialog.member as any).is_suspended ? 'El miembro podrá acceder nuevamente' : 'El miembro no podrá acceder hasta ser reactivado'}</p>
              </div>
            </div>
          </div>
          <div className="p-6 pt-4">
            <p className="text-sm text-foreground">¿Estás seguro de {suspendDialog.member && (suspendDialog.member as any).is_suspended ? 'reactivar' : 'suspender'} a <span className={`font-semibold ${suspendDialog.member && (suspendDialog.member as any).is_suspended ? 'text-green-400' : 'text-amber-400'}`}>{suspendDialog.member?.full_name || suspendDialog.member?.email || 'este miembro'}</span>?</p>
            <div className={`mt-3 rounded-lg p-3 flex items-start gap-2 ${suspendDialog.member && (suspendDialog.member as any).is_suspended ? 'bg-green-500/5 border border-green-500/10' : 'bg-amber-500/5 border border-amber-500/10'}`}>
              {suspendDialog.member && (suspendDialog.member as any).is_suspended ? <UserCheck className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />}
              <p className={`text-xs ${suspendDialog.member && (suspendDialog.member as any).is_suspended ? 'text-green-400' : 'text-amber-400'}`}>{suspendDialog.member && (suspendDialog.member as any).is_suspended ? 'Recuperará el acceso a todas sus funcionalidades.' : 'Podrás reactivarlo en cualquier momento.'}</p>
            </div>
          </div>
          <DialogFooter className="p-4 pt-0 gap-2">
            <Button variant="outline" onClick={() => setSuspendDialog({ open: false, member: null })} className="flex-1">Cancelar</Button>
            <Button onClick={confirmSuspend} className={`flex-1 font-medium text-white ${suspendDialog.member && (suspendDialog.member as any).is_suspended ? 'bg-green-500 hover:bg-green-600' : 'bg-amber-500 hover:bg-amber-600'}`}>
              {suspendDialog.member && (suspendDialog.member as any).is_suspended ? <><UserCheck className="h-4 w-4 mr-1.5" /> Reactivar</> : <><UserX className="h-4 w-4 mr-1.5" /> Suspender</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Eliminar */}
      <Dialog open={deleteDialog.open} onOpenChange={(o) => setDeleteDialog({ open: o, member: o ? deleteDialog.member : null })}>
        <DialogContent className="sm:max-w-md bg-card border-border p-0 overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-red-500/10 to-red-500/5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/20 ring-4 ring-red-500/10"><AlertTriangle className="h-6 w-6 text-red-500" /></div>
              <div>
                <DialogTitle className="text-lg font-semibold">Eliminar Miembro</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Esta acción no se puede deshacer</p>
              </div>
            </div>
          </div>
          <div className="p-6 pt-4">
            <p className="text-sm text-foreground">¿Eliminar permanentemente a <span className="font-semibold text-red-400">{deleteDialog.member?.full_name || deleteDialog.member?.email || 'este miembro'}</span>?</p>
            <div className="mt-3 bg-red-500/5 border border-red-500/10 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-400">Se eliminarán todos sus datos permanentemente. No podrás recuperarlos.</p>
            </div>
          </div>
          <DialogFooter className="p-4 pt-0 gap-2">
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, member: null })} className="flex-1">Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} className="flex-1 font-medium"><Trash2 className="h-4 w-4 mr-1.5" /> Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Asignar Proyectos con ROLES y VALIDACIONES */}
      <Dialog open={assignDialog.open} onOpenChange={(o) => setAssignDialog({ open: o, member: o ? assignDialog.member : null, selectedProjects: [], projectRoles: {} })}>
        <DialogContent className="sm:max-w-lg bg-card border-border p-0 overflow-hidden">
          <div className="relative p-6 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center gap-4 relative">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-500/20 ring-4 ring-blue-500/10">
                <FolderKanban className="h-7 w-7 text-blue-500" />
              </motion.div>
              <div>
                <DialogTitle className="text-xl font-bold">Gestionar Proyectos</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{assignDialog.member?.full_name || assignDialog.member?.email}</p>
              </div>
            </div>
          </div>
          <div className="p-6 pt-4">
            {assignDialog.selectedProjects.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-amber-400">Miembro con proyectos asignados</p>
                  <p className="text-[11px] text-amber-400/80">Selecciona proyectos y define su rol. Solo puede haber un líder por proyecto.</p>
                </div>
              </motion.div>
            )}
            <p className="text-sm text-muted-foreground mb-4">Selecciona los proyectos y el rol:</p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {projects.length === 0 ? (
                <div className="text-center py-8">
                  <FolderKanban className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No hay proyectos disponibles</p>
                </div>
              ) : (
                <AnimatePresence>
                  {projects.map((project: any) => {
                    const isSelected = assignDialog.selectedProjects.includes(project.id);
                    const role = assignDialog.projectRoles[project.id] || 'member';
                    const currentLeader = getProjectLeader(project.id);
                    const hasOtherLeader = currentLeader && currentLeader.user_id !== assignDialog.member?.id;
                    
                    return (
                      <motion.div key={project.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
                        className={`group flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-200 ${isSelected ? 'border-blue-500/50 bg-blue-500/5 shadow-sm shadow-blue-500/5' : 'border-border/50 bg-muted/10 hover:bg-muted/20 hover:border-border'}`}
                      >
                        <div onClick={() => toggleProjectSelection(project.id)} className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200 cursor-pointer ${isSelected ? 'bg-blue-500 border-blue-500 scale-110' : 'border-muted-foreground/30 group-hover:border-muted-foreground/50'}`}>
                          {isSelected && <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></motion.svg>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium transition-colors ${isSelected ? 'text-blue-400' : 'text-foreground'}`}>{project.name}</p>
                          {hasOtherLeader && (
                            <p className="text-[10px] text-amber-500 flex items-center gap-1 mt-0.5">
                              <Crown className="h-2.5 w-2.5" />
                              Líder: {currentLeader.profiles?.full_name || 'Asignado'}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40">
                          <Users className="h-3 w-3" />{getProjectMembers(project.id).length}
                        </div>
                        {isSelected && (
                          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1">
                            <Button
                              variant={role === 'leader' ? 'default' : 'outline'}
                              size="sm"
                              className={`h-7 text-[10px] px-2.5 gap-1 ${role === 'leader' ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`}
                              onClick={(e) => toggleProjectRole(project.id, e)}
                              disabled={hasOtherLeader && role !== 'leader'}
                              title={hasOtherLeader && role !== 'leader' ? 'Este proyecto ya tiene un líder' : role === 'leader' ? 'Click para cambiar a Miembro' : 'Click para cambiar a Líder'}
                            >
                              {role === 'leader' ? <><Crown className="h-3 w-3" /> Líder</> : <><UserIcon className="h-3 w-3" /> Miembro</>}
                            </Button>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{assignDialog.selectedProjects.length === 0 ? 'Sin proyectos seleccionados' : `${assignDialog.selectedProjects.length} proyecto(s) seleccionado(s)`}</p>
              {assignDialog.selectedProjects.length > 0 && (
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setAssignDialog(prev => ({ ...prev, selectedProjects: [], projectRoles: {} }))}>Limpiar selección</Button>
              )}
            </motion.div>
          </div>
          <DialogFooter className="p-4 pt-0 gap-2 border-t border-border/50 pt-4">
            <Button variant="outline" onClick={() => setAssignDialog({ open: false, member: null, selectedProjects: [], projectRoles: {} })} className="flex-1">Cancelar</Button>
            <Button onClick={confirmAssign} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium shadow-sm shadow-blue-500/20">
              <FolderKanban className="h-4 w-4 mr-1.5" />{assignDialog.selectedProjects.length > 0 ? 'Guardar Cambios' : 'Sin Asignar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function MemberCard({ member, projectRole, onEdit, onSuspend, onDelete, onAssign, onRemove, showRemove }: any) {
  const roleBadge = (() => {
    switch (member?.role) {
      case "Admin": return { icon: Shield, color: "bg-red-500/10 text-red-600 border-red-500/20" };
      case "Manager": return { icon: UserCog, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" };
      case "Technician": return { icon: Wrench, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
      case "Viewer": return { icon: Eye, color: "bg-slate-500/10 text-slate-600 border-slate-500/20" };
      default: return { icon: Shield, color: "bg-slate-500/10 text-slate-600 border-slate-500/20" };
    }
  })();
  const RoleIcon = roleBadge.icon;
  const isSuspended = member?.is_suspended;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
      <Card className={`relative border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 ${isSuspended ? 'opacity-50' : ''}`}>
        <CardContent className="p-4 text-center">
          <div className="flex justify-center mb-2">
            <div className="relative">
              <Avatar className="h-16 w-16 border-2 border-border/50">
                <AvatarImage src={member?.avatar_url || ""} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">{(member?.full_name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2)}</AvatarFallback>
              </Avatar>
              {isSuspended && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2"><Badge className="bg-red-500 text-white text-[8px] px-1.5 py-0">Suspendido</Badge></div>}
            </div>
          </div>
          <h3 className="font-semibold text-foreground text-sm truncate px-1">{member?.full_name || "Sin nombre"}</h3>
          <div className="flex justify-center mt-1 mb-2 gap-1 flex-wrap">
            <Badge variant="outline" className={`text-[10px] gap-1 px-1.5 py-0 ${roleBadge.color}`}><RoleIcon className="h-2.5 w-2.5" />{member?.role}</Badge>
            {projectRole === 'leader' && (
              <Badge className="bg-amber-500/10 text-amber-600 text-[10px] gap-1 px-1.5 py-0 border-amber-500/20">
                <Crown className="h-2.5 w-2.5" /> Líder
              </Badge>
            )}
          </div>
          <div className="space-y-1 mb-3 text-left">
            {member?.email && <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/30 rounded-md px-2 py-1"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{member.email}</span></div>}
            {member?.phone && <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/30 rounded-md px-2 py-1"><Phone className="h-3 w-3 shrink-0" /><span>{member.phone}</span></div>}
          </div>
          <div className="flex justify-center gap-0.5 pt-2 border-t border-border/30">
            <TooltipProvider>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-primary/10 hover:text-primary" onClick={() => onEdit(member)}><UserCog className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent side="bottom"><p className="text-xs">Editar</p></TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={`h-7 w-7 rounded-full ${isSuspended ? 'hover:bg-green-500/10 hover:text-green-500' : 'hover:bg-amber-500/10 hover:text-amber-500'}`} onClick={() => onSuspend(member)}>{isSuspended ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}</Button></TooltipTrigger><TooltipContent side="bottom"><p className="text-xs">{isSuspended ? 'Reactivar' : 'Suspender'}</p></TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-blue-500/10 hover:text-blue-500" onClick={() => onAssign(member)}><FolderKanban className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent side="bottom"><p className="text-xs">Gestionar proyectos</p></TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild>{showRemove ? <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-red-500/10 hover:text-red-500" onClick={onRemove}><Trash2 className="h-3.5 w-3.5" /></Button> : onDelete && <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-red-500/10 hover:text-red-500" onClick={() => onDelete(member)}><Trash2 className="h-3.5 w-3.5" /></Button>}</TooltipTrigger><TooltipContent side="bottom"><p className="text-xs">{showRemove ? 'Remover del proyecto' : 'Eliminar'}</p></TooltipContent></Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}