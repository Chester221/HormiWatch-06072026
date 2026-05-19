import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface TaskEditModalProps {
  task: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (updatedData: any) => void; // CAMBIADO: ahora recibe los datos
}

export function TaskEditModal({ task, open, onOpenChange, onSuccess }: TaskEditModalProps) {
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Pending');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (task) {
      setDescription(task.description || '');
      setStatus(task.status || 'Pending');
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    
    setIsSubmitting(true);
    
    // Solo enviamos campos que existen en la tabla tasks
    const updatedData = { 
      description, 
      status,
      updated_at: new Date().toISOString()
    };
    
    // Llamamos a onSuccess con los datos, el padre se encarga de la mutación
    onSuccess(updatedData);
    onOpenChange(false);
    setIsSubmitting(false);
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Editar Tarea</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción de la tarea"
              rows={3}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={status} onValueChange={setStatus} disabled={task?.status === 'Completed'}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pendiente</SelectItem>
                <SelectItem value="In_Progress">En Progreso</SelectItem>
                <SelectItem value="Completed">Completada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}