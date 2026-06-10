import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { 
  UserPlus, 
  Mail, 
  Shield, 
  Loader2, 
  UserCheck,
  UserCog,
  Search,
  Users,
  X,
  Crown,
  Briefcase,
  Wrench,
  Eye
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface AddMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddMemberModal({ open, onOpenChange, onSuccess }: AddMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('technician');
  const [isLoading, setIsLoading] = useState(false);
  const [foundUser, setFoundUser] = useState<any>(null);
  const [showUserList, setShowUserList] = useState(false);
  const [userList, setUserList] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const { profile } = useAuth();

  const currentUserRole = profile?.role || 'Technician';
  const isAdmin = currentUserRole === 'Admin';
  const isManager = currentUserRole === 'Manager';

  // 🔒 Definir roles según el rol del usuario actual
  const getRoleOptions = () => {
    if (isAdmin) {
      // Admin puede asignar CUALQUIER rol
      return [
        { value: "admin", label: "Administrador", description: "Acceso total al sistema", icon: Crown, color: "purple" },
        { value: "manager", label: "Manager", description: "Gestión de proyectos y equipos", icon: Briefcase, color: "blue" },
        { value: "technician", label: "Técnico", description: "Registro de horas y tareas", icon: Wrench, color: "green" },
        { value: "viewer", label: "Solo Vista", description: "Visualización sin edición", icon: Eye, color: "gray" },
      ];
    }
    
    if (isManager) {
      // Manager NO puede asignar Administrador
      return [
        { value: "manager", label: "Manager", description: "Gestión de proyectos y equipos", icon: Briefcase, color: "blue" },
        { value: "technician", label: "Técnico", description: "Registro de horas y tareas", icon: Wrench, color: "green" },
        { value: "viewer", label: "Solo Vista", description: "Visualización sin edición", icon: Eye, color: "gray" },
      ];
    }
    
    // Técnico y Solo Vista no pueden asignar roles
    return [];
  };

  const roleOptions = getRoleOptions();

  // Cargar lista de usuarios
  const loadUsers = async () => {
    setIsLoadingUsers(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, avatar_url')
      .order('full_name', { ascending: true });

    if (error) {
      toast.error('Error al cargar usuarios');
    } else {
      setUserList(data || []);
      setShowUserList(true);
    }
    setIsLoadingUsers(false);
  };

  const selectUser = (user: any) => {
    setFoundUser(user);
    setEmail(user.email);
    setShowUserList(false);
    toast.success(`Usuario seleccionado: ${user.full_name || user.email}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!foundUser) {
      toast.error('Debes seleccionar un usuario de la lista');
      return;
    }

    setIsLoading(true);

    // 🔒 Validaciones de permisos
    if (isManager && role === 'admin') {
      toast.error('No tienes permisos para asignar el rol de Administrador');
      setIsLoading(false);
      return;
    }

    // No permitir que un Manager modifique a un Admin
    if (isManager && foundUser.role === 'admin') {
      toast.error('No puedes modificar el rol de un Administrador');
      setIsLoading(false);
      return;
    }

    // Actualizar rol del usuario
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: role })
      .eq('id', foundUser.id);

    if (updateError) {
      toast.error(`Error al actualizar rol: ${updateError.message}`);
      setIsLoading(false);
      return;
    }

    const roleLabel = roleOptions.find(opt => opt.value === role)?.label || role;
    toast.success(`${foundUser.full_name || foundUser.email} ahora tiene rol de ${roleLabel}`);
    setEmail('');
    setRole('technician');
    setFoundUser(null);
    setIsLoading(false);
    onOpenChange(false);
    onSuccess();
  };

  const resetForm = () => {
    setEmail('');
    setRole('technician');
    setFoundUser(null);
    setShowUserList(false);
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
    const option = roleOptions.find(opt => opt.value === roleValue);
    return option?.label || roleValue;
  };

  const getRoleIcon = (roleValue: string) => {
    switch (roleValue) {
      case 'admin': return <Crown className="h-3 w-3" />;
      case 'manager': return <Briefcase className="h-3 w-3" />;
      case 'technician': return <Wrench className="h-3 w-3" />;
      case 'viewer': return <Eye className="h-3 w-3" />;
      default: return <UserCheck className="h-3 w-3" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) resetForm();
      onOpenChange(newOpen);
    }}>
      <DialogContent className="max-w-md bg-card border-border p-0 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20">
              <UserPlus className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-foreground">
                Gestionar Miembro
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Asigna o actualiza el rol de un miembro del equipo
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 pt-4">
          <div className="space-y-5">
            {/* Selección de Usuario */}
            <div className="space-y-2">
              <Label className="text-foreground flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                Seleccionar Usuario <span className="text-destructive">*</span>
              </Label>
              
              {!foundUser ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={loadUsers}
                  className="w-full gap-2"
                  disabled={isLoadingUsers}
                >
                  {isLoadingUsers ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  {isLoadingUsers ? 'Cargando...' : 'Buscar Usuarios'}
                </Button>
              ) : (
                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {foundUser.avatar_url ? (
                        <img 
                          src={foundUser.avatar_url} 
                          alt={foundUser.full_name} 
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-sm font-medium">
                          {(foundUser.full_name || foundUser.email).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {foundUser.full_name || "Usuario sin nombre"}
                        </p>
                        <p className="text-xs text-muted-foreground">{foundUser.email}</p>
                        {foundUser.role && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getRoleColor(foundUser.role)} mt-1 inline-block flex items-center gap-1`}>
                            {getRoleIcon(foundUser.role)}
                            Rol actual: {getRoleLabel(foundUser.role)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFoundUser(null);
                        setEmail('');
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Lista de Usuarios */}
            {showUserList && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="p-3 bg-muted/30 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">Usuarios disponibles</span>
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
                  {userList.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No hay usuarios registrados
                    </div>
                  ) : (
                    userList.map((user) => (
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
                        {user.role && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getRoleColor(user.role)} shrink-0 flex items-center gap-1`}>
                            {getRoleIcon(user.role)}
                            {getRoleLabel(user.role)}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Rol - solo visible si hay usuario seleccionado */}
            {foundUser && (
              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                  Nuevo Rol
                </Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="bg-muted/50 border-border">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span className="flex items-center gap-2">
                            {option.icon && <option.icon className="h-3.5 w-3.5" />}
                            {option.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground pl-5">
                            {option.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  {isAdmin 
                    ? "Como Administrador, puedes asignar cualquier rol" 
                    : isManager
                      ? "Como Manager, puedes asignar Manager, Técnico o Solo Vista. No puedes asignar Administrador."
                      : "No tienes permisos para asignar roles"}
                </p>
              </div>
            )}

            {/* Info adicional */}
            {foundUser && (
              <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-2">
                  <UserCog className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Se actualizará el rol de <strong>{foundUser.full_name || foundUser.email}</strong>
                    {foundUser.role && (
                      <span> de <span className={getRoleColor(foundUser.role)}>{getRoleLabel(foundUser.role)}</span> a <span className={getRoleColor(role)}>{roleOptions.find(r => r.value === role)?.label || role}</span></span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="hover:bg-muted"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !foundUser}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Actualizar Rol
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}