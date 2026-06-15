import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TaskEditModalProps {
  task: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (updatedData: any) => void;
}

export function TaskEditModal({ task, open, onOpenChange, onSuccess }: TaskEditModalProps) {
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Pending");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (task) {
      setDescription(task.description || "");
      setStatus(task.status || "Pending");
      setNotes(task.notes || "");
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    
    setIsSubmitting(true);
    
    try {
      const updatedData = { description, status, notes };
      await onSuccess(updatedData);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Editar Tarea</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Descripción</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="bg-background"
            />
          </div>
          <div>
            <Label>Estado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pendiente</SelectItem>
                <SelectItem value="In Progress">En Progreso</SelectItem>
                <SelectItem value="Completed">Completada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Observaciones</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="bg-background"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
