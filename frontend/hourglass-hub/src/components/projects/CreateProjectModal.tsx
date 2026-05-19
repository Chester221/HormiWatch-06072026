import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useCreateProject } from '@/hooks/useProjects';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { toast } from 'sonner';

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateProjectModal({ open, onOpenChange, onSuccess }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const createProject = useCreateProject();
  const { data: members = [] } = useTeamMembers();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    createProject.mutate(
      { name, description: description || null, status: 'In Progress', project_leader_id: leaderId || null },
      {
        onSuccess: () => {
          toast.success('Proyecto creado correctamente');
          setName('');
          setDescription('');
          setLeaderId('');
          onOpenChange(false);
          onSuccess();
        },
        onError: (error: any) => {
          toast.error(`Error: ${error.message}`);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Nuevo Proyecto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre del Proyecto *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Mi Proyecto" className="bg-background" required />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción del proyecto..." rows={3} className="bg-background" />
          </div>
          <div className="space-y-2">
            <Label>Líder de Proyecto</Label>
            <Select value={leaderId} onValueChange={setLeaderId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Selecciona un líder" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? 'Creando...' : 'Crear Proyecto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}