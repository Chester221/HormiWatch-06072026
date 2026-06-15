<<<<<<< HEAD
=======
// frontend/hourglass-hub/src/components/team/AddUserModal.tsx

>>>>>>> 11069f104d1610e5c5ea848911ab81005acbe8e2
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
<<<<<<< HEAD
import { Loader2, UserPlus, Mail, Shield, Phone, User, Key, CreditCard, Sparkles, AlertCircle } from "lucide-react";
=======
import { Loader2, UserPlus, Mail, Shield, User } from "lucide-react";
>>>>>>> 11069f104d1610e5c5ea848911ab81005acbe8e2
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddUserModal({ open, onOpenChange, onSuccess }: AddUserModalProps) {
  const [email, setEmail] = useState("");
<<<<<<< HEAD
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("technician");
  const [phone, setPhone] = useState("");
  const [cedula, setCedula] = useState("");
  const [cedulaType, setCedulaType] = useState("V");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estados para errores de validación
  const [errors, setErrors] = useState({
    fullName: "",
    email: "",
    password: "",
    cedula: "",
    phone: "",
  });

  // Validar Cédula (formato: V12345678 o E12345678)
  const validateCedula = (value: string, type: string) => {
    if (!value) return true; // Es opcional
    const cleanValue = value.replace(/\D/g, ""); // Solo números
    const cedulaNumber = cleanValue;
    if (cedulaNumber.length < 7 || cedulaNumber.length > 8) {
      return false;
    }
    return true;
  };

  // Formatear cédula (V + números)
  const handleCedulaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Remover letras no permitidas, solo números
    let numbers = value.replace(/[^\d]/g, "");
    // Limitar a 8 dígitos
    if (numbers.length > 8) numbers = numbers.slice(0, 8);
    const formatted = numbers ? `${cedulaType}${numbers}` : "";
    setCedula(formatted);
    if (numbers.length > 0 && (numbers.length < 7 || numbers.length > 8)) {
      setErrors(prev => ({ ...prev, cedula: "La cédula debe tener entre 7 y 8 dígitos" }));
    } else {
      setErrors(prev => ({ ...prev, cedula: "" }));
    }
  };

  const handleCedulaTypeChange = (type: string) => {
    setCedulaType(type);
    if (cedula) {
      const numbers = cedula.replace(/[^\d]/g, "");
      setCedula(numbers ? `${type}${numbers}` : "");
    }
  };

  // Validar email
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (value && !validateEmail(value)) {
      setErrors(prev => ({ ...prev, email: "Ingresa un correo electrónico válido (ej: usuario@empresa.com)" }));
    } else {
      setErrors(prev => ({ ...prev, email: "" }));
    }
  };

  // Validar contraseña
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (value && value.length < 6) {
      setErrors(prev => ({ ...prev, password: "La contraseña debe tener al menos 6 caracteres" }));
    } else {
      setErrors(prev => ({ ...prev, password: "" }));
    }
  };

  // Validar nombre
  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFullName(value);
    if (!value.trim()) {
      setErrors(prev => ({ ...prev, fullName: "El nombre completo es requerido" }));
    } else {
      setErrors(prev => ({ ...prev, fullName: "" }));
    }
  };

  // Formatear teléfono con +58
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Remover todo excepto números y +
    let numbers = value.replace(/[^\d+]/g, "");
    // Si no empieza con +58, agregarlo
    if (numbers && !numbers.startsWith("+58")) {
      if (numbers.startsWith("58")) {
        numbers = "+" + numbers;
      } else if (numbers.startsWith("0")) {
        numbers = "+58" + numbers.slice(1);
      } else {
        numbers = "+58" + numbers;
      }
    }
    // Limitar longitud
    if (numbers.length > 14) numbers = numbers.slice(0, 14);
    setPhone(numbers);
    if (numbers && (numbers.length < 11 || numbers.length > 14)) {
      setErrors(prev => ({ ...prev, phone: "El teléfono debe tener entre 10 y 13 dígitos después del +58" }));
    } else {
      setErrors(prev => ({ ...prev, phone: "" }));
    }
  };
=======
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("technician");
  const [isSubmitting, setIsSubmitting] = useState(false);
>>>>>>> 11069f104d1610e5c5ea848911ab81005acbe8e2

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
<<<<<<< HEAD
    // Validaciones
    if (!fullName.trim()) {
      toast.error("El nombre completo es requerido");
      return;
    }
=======
>>>>>>> 11069f104d1610e5c5ea848911ab81005acbe8e2
    if (!email.trim()) {
      toast.error("El correo electrónico es requerido");
      return;
    }
<<<<<<< HEAD
    if (!validateEmail(email)) {
      toast.error("Ingresa un correo electrónico válido");
      return;
    }
    if (!password.trim()) {
      toast.error("La contraseña es requerida");
      return;
    }
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    
    // Validar cédula si fue proporcionada
    if (cedula) {
      const cedulaNumber = cedula.replace(/[^\d]/g, "");
      if (cedulaNumber.length < 7 || cedulaNumber.length > 8) {
        toast.error("La cédula debe tener entre 7 y 8 dígitos");
        return;
      }
    }
    
    // Validar teléfono si fue proporcionado
    if (phone) {
      const phoneNumber = phone.replace(/[^\d]/g, "");
      if (phoneNumber.length < 10 || phoneNumber.length > 13) {
        toast.error("El teléfono debe tener entre 10 y 13 dígitos después del código de país");
        return;
      }
    }
=======
    if (!fullName.trim()) {
      toast.error("El nombre completo es requerido");
      return;
    }
>>>>>>> 11069f104d1610e5c5ea848911ab81005acbe8e2

    setIsSubmitting(true);

    try {
<<<<<<< HEAD
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role: role }
      });

      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          email: email,
          full_name: fullName,
          role: role,
          phone: phone || null,
          cedula: cedula || null,
=======
      // 1. Invitar al usuario (crea en auth.users)
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName, role: role }
      });

      if (inviteError) throw inviteError;

      // 2. Crear el perfil en la tabla profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: inviteData.user.id,
          email: email,
          full_name: fullName,
          role: role,
>>>>>>> 11069f104d1610e5c5ea848911ab81005acbe8e2
          is_active: true,
        });

      if (profileError) throw profileError;

<<<<<<< HEAD
      toast.success(`Usuario "${fullName}" creado correctamente`);
      // Resetear formulario
      setEmail("");
      setPassword("");
      setFullName("");
      setRole("technician");
      setPhone("");
      setCedula("");
      setCedulaType("V");
      setErrors({ fullName: "", email: "", password: "", cedula: "", phone: "" });
=======
      toast.success(`Usuario "${fullName}" invitado correctamente. Se ha enviado un correo para establecer su contraseña.`);
      setEmail("");
      setFullName("");
      setRole("technician");
>>>>>>> 11069f104d1610e5c5ea848911ab81005acbe8e2
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
<<<<<<< HEAD
      <DialogContent className="max-w-md bg-card border-border p-0 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header con gradiente AZUL */}
        <div className="relative p-5 bg-gradient-to-r from-blue-500/15 via-blue-500/5 to-transparent border-b border-border">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl" />
          <div className="flex items-center gap-3 relative">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-400/30">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                Nuevo Usuario
                <Sparkles className="h-3.5 w-3.5 text-blue-500" />
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Crea una nueva cuenta de usuario en el sistema
=======
      <DialogContent className="max-w-md bg-card border-border p-0 rounded-2xl overflow-hidden">
        <div className="p-5 bg-gradient-to-r from-emerald-500/10 to-transparent border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
              <UserPlus className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-foreground">
                Agregar Usuario
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Invita a un nuevo usuario a la plataforma
>>>>>>> 11069f104d1610e5c5ea848911ab81005acbe8e2
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
<<<<<<< HEAD
          {/* Nombre completo - REQUERIDO */}
          <div>
            <Label className="text-xs font-medium text-foreground flex items-center gap-1.5 mb-1.5">
              <User className="h-3 w-3 text-muted-foreground" />
              Nombre completo <span className="text-destructive">*</span>
            </Label>
            <Input
              value={fullName}
              onChange={handleFullNameChange}
              placeholder="Ej: Juan Pérez"
              className={`bg-muted/30 border-border focus:border-blue-500 focus:ring-blue-500/20 h-9 rounded-lg text-sm ${errors.fullName ? "border-red-500" : ""}`}
              required
            />
            {errors.fullName && <p className="text-[10px] text-red-500 mt-1">{errors.fullName}</p>}
          </div>

          {/* Cédula con selector V/E */}
          <div>
            <Label className="text-xs font-medium text-foreground flex items-center gap-1.5 mb-1.5">
              <CreditCard className="h-3 w-3 text-muted-foreground" />
              Cédula <span className="text-muted-foreground/60">(opcional)</span>
            </Label>
            <div className="flex gap-2">
              <Select value={cedulaType} onValueChange={handleCedulaTypeChange}>
                <SelectTrigger className="w-16 bg-muted/30 border-border h-9 rounded-lg text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="V">V</SelectItem>
                  <SelectItem value="E">E</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={cedula.replace(/[^\d]/g, "")}
                onChange={handleCedulaChange}
                placeholder="12345678"
                className={`bg-muted/30 border-border focus:border-blue-500 focus:ring-blue-500/20 h-9 rounded-lg text-sm flex-1 ${errors.cedula ? "border-red-500" : ""}`}
                inputMode="numeric"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Solo números (7-8 dígitos) • Ej: V12345678</p>
            {errors.cedula && <p className="text-[10px] text-red-500 mt-1">{errors.cedula}</p>}
          </div>

          {/* Correo electrónico - REQUERIDO */}
          <div>
            <Label className="text-xs font-medium text-foreground flex items-center gap-1.5 mb-1.5">
              <Mail className="h-3 w-3 text-muted-foreground" />
              Correo electrónico <span className="text-destructive">*</span>
=======
          <div>
            <Label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" />
              Correo Electrónico <span className="text-destructive">*</span>
>>>>>>> 11069f104d1610e5c5ea848911ab81005acbe8e2
            </Label>
            <Input
              type="email"
              value={email}
<<<<<<< HEAD
              onChange={handleEmailChange}
              placeholder="usuario@ejemplo.com"
              className={`bg-muted/30 border-border focus:border-blue-500 focus:ring-blue-500/20 h-9 rounded-lg text-sm ${errors.email ? "border-red-500" : ""}`}
              required
            />
            {errors.email && <p className="text-[10px] text-red-500 mt-1">{errors.email}</p>}
          </div>

          {/* Contraseña - REQUERIDO */}
          <div>
            <Label className="text-xs font-medium text-foreground flex items-center gap-1.5 mb-1.5">
              <Key className="h-3 w-3 text-muted-foreground" />
              Contraseña <span className="text-destructive">*</span>
            </Label>
            <Input
              type="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="Mínimo 6 caracteres"
              className={`bg-muted/30 border-border focus:border-blue-500 focus:ring-blue-500/20 h-9 rounded-lg text-sm ${errors.password ? "border-red-500" : ""}`}
              required
            />
            {errors.password && <p className="text-[10px] text-red-500 mt-1">{errors.password}</p>}
            <p className="text-[10px] text-muted-foreground mt-1">Mínimo 6 caracteres</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5 mb-1.5">
                <Shield className="h-3 w-3 text-muted-foreground" />
                Rol <span className="text-destructive">*</span>
              </Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="bg-muted/30 border-border h-9 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="technician">Técnico</SelectItem>
                  <SelectItem value="viewer">Solo Vista</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5 mb-1.5">
                <Phone className="h-3 w-3 text-muted-foreground" />
                Teléfono <span className="text-muted-foreground/60">(opcional)</span>
              </Label>
              <Input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="+58 412 1234567"
                className={`bg-muted/30 border-border focus:border-blue-500 focus:ring-blue-500/20 h-9 rounded-lg text-sm ${errors.phone ? "border-red-500" : ""}`}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Formato: +58 412 1234567</p>
              {errors.phone && <p className="text-[10px] text-red-500 mt-1">{errors.phone}</p>}
            </div>
          </div>

          <div className="mt-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-blue-500" />
              <p className="text-[10px] text-muted-foreground">
                {role === 'admin' && 'El usuario tendrá acceso total al sistema'}
                {role === 'manager' && 'El usuario podrá gestionar proyectos y equipos'}
                {role === 'technician' && 'El usuario podrá registrar horas y ver sus tareas'}
                {role === 'viewer' && 'El usuario solo podrá visualizar información'}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg h-9 px-4 text-sm border-border">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-lg h-9 px-4 gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm shadow-lg shadow-blue-400/30">
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isSubmitting ? "Creando..." : "Crear Usuario"}
=======
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@ejemplo.com"
              className="mt-1.5 bg-muted/30 border-border focus:border-emerald-500 h-10 rounded-lg"
              required
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-foreground flex items-center gap-2">
              <User className="h-3.5 w-3.5" />
              Nombre Completo <span className="text-destructive">*</span>
            </Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej: Juan Pérez"
              className="mt-1.5 bg-muted/30 border-border focus:border-emerald-500 h-10 rounded-lg"
              required
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Shield className="h-3.5 w-3.5" />
              Rol <span className="text-destructive">*</span>
            </Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="mt-1.5 bg-muted/30 border-border h-10 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="technician">Técnico</SelectItem>
                <SelectItem value="viewer">Solo Vista</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-lg gap-2 bg-emerald-600 hover:bg-emerald-700">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Enviando invitación..." : "Invitar Usuario"}
>>>>>>> 11069f104d1610e5c5ea848911ab81005acbe8e2
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}