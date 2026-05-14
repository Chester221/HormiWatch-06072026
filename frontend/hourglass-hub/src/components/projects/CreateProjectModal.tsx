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
import { Textarea } from '@/components/ui/textarea';
import { useCreateProject } from '@/hooks/useProjects';
import { toast } from 'sonner';

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateProjectModal({ open, onOpenChange, onSuccess }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createProject = useCreateProject();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    createProject.mutate(
      { name, description: description || null, status: 'active' },
      {
        onSuccess: () => {
          toast.success('Proyecto creado correctamente');
          setName('');
          setDescription('');
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
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Mi Proyecto"
              className="bg-background"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción del proyecto..."
              rows={3}
              className="bg-background"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? 'Creando...' : 'Crear Proyecto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}