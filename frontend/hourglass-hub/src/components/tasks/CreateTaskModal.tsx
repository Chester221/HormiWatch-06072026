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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateTask } from '@/hooks/useTasks';
import { toast } from 'sonner';

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: any[];
  services: any[];
  onSuccess: () => void;
}

export function CreateTaskModal({ open, onOpenChange, projects, services, onSuccess }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [status, setStatus] = useState('pending');
  const [priority, setPriority] = useState('medium');

  const createTask = useCreateTask();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('El título es requerido');
      return;
    }

    const startDateTime = new Date(`${date}T${startTime}:00`).toISOString();
    const endDateTime = new Date(`${date}T${endTime}:00`).toISOString();

    createTask.mutate({
      title,
      description,
      project_id: projectId || null,
      service_id: serviceId || null,
      start_time: startDateTime,
      end_time: endDateTime,
      status,
      priority,
    }, {
      onSuccess: () => {
        toast.success('Tarea creada correctamente');
        setTitle('');
        setDescription('');
        setProjectId('');
        setServiceId('');
        onOpenChange(false);
        onSuccess();
      },
      onError: (error: any) => {
        toast.error(`Error: ${error.message}`);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Crear Nueva Tarea</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título de la tarea"
              className="bg-background"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Proyecto</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Seleccionar proyecto" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Servicio</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Seleccionar servicio" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="in_progress">En Progreso</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hora Inicio</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label>Hora Fin</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="bg-background" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción de la tarea..."
              rows={3}
              className="bg-background"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending ? 'Creando...' : 'Crear Tarea'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}