// frontend/hourglass-hub/src/pages/Admin/AdminDashboard.tsx

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Search,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Shield,
  UserPlus,
  UserCheck,
  UserX,
  Loader2,
  Users,
  Mail,
  Phone,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Crown,
  Briefcase,
  Wrench,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AddUserModal } from "@/components/team/AddUserModal";
import { TeamMemberFormModal } from "@/components/team/TeamMemberFormModal";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; user: any }>({ open: false, user: null });
  const [suspendDialog, setSuspendDialog] = useState<{ open: boolean; user: any }>({ open: false, user: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: any }>({ open: false, user: null });
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;

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

  const fetchUsers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) {
      setUsers(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const handleToggleActive = async (user: any) => {
    const newStatus = !user.is_active;
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: newStatus })
      .eq('id', user.id);

    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      toast.success(`Usuario ${newStatus ? 'activado' : 'desactivado'} correctamente`);
      fetchUsers();
    }
    setSuspendDialog({ open: false, user: null });
  };

  const handleDeleteUser = async (user: any) => {
    await supabase.from('project_members').delete().eq('user_id', user.id);
    const { error } = await supabase.from('profiles').delete().eq('id', user.id);
    
    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      toast.success(`Usuario "${user.full_name}" eliminado`);
      fetchUsers();
    }
    setDeleteDialog({ open: false, user: null });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Admin': return <Crown className="h-3.5 w-3.5 text-purple-500" />;
      case 'Manager': return <Briefcase className="h-3.5 w-3.5 text-blue-500" />;
      case 'Technician': return <Wrench className="h-3.5 w-3.5 text-emerald-500" />;
      case 'Viewer': return <Eye className="h-3.5 w-3.5 text-slate-500" />;
      default: return <Users className="h-3.5 w-3.5" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'Admin': return { label: 'Administrador', className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' };
      case 'Manager': return { label: 'Manager', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
      case 'Technician': return { label: 'Técnico', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
      case 'Viewer': return { label: 'Solo Vista', className: 'bg-slate-500/10 text-slate-600 border-slate-500/20' };
      default: return { label: role, className: 'bg-muted text-muted-foreground' };
    }
  };

  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active !== false).length,
    admins: users.filter(u => u.role === 'Admin').length,
    managers: users.filter(u => u.role === 'Manager').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                <Shield className="h-5 w-5 text-emerald-500" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Control de Usuarios</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.total} total · {stats.active} activos · {stats.admins} admins · {stats.managers} managers
            </p>
          </div>
          
          {/* ✅ Botón principal en AZUL */}
          <Button 
  onClick={() => setAddUserOpen(true)} 
  size="sm"
  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all"
>
  <UserPlus className="h-4 w-4" />
  Nuevo Usuario
</Button>
        </div>

        {/* Search bar */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm bg-muted/30 border-border/50 focus:bg-card transition-all"
          />
        </div>

        {/* Tabla */}
        <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-transparent border-b border-border/50">
                <TableHead className="text-xs font-medium">Usuario</TableHead>
                <TableHead className="text-xs font-medium">Email</TableHead>
                <TableHead className="text-xs font-medium">Rol</TableHead>
                <TableHead className="text-xs font-medium">Estado</TableHead>
                <TableHead className="text-xs font-medium w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-500" />
                  </TableCell>
                </TableRow>
              ) : currentUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm">No se encontraron usuarios</p>
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence>
                  {currentUsers.map((user, index) => {
                    const roleBadge = getRoleBadge(user.role);
                    const RoleIcon = getRoleIcon(user.role);
                    return (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="border-b border-border/30 hover:bg-muted/20 transition-colors group"
                      >
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar_url} />
                              <AvatarFallback className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-600 text-xs font-medium">
                                {(user.full_name || user.email || "U").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-foreground">{user.full_name || "Sin nombre"}</p>
                              {user.cedula && (
                                <p className="text-[10px] text-muted-foreground">{user.cedula}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${roleBadge.className} gap-1 px-2 py-0.5 text-xs font-normal`}>
                            {RoleIcon}
                            <span>{roleBadge.label}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.is_active !== false ? (
                            <div className="flex items-center gap-1">
                              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-xs text-emerald-600">Activo</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <XCircle className="h-3 w-3 text-red-500" />
                              <span className="text-xs text-red-500">Inactivo</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                              <DropdownMenuItem onClick={() => setEditModal({ open: true, user })} className="cursor-pointer gap-2 text-xs">
                                <Pencil className="h-3.5 w-3.5" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSuspendDialog({ open: true, user })} className="cursor-pointer gap-2 text-xs">
                                {user.is_active !== false ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                                {user.is_active !== false ? 'Desactivar' : 'Activar'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeleteDialog({ open: true, user })} className="cursor-pointer gap-2 text-xs text-red-500">
                                <Trash2 className="h-3.5 w-3.5" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Mostrando {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredUsers.length)} de {filteredUsers.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground px-2">
                  Pág. {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      <AddUserModal open={addUserOpen} onOpenChange={setAddUserOpen} onSuccess={fetchUsers} />
      
      <TeamMemberFormModal
        open={editModal.open}
        onOpenChange={(open) => setEditModal({ open, user: open ? editModal.user : null })}
        member={editModal.user}
        onSubmit={() => {
          fetchUsers();
          setEditModal({ open: false, user: null });
        }}
      />

      {/* Suspender/Activar Dialog */}
      <Dialog open={suspendDialog.open} onOpenChange={(open) => setSuspendDialog({ open, user: open ? suspendDialog.user : null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{suspendDialog.user?.is_active !== false ? 'Desactivar Usuario' : 'Activar Usuario'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              ¿Estás seguro de {suspendDialog.user?.is_active !== false ? 'desactivar' : 'activar'} a <span className="font-semibold text-foreground">{suspendDialog.user?.full_name || suspendDialog.user?.email}</span>?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialog({ open: false, user: null })}>Cancelar</Button>
            {/* ✅ Botón de activar en VERDE */}
            <Button 
              onClick={() => handleToggleActive(suspendDialog.user)} 
              className={suspendDialog.user?.is_active !== false 
                ? "bg-red-600 hover:bg-red-700" 
                : "bg-emerald-600 hover:bg-emerald-700"}
            >
              {suspendDialog.user?.is_active !== false ? 'Desactivar' : 'Activar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Eliminar Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, user: open ? deleteDialog.user : null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar Usuario</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              ¿Eliminar permanentemente a <span className="font-semibold text-red-500">{deleteDialog.user?.full_name || deleteDialog.user?.email}</span>?
            </p>
            <p className="text-xs text-red-500/70 mt-2">Esta acción no se puede deshacer.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, user: null })}>Cancelar</Button>
            <Button variant="destructive" onClick={() => handleDeleteUser(deleteDialog.user)}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}