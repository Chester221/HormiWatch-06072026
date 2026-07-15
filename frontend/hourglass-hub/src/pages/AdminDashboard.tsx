import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Search, UserPlus, Pencil, Trash2, Shield, UserCheck, UserX,
  Loader2, Users, Mail, AlertTriangle, Settings2, Briefcase, Wrench,
  ChevronLeft, ChevronRight, CheckCircle, XCircle,
  Phone, User, Upload, Camera, X, CreditCard
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AddUserModal } from "@/components/team/AddUserModal";
import { motion, AnimatePresence } from "framer-motion";

const HORMI_BLUE = '#0DA2E7';
const HORMI_BLUE_BG = '#0DA2E715';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; user: any }>({ open: false, user: null });
  const [suspendDialog, setSuspendDialog] = useState<{ open: boolean; user: any }>({ open: false, user: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: any }>({ open: false, user: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  // 🔥 Campos del formulario de edición
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCedula, setEditCedula] = useState("");
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (profile?.role !== 'Admin') {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <Shield className="h-16 w-16 text-red-500/30 mb-4" />
          <h2 className="text-2xl font-bold text-foreground">Acceso Denegado</h2>
          <p className="text-muted-foreground mt-2">Solo el Administrador puede acceder a esta sección.</p>
        </div>
      </DashboardLayout>
    );
  }

  // ✅ Obtener usuarios de Supabase
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && user.is_active !== false) ||
      (statusFilter === "inactive" && user.is_active === false);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const rolePriority: Record<string, number> = { Admin: 0, Manager: 1, Technician: 2 };

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const priorityA = rolePriority[a.role] ?? 99;
    const priorityB = rolePriority[b.role] ?? 99;
    return priorityA - priorityB;
  });

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentUsers = sortedUsers.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  
  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active !== false).length,
    admins: users.filter(u => u.role === 'Admin').length,
    managers: users.filter(u => u.role === 'Manager').length,
    technicians: users.filter(u => u.role === 'Technician').length,
  };

  // 🔥 Abrir modal de edición con datos cargados
  const handleOpenEdit = (user: any) => {
    setEditFullName(user.full_name || "");
    setEditEmail(user.email || "");
    setEditPhone(user.phone || "");
    setEditCedula(user.cedula || "");
    setEditAvatar(user.avatar_url || null);
    setEditAvatarFile(null);
    setEditModal({ open: true, user });
  };

  // 🔥 Manejar subida de avatar
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("La imagen debe ser menor a 5MB");
        return;
      }
      setEditAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setEditAvatar(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // 🔥 Guardar cambios de edición
  const handleSaveEdit = async () => {
    if (!editModal.user) return;
    setIsSaving(true);

    try {
      let avatarUrl = editModal.user.avatar_url;

      // Subir avatar si hay uno nuevo
      if (editAvatarFile) {
        const fileExt = editAvatarFile.name.split('.').pop();
        const fileName = `${editModal.user.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, editAvatarFile, { upsert: true });
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
          avatarUrl = publicUrl;
        }
      }

      const { error } = await supabase.from('profiles').update({
        full_name: editFullName,
        email: editEmail,
        phone: editPhone || null,
        cedula: editCedula || null,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      }).eq('id', editModal.user.id);

      if (error) throw error;

      toast.success("Usuario actualizado correctamente");
      setEditModal({ open: false, user: null });
      fetchUsers();
    } catch (error: any) {
      console.error('Error en handleSaveEdit:', error);
      toast.error(error.message || 'Error al guardar cambios');
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ Activar/Desactivar usuario
  const handleToggleActive = async (user: any) => {
    try {
      const newStatus = !user.is_active;
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast.success(`Usuario ${newStatus ? 'activado' : 'desactivado'}`);
      fetchUsers();
      setSuspendDialog({ open: false, user: null });
    } catch (error: any) {
      console.error('Error en handleToggleActive:', error);
      toast.error(error.message || 'Error al cambiar estado');
    }
  };

  // ✅ ELIMINAR usuario COMPLETAMENTE (incluyendo auth.users)
  const handleDeleteUser = async (user: any) => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      // 1. Eliminar de project_members
      const { error: membersError } = await supabase
        .from('project_members')
        .delete()
        .eq('user_id', user.id);
      
      if (membersError) console.warn('Error eliminando project_members:', membersError);

      // 2. Eliminar de profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);
      
      if (profileError) throw profileError;

      // 3. 🔥 ELIMINAR DE auth.users usando la API de Supabase
      const supabaseUrl = 'https://tniprkdojqzpicukqvbe.supabase.co';
      const serviceRoleKey = 'sb_secret_j18764VUjLBMIjujWbTdqzA_nQJMzmaM';
      
      const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`
        }
      });

      if (response.ok) {
        toast.success(`Usuario "${user.full_name || user.email}" eliminado completamente`);
      } else {
        const errorData = await response.json();
        console.error('Error eliminando de auth.users:', errorData);
        toast.warning('Usuario eliminado de la app, pero el email podría seguir registrado en Supabase Auth');
      }
      
      fetchUsers();
      setDeleteDialog({ open: false, user: null });
    } catch (error: any) {
      console.error('Error en handleDeleteUser:', error);
      toast.error(error.message || 'Error al eliminar usuario');
    } finally {
      setIsDeleting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'Admin': 
        return { label: 'Administrador', icon: Settings2, className: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'Manager': 
        return { label: 'Manager', icon: Briefcase, className: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'Technician': 
        return { label: 'Técnico', icon: Wrench, className: 'bg-sky-50 text-sky-700 border-sky-200' };
      default: 
        return { label: role, icon: Users, className: 'bg-muted text-muted-foreground border-border' };
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20">
                <Settings2 className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Control de Usuarios</h1>
                <p className="text-sm text-muted-foreground">{stats.total} usuarios · {stats.active} activos</p>
              </div>
            </div>
          </div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button onClick={() => setAddUserOpen(true)} size="sm" className="gap-2 text-white" style={{ backgroundColor: HORMI_BLUE }}>
              <UserPlus className="h-4 w-4" /> Nuevo Usuario
            </Button>
          </motion.div>
        </motion.div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { icon: Users, label: "Total Usuarios", value: stats.total, sub: `${stats.active} activos`, delay: 0.05 },
            { icon: CheckCircle, label: "Activos", value: stats.active, sub: `${stats.total - stats.active} inactivos`, delay: 0.1 },
            { icon: Settings2, label: "Administradores", value: stats.admins, sub: "Acceso total", delay: 0.15 },
            { icon: Briefcase, label: "Managers", value: stats.managers, sub: "Gestión de equipos", delay: 0.2 },
            { icon: Wrench, label: "Técnicos", value: stats.technicians, sub: "Miembros del equipo", delay: 0.25 },
          ].map((metric, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: metric.delay, duration: 0.4 }}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/5 transition-transform duration-300 group-hover:scale-150" />
              <div className="absolute right-4 top-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
                  <metric.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="space-y-1.5 pr-14 p-4 pb-3">
                <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">{metric.value}</p>
                {metric.sub && (
                  <p className="text-[10px] text-muted-foreground">{metric.sub}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Buscador + Filtros */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl border border-border bg-card p-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nombre o email..." 
                value={searchQuery} 
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} 
                className="pl-9 h-9 text-xs bg-background" 
              />
            </div>
            <div className="flex gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-9 w-[120px] text-xs">
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Technician">Técnico</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[120px] text-xs">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* Grid de Tarjetas */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: HORMI_BLUE }} />
          </div>
        ) : currentUsers.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 rounded-xl border border-border bg-card">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No se encontraron usuarios</p>
          </motion.div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence>
                {currentUsers.map((user, idx) => {
                  const badge = getRoleBadge(user.role);
                  const RoleIcon = badge.icon;
                  const isActive = user.is_active !== false;
                  
                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: idx * 0.04 }}
                      whileHover={{ y: -4, scale: 1.02 }}
                      className={`rounded-xl border transition-all duration-300 group relative overflow-hidden ${
                        isActive 
                          ? 'border-border/50 bg-card hover:shadow-xl hover:border-[#0DA2E7]/20' 
                          : 'border-red-200/50 bg-red-50/20 opacity-80'
                      }`}
                    >
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#0DA2E7]/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="relative">
                            <Avatar className={`h-11 w-11 ring-2 transition-all duration-300 ${
                              isActive ? 'ring-border group-hover:ring-[#0DA2E7]/40' : 'ring-red-200'
                            }`}>
                              <AvatarImage src={user.avatar_url} />
                              <AvatarFallback className="text-xs font-semibold bg-muted text-muted-foreground">
                                {getInitials(user.full_name || "U")}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-card ${
                              isActive ? 'bg-emerald-400' : 'bg-red-400'
                            }`} />
                          </div>
                          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 gap-1.5 font-medium ${badge.className}`}>
                            <RoleIcon className="h-3 w-3" />
                            {badge.label}
                          </Badge>
                        </div>

                        <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-[#0DA2E7] transition-colors">
                          {user.full_name || "Sin nombre"}
                        </h3>
                        
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {user.phone && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md">
                              <Phone className="h-3 w-3" />{user.phone}
                            </span>
                          )}
                          {user.cedula && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md">
                              <CreditCard className="h-3 w-3" />{user.cedula}
                            </span>
                          )}
                          {!user.phone && !user.cedula && (
                            <span className="text-[10px] text-muted-foreground/50 italic">Sin info adicional</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/50">
                          <span className={`text-[10px] font-medium flex items-center gap-1 ${
                            isActive ? 'text-emerald-600' : 'text-red-500'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
                            {isActive ? 'Activo' : 'Inactivo'}
                          </span>
                          
                          <div className="flex items-center gap-0.5">
                            <Button 
                              variant="ghost" size="sm" 
                              className="h-7 w-7 p-0 hover:bg-[#0DA2E7]/10 hover:text-[#0DA2E7] rounded-lg transition-all" 
                              onClick={() => handleOpenEdit(user)} title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" size="sm" 
                              className={`h-7 w-7 p-0 rounded-lg transition-all ${
                                isActive 
                                  ? 'hover:bg-amber-100 hover:text-amber-600' 
                                  : 'hover:bg-emerald-100 hover:text-emerald-600'
                              }`} 
                              onClick={() => setSuspendDialog({ open: true, user })} 
                              title={isActive ? "Desactivar" : "Activar"}
                            >
                              {isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                            </Button>
                            <Button 
                              variant="ghost" size="sm" 
                              className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-500 rounded-lg transition-all" 
                              onClick={() => setDeleteDialog({ open: true, user })} 
                              title="Eliminar"
                              disabled={isDeleting}
                            >
                              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center gap-3 mt-6">
                <p className="text-xs text-muted-foreground">
                  Mostrando {indexOfFirst + 1}-{Math.min(indexOfLast, sortedUsers.length)} de {sortedUsers.length} usuarios
                </p>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" size="sm" 
                    className="h-8 px-3 text-xs gap-1"
                    onClick={() => setCurrentPage(1)} 
                    disabled={currentPage === 1}
                  >
                    Primero
                  </Button>
                  <Button 
                    variant="outline" size="icon" 
                    className="h-8 w-8" 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((p, idx, arr) => (
                        <div key={p} className="flex items-center gap-1">
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
                            <span className="text-xs text-muted-foreground px-1">...</span>
                          )}
                          <button
                            onClick={() => setCurrentPage(p)}
                            className={`h-8 w-8 rounded-lg text-xs font-medium transition-all duration-200 ${
                              p === currentPage
                                ? 'bg-[#0DA2E7] text-white shadow-md'
                                : 'hover:bg-muted text-muted-foreground'
                            }`}
                          >
                            {p}
                          </button>
                        </div>
                      ))}
                  </div>

                  <Button 
                    variant="outline" size="icon" 
                    className="h-8 w-8" 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" size="sm" 
                    className="h-8 px-3 text-xs gap-1"
                    onClick={() => setCurrentPage(totalPages)} 
                    disabled={currentPage === totalPages}
                  >
                    Último
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Por página:</span>
                  {[8, 12, 16].map(n => (
                    <button
                      key={n}
                      onClick={() => { setItemsPerPage(n); setCurrentPage(1); }}
                      className={`text-[10px] px-2 py-0.5 rounded-md transition-all ${
                        itemsPerPage === n 
                          ? 'bg-[#0DA2E7]/10 text-[#0DA2E7] font-medium' 
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Edición */}
      <Dialog open={editModal.open} onOpenChange={(open) => { if (!open) setEditModal({ open: false, user: null }); }}>
        <DialogContent className="max-w-lg bg-card border-border p-0 rounded-2xl overflow-hidden shadow-2xl max-h-[92vh] overflow-y-auto">
          {editModal.user && (
            <>
              <div className="relative p-5 bg-gradient-to-r from-[#0DA2E7]/15 via-[#0DA2E7]/5 to-transparent border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0DA2E7] to-[#0B8BC7] shadow-lg shadow-[#0DA2E7]/30">
                    <Pencil className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold text-foreground">Editar Usuario</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      {editModal.user.full_name || "Usuario"}
                    </DialogDescription>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <Avatar className="h-16 w-16 ring-2 ring-border">
                      <AvatarImage src={editAvatar || editModal.user.avatar_url || ""} />
                      <AvatarFallback className="text-lg font-bold bg-muted text-muted-foreground">
                        {getInitials(editFullName || editModal.user.full_name || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <label className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[#0DA2E7] text-white cursor-pointer hover:bg-[#0B8BC7] transition-colors shadow-lg">
                      <Camera className="h-3.5 w-3.5" />
                      <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                    </label>
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground" /> Nombre completo
                    </Label>
                    <Input 
                      value={editFullName} 
                      onChange={e => setEditFullName(e.target.value)} 
                      className="bg-muted/30 border-border h-10 rounded-lg text-sm" 
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" /> Rol <span className="text-[10px] text-muted-foreground">(solo lectura)</span>
                  </Label>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                    {(() => {
                      const b = getRoleBadge(editModal.user.role);
                      const Icon = b.icon;
                      return (
                        <>
                          <div className="p-1.5 rounded-lg bg-muted/50">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-foreground">{b.label}</span>
                            <p className="text-[11px] text-muted-foreground">
                              {editModal.user.role === 'Admin' && 'Acceso total al sistema'}
                              {editModal.user.role === 'Manager' && 'Gestión de proyectos y equipos'}
                              {editModal.user.role === 'Technician' && 'Registro de horas y tareas'}
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Correo electrónico
                    </Label>
                    <Input 
                      value={editEmail} 
                      onChange={e => setEditEmail(e.target.value)} 
                      className="bg-muted/30 border-border h-10 rounded-lg text-sm" 
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Teléfono
                    </Label>
                    <Input 
                      value={editPhone} 
                      onChange={e => setEditPhone(e.target.value)} 
                      placeholder="+58 412 413 4891" 
                      className="bg-muted/30 border-border h-10 rounded-lg text-sm font-mono" 
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-muted-foreground" /> Cédula
                  </Label>
                  <Input 
                    value={editCedula} 
                    onChange={e => setEditCedula(e.target.value)} 
                    placeholder="V-12345678" 
                    className="bg-muted/30 border-border h-10 rounded-lg text-sm" 
                  />
                </div>
              </div>

              <DialogFooter className="p-5 pt-0 gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setEditModal({ open: false, user: null })} 
                  className="rounded-lg h-10 px-4 text-sm border-border flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveEdit} 
                  disabled={isSaving} 
                  className="rounded-lg h-10 px-4 gap-2 text-white text-sm flex-1" 
                  style={{ backgroundColor: HORMI_BLUE }}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  {isSaving ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Nuevo Usuario */}
      <AddUserModal open={addUserOpen} onOpenChange={setAddUserOpen} onSuccess={fetchUsers} />

      {/* Diálogo Suspender/Activar */}
      <Dialog open={suspendDialog.open} onOpenChange={(open) => setSuspendDialog({ open, user: open ? suspendDialog.user : null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{suspendDialog.user?.is_active !== false ? 'Desactivar Usuario' : 'Activar Usuario'}</DialogTitle>
            <DialogDescription>
              {suspendDialog.user?.is_active !== false 
                ? 'El usuario no podrá iniciar sesión ni interactuar con el sistema.' 
                : 'El usuario recuperará el acceso al sistema.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              ¿Estás seguro de {suspendDialog.user?.is_active !== false ? 'desactivar' : 'activar'} a <strong className="text-foreground">{suspendDialog.user?.full_name || suspendDialog.user?.email}</strong>?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialog({ open: false, user: null })}>Cancelar</Button>
            <Button 
              onClick={() => handleToggleActive(suspendDialog.user)} 
              className={suspendDialog.user?.is_active !== false ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"}
            >
              {suspendDialog.user?.is_active !== false ? <><UserX className="h-4 w-4 mr-1.5" /> Desactivar</> : <><UserCheck className="h-4 w-4 mr-1.5" /> Activar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo Eliminar */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, user: open ? deleteDialog.user : null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar Usuario</DialogTitle>
            <DialogDescription>Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              ¿Eliminar permanentemente a <strong className="text-red-500">{deleteDialog.user?.full_name || deleteDialog.user?.email}</strong>?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, user: null })}>Cancelar</Button>
            <Button 
              variant="destructive" 
              onClick={() => handleDeleteUser(deleteDialog.user)}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}