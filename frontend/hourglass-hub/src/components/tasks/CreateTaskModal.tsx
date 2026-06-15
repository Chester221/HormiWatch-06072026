import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2, Sparkles, Clock, Briefcase, Wrench, FileText, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const taskSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  projectId: z.string().min(1, "Selecciona un proyecto"),
  serviceId: z.string().min(1, "Selecciona un servicio"),
  date: z.date({ required_error: "Selecciona una fecha" }),
  status: z.enum(["Pending", "In Progress", "Completed"]),
  startTime: z.string().min(1, "Selecciona hora de inicio"),
  endTime: z.string().min(1, "Selecciona hora de fin"),
  description: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: any[];
  services: any[];
  onSuccess: (data: any) => void;
}

// Horas en formato 12h con AM/PM
const timeSlots = [
  "12:00 AM", "12:30 AM", "01:00 AM", "01:30 AM", "02:00 AM", "02:30 AM", "03:00 AM", "03:30 AM",
  "04:00 AM", "04:30 AM", "05:00 AM", "05:30 AM", "06:00 AM", "06:30 AM", "07:00 AM", "07:30 AM",
  "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
  "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM", "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM",
  "08:00 PM", "08:30 PM", "09:00 PM", "09:30 PM", "10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM"
];

// Función para convertir formato 12h a 24h para guardar en BD
const convertTo24Hour = (time12h: string): string => {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  
  let hours24 = parseInt(hours);
  if (modifier === 'PM' && hours24 !== 12) {
    hours24 += 12;
  }
  if (modifier === 'AM' && hours24 === 12) {
    hours24 = 0;
  }
  
  return `${hours24.toString().padStart(2, '0')}:${minutes}`;
};

// Función para obtener el icono según la hora
const getTimeIcon = (time: string) => {
  const hour = parseInt(time.split(':')[0]);
  const isPM = time.includes('PM');
  
  if ((isPM && hour !== 12) || hour >= 12 && !isPM) {
    return <Moon className="h-3 w-3" />;
  }
  return <Sun className="h-3 w-3" />;
};

export function CreateTaskModal({ open, onOpenChange, projects, services, onSuccess }: CreateTaskModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      projectId: "",
      serviceId: "",
      date: new Date(),
      status: "Pending",
      startTime: "09:00 AM",
      endTime: "05:00 PM",
      description: "",
    },
  });

  const handleSubmit = async (data: TaskFormValues) => {
    setIsSubmitting(true);
    try {
      // Convertir horas a formato 24h antes de enviar
      const submitData = {
        ...data,
        startTime: convertTo24Hour(data.startTime),
        endTime: convertTo24Hour(data.endTime),
      };
      await onSuccess(submitData);
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedStartTime = form.watch("startTime");
  const selectedEndTime = form.watch("endTime");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border p-0 rounded-2xl overflow-hidden">
        {/* Header con gradiente */}
        <div className="p-6 pb-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-bold text-foreground">
              Crear Nueva Tarea
            </DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground ml-12">
            Completa los detalles para registrar una nueva tarea
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="p-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Título */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel className="text-foreground flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      Título de la tarea
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ej: Implementar autenticación, Corregir bug en login..." 
                        className="bg-muted/50 border-border focus:border-primary transition-colors"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Proyecto */}
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground flex items-center gap-2">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                      Proyecto
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/50 border-border">
                          <SelectValue placeholder="Seleccionar proyecto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card border-border max-h-[200px]">
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Servicio */}
              <FormField
                control={form.control}
                name="serviceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground flex items-center gap-2">
                      <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                      Servicio
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/50 border-border">
                          <SelectValue placeholder="Seleccionar servicio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card border-border max-h-[200px]">
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name} (${service.default_hourly_rate}/h)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Fecha */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground flex items-center gap-2">
                      <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      Fecha
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal bg-muted/50 border-border",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
                            ) : (
                              <span>Seleccionar fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Estado */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      Estado
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/50 border-border">
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="Pending">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            Pendiente
                          </span>
                        </SelectItem>
                        <SelectItem value="In Progress">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                            En progreso
                          </span>
                        </SelectItem>
                        <SelectItem value="Completed">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Completada
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hora Inicio con AM/PM */}
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground flex items-center gap-2">
                      {getTimeIcon(field.value)}
                      Hora Inicio
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/50 border-border">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card border-border max-h-[250px]">
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            <span className="flex items-center gap-2">
                              {getTimeIcon(time)}
                              {time}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hora Fin con AM/PM */}
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground flex items-center gap-2">
                      {getTimeIcon(field.value)}
                      Hora Fin
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/50 border-border">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card border-border max-h-[250px]">
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            <span className="flex items-center gap-2">
                              {getTimeIcon(time)}
                              {time}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Descripción */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel className="text-foreground">Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe los detalles de la tarea..."
                        className="bg-muted/50 border-border min-h-[100px] resize-none focus:border-primary transition-colors"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="mt-6 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="hover:bg-muted"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? "Creando..." : "Crear Tarea"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}