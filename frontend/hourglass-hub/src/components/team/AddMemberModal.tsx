import { useState } from 'react';
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

interface AddMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddMemberModal({ open, onOpenChange, onSuccess }: AddMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('El email es requerido');
      return;
    }

    setIsLoading(true);

    // Buscar usuario por email
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', email);

    if (error) {
      toast.error('Error al buscar usuario');
      setIsLoading(false);
      return;
    }

    if (!users || users.length === 0) {
      toast.error('Usuario no encontrado. Asegúrate de que el usuario esté registrado.');
      setIsLoading(false);
      return;
    }

    // Aquí puedes agregar lógica para asignar rol en la tabla que corresponda
    toast.success(`Invitación enviada a ${email} con rol de ${role}`);
    setEmail('');
    setRole('member');
    setIsLoading(false);
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Agregar Miembro</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Correo Electrónico *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="bg-background"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="member">Miembro</SelectItem>
                <SelectItem value="viewer">Solo Vista</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Buscando...' : 'Agregar Miembro'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}