// frontend/hourglass-hub/src/components/team/AddUserModal.tsx

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
import { Loader2, UserPlus, Mail, Shield, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddUserModal({ open, onOpenChange, onSuccess }: AddUserModalProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("technician");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("El correo electrónico es requerido");
      return;
    }
    if (!fullName.trim()) {
      toast.error("El nombre completo es requerido");
      return;
    }

    setIsSubmitting(true);

    try {
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
          is_active: true,
        });

      if (profileError) throw profileError;

      toast.success(`Usuario "${fullName}" invitado correctamente. Se ha enviado un correo para establecer su contraseña.`);
      setEmail("");
      setFullName("");
      setRole("technician");
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
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <Label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" />
              Correo Electrónico <span className="text-destructive">*</span>
            </Label>
            <Input
              type="email"
              value={email}
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
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}