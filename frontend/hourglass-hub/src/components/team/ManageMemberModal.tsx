import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { 
  Users, Shield, Loader2, UserCheck, UserCog, Search, X, Check, EyeOff, Crown, Briefcase, Wrench
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const HORMI_BLUE = '#0DA2E7';

interface ManageMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ManageMemberModal({ open, onOpenChange, onSuccess }: ManageMemberModalProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newRole, setNewRole] = useState("");
  const [showUserList, setShowUserList] = useState(false);
  const { profile } = useAuth();

  const currentUserRole = profile?.role || 'Technician';
  const isAdmin = currentUserRole === 'Admin';
  const isManager = currentUserRole === 'Manager';

  const loadUsers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('profiles').select('id, email, full_name, role, avatar_url, is_active').order('full_name', { ascending: true });
    if (error) { toast.error('Error al cargar usuarios'); }
    else { setUsers(data || []); setShowUserList(true); }
    setIsLoading(false);
  };

  const selectUser = (user: any) => {
    setSelectedUser(user);
    setNewRole(user.role || 'Technician');
    setShowUserList(false);
    toast.success(`Seleccionado: ${user.full_name || user.email}`);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) { toast.error('Selecciona un usuario'); return; }
    if (isManager && newRole === 'Admin') { toast.error('Un Manager no puede asignar Administrador'); return; }
    setIsLoading(true);
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', selectedUser.id);
    if (error) { toast.error(`Error: ${error.message}`); }
    else { toast.success(`Rol actualizado para ${selectedUser.full_name || selectedUser.email}`); setSelectedUser(null); onSuccess(); onOpenChange(false); }
    setIsLoading(false);
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_active: !currentActive }).eq('id', userId);
    if (error) { toast.error(`Error: ${error.message}`); }
    else { toast.success(`Usuario ${!currentActive ? 'activado' : 'desactivado'}`); loadUsers(); }
  };

  const getRoleColor = (roleValue: string) => {
    switch (roleValue) {
      case 'Admin': return 'text-amber-600 bg-amber-50';
      case 'Manager': return 'text-blue-600 bg-blue-50';
      case 'Technician': return 'text-sky-600 bg-sky-50';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getRoleLabel = (roleValue: string) => {
    switch (roleValue) {
      case 'Admin': return 'Administrador';
      case 'Manager': return 'Manager';
      case 'Technician': return 'Técnico';
      default: return roleValue;
    }
  };

  const getRoleIcon = (roleValue: string) => {
    switch (roleValue) {
      case 'Admin': return <Crown className="h-3.5 w-3.5" />;
      case 'Manager': return <Briefcase className="h-3.5 w-3.5" />;
      case 'Technician': return <Wrench className="h-3.5 w-3.5" />;
      default: return <UserCheck className="h-3.5 w-3.5" />;
    }
  };

  const roleOptions = [
    { value: "Admin", label: "Administrador", description: "Acceso total al sistema", color: "#f59e0b", icon: Crown },
    { value: "Manager", label: "Manager", description: "Gestión de proyectos y equipos", color: "#3b82f6", icon: Briefcase },
    { value: "Technician", label: "Técnico", description: "Registro de horas y tareas", color: HORMI_BLUE, icon: Wrench },
  ];

  const resetForm = () => { setSelectedUser(null); setShowUserList(false); };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => { if (!newOpen) resetForm(); onOpenChange(newOpen); }}>
      <DialogContent className="max-w-md bg-card border-border p-0 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header con gradiente #0DA2E7 */}
        <div className="relative p-5 bg-gradient-to-r from-[#0DA2E7]/15 via-[#0DA2E7]/5 to-transparent border-b border-border">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#0DA2E7]/5 rounded-full blur-2xl" />
          <div className="flex items-center gap-3 relative">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0DA2E7] to-[#0B8BC7] shadow-lg shadow-[#0DA2E7]/30">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">Gestionar Miembro</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Administra los roles y estados de los usuarios
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Selección de Usuario */}
          {!selectedUser ? (
            <Button type="button" variant="outline" onClick={loadUsers} className="w-full gap-2 h-10 rounded-lg text-sm" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {isLoading ? 'Cargando...' : 'Buscar Usuarios'}
            </Button>
          ) : (
            <div className="p-3 rounded-lg bg-[#0DA2E7]/5 border border-[#0DA2E7]/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-border" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#0DA2E7] to-[#0B8BC7] flex items-center justify-center text-white text-sm font-medium">
                      {(selectedUser.full_name || selectedUser.email).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">{selectedUser.full_name || "Usuario sin nombre"}</p>
                    <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 mt-1 ${getRoleColor(selectedUser.role)}`}>
                      {getRoleIcon(selectedUser.role)} Rol actual: {getRoleLabel(selectedUser.role)}
                    </span>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setSelectedUser(null); setNewRole(""); }}><X className="h-4 w-4" /></Button>
              </div>
            </div>
          )}

          {/* Lista de Usuarios */}
          {showUserList && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="p-3 bg-muted/30 border-b border-border flex items-center justify-between">
                <span className="text-xs font-medium">Usuarios registrados</span>
                <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowUserList(false)}><X className="h-3 w-3" /></Button>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {users.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">No hay usuarios registrados</div>
                ) : (
                  users.map((user) => (
                    <button key={user.id} type="button" onClick={() => selectUser(user)}
                      className="w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-0"
                    >
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0DA2E7] to-[#0B8BC7] flex items-center justify-center text-white text-xs font-medium">
                          {(user.full_name || user.email).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.full_name || "Usuario sin nombre"}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 ${getRoleColor(user.role)}`}>
                          {getRoleIcon(user.role)}{getRoleLabel(user.role)}
                        </span>
                        {!user.is_active && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">Inactivo</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Selector de Rol */}
          {selectedUser && (
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" /> Cambiar Rol
              </Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="bg-muted/30 border-border h-10 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {roleOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span className="flex items-center gap-2 text-sm"><Icon className="h-3.5 w-3.5" style={{ color: option.color }} />{option.label}</span>
                          <span className="text-[10px] text-muted-foreground pl-5">{option.description}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Estado del usuario */}
          {selectedUser && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
              <span className="text-sm text-foreground">Estado de la cuenta</span>
              <button
                onClick={() => handleToggleActive(selectedUser.id, selectedUser.is_active)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedUser.is_active ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-red-50 text-red-600 hover:bg-red-100"
                }`}
              >
                {selectedUser.is_active ? <><Check className="h-3.5 w-3.5" /> Activo</> : <><EyeOff className="h-3.5 w-3.5" /> Inactivo</>}
              </button>
            </div>
          )}
        </div>

        <DialogFooter className="p-5 pt-0 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg h-10 px-4 text-sm">Cerrar</Button>
          {selectedUser && (
            <Button onClick={handleUpdateRole} disabled={isLoading} className="rounded-lg h-10 px-4 gap-2 text-white text-sm" style={{ backgroundColor: HORMI_BLUE }}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
              Actualizar Rol
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}