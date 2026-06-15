import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { 
  Users, 
  Mail, 
  Shield, 
  Loader2, 
  UserCheck,
  UserCog,
  Search,
  X,
  Check,
  Eye,
  EyeOff
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

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

  // Cargar lista de usuarios
  const loadUsers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, avatar_url, is_active')
      .order('full_name', { ascending: true });

    if (error) {
      toast.error('Error al cargar usuarios');
    } else {
      setUsers(data || []);
      setShowUserList(true);
    }
    setIsLoading(false);
  };

  const selectUser = (user: any) => {
    setSelectedUser(user);
    setNewRole(user.role || 'technician');
    setShowUserList(false);
    toast.success(`Usuario seleccionado: ${user.full_name || user.email}`);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) {
      toast.error('Selecciona un usuario');
      return;
    }

    // Validar permisos de Manager
    if (isManager && (newRole === 'admin' || newRole === 'manager')) {
      toast.error('Un Manager solo puede asignar Técnico o Solo Vista');
      return;
    }

    setIsLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', selectedUser.id);

    if (error) {
      toast.error(`Error al actualizar rol: ${error.message}`);
    } else {
      toast.success(`Rol actualizado para ${selectedUser.full_name || selectedUser.email}`);
      setSelectedUser(null);
      onSuccess();
      onOpenChange(false);
    }
    setIsLoading(false);
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !currentActive })
      .eq('id', userId);

    if (error) {
      toast.error(`Error al cambiar estado: ${error.message}`);
    } else {
      toast.success(`Usuario ${!currentActive ? 'activado' : 'desactivado'}`);
      loadUsers();
    }
  };

  const getRoleColor = (roleValue: string) => {
    switch (roleValue) {
      case 'admin': return 'text-purple-600 bg-purple-500/10';
      case 'manager': return 'text-blue-600 bg-blue-500/10';
      case 'technician': return 'text-green-600 bg-green-500/10';
      case 'viewer': return 'text-gray-600 bg-gray-500/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getRoleLabel = (roleValue: string) => {
    switch (roleValue) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Manager';
      case 'technician': return 'Técnico';
      case 'viewer': return 'Solo Vista';
      default: return roleValue;
    }
  };

  const roleOptions = [
    { value: "admin", label: "Administrador", description: "Acceso total al sistema" },
    { value: "manager", label: "Manager", description: "Gestión de proyectos y equipos" },
    { value: "technician", label: "Técnico", description: "Registro de horas y tareas" },
    { value: "viewer", label: "Solo Vista", description: "Visualización sin edición" },
  ];

  const resetForm = () => {
    setSelectedUser(null);
    setShowUserList(false);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) resetForm();
      onOpenChange(newOpen);
    }}>
      <DialogContent className="max-w-md bg-card border-border p-0 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-500/10 to-transparent border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
              <Users className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-foreground">
                Gestionar Miembro
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Administra los roles y estados de los usuarios
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Selección de Usuario */}
          {!selectedUser ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={loadUsers}
                className="w-full gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {isLoading ? 'Cargando...' : 'Buscar Usuarios'}
              </Button>
            </>
          ) : (
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedUser.avatar_url ? (
                    <img 
                      src={selectedUser.avatar_url} 
                      alt={selectedUser.full_name} 
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-sm font-medium">
                      {(selectedUser.full_name || selectedUser.email).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {selectedUser.full_name || "Usuario sin nombre"}
                    </p>
                    <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getRoleColor(selectedUser.role)} mt-1 inline-block`}>
                      Rol actual: {getRoleLabel(selectedUser.role)}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedUser(null);
                    setNewRole("");
                  }}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Lista de Usuarios */}
          {showUserList && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="p-3 bg-muted/30 border-b border-border flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">Usuarios registrados</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUserList(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {users.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No hay usuarios registrados
                  </div>
                ) : (
                  users.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => selectUser(user)}
                      className="w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-0"
                    >
                      {user.avatar_url ? (
                        <img 
                          src={user.avatar_url} 
                          alt={user.full_name} 
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xs font-medium">
                          {(user.full_name || user.email).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user.full_name || "Usuario sin nombre"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getRoleColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                        {!user.is_active && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600">
                            Inactivo
                          </span>
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
              <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" />
                Cambiar Rol
              </Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="bg-muted/30 border-border h-10 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span className="flex items-center gap-2">
                          <UserCheck className="h-3.5 w-3.5" />
                          {option.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {option.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
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
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm transition-colors ${
                  selectedUser.is_active
                    ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                    : "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                }`}
              >
                {selectedUser.is_active ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Activo
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    Inactivo
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <DialogFooter className="p-5 pt-0 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">
            Cerrar
          </Button>
          {selectedUser && (
            <Button 
              onClick={handleUpdateRole}
              disabled={isLoading}
              className="rounded-lg gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Actualizar Rol
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}