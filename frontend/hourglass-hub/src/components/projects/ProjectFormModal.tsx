import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CalendarIcon, X, Check, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

// Hooks de Supabase
import { useClients, useClientContacts } from "@/hooks/useClientes";
import { useTechnicians, useAllUsers } from "@/hooks/useTeamMembers";


// Validation schema
const projectFormSchema = z.object({
  name: z.string()
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(100, "El nombre debe tener menos de 100 caracteres"),
  rate: z.number()
    .min(1, "La tarifa debe ser al menos $1")
    .max(10000, "La tarifa no puede exceder $10,000"),
  hoursPool: z.number()
    .min(1, "El pool debe ser al menos 1 hora")
    .max(10000, "El pool no puede exceder 10,000 horas"),
  endDate: z.date({
    required_error: "La fecha de fin es requerida",
  }),
  clientId: z.string().min(1, "Por favor selecciona un cliente"),
  clientContactId: z.string().optional(),
  leaderId: z.string().min(1, "Por favor selecciona un líder"),
  technicianIds: z.array(z.string()).min(0),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface Project {
  id: string;
  name: string;
  client: string;
  clientId?: string;
  status: "active" | "completed" | "on-hold" | "planning" | "In Progress" | "Not Started" | "Cancelled";
  progress: number;
  hoursConsumed: number;
  hoursPool: number;
  endDate: string;
  startDate?: string;
  rate?: number;
  teamLead: { name: string; avatar: string; id?: string };
  team: { name: string; avatar: string; id?: string }[];
}

interface ProjectFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  onSubmit?: (data: ProjectFormValues) => void;
}

export function ProjectFormModal({ open, onOpenChange, project, onSubmit }: ProjectFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [leaderSearch, setLeaderSearch] = useState("");
  const [techSearch, setTechSearch] = useState("");
  const isEditing = !!project;

  // Datos desde Supabase
  const { data: clients = [], isLoading: loadingClients } = useClients(clientSearch);
  const { data: allUsers = [], isLoading: loadingUsers } = useAllUsers(leaderSearch);
  const { data: technicians = [], isLoading: loadingTechnicians } = useTechnicians(techSearch);

  // Obtener el cliente seleccionado para cargar sus contactos
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>();
  const { data: clientContacts = [] } = useClientContacts(selectedClientId);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      rate: 85,
      hoursPool: 100,
      endDate: undefined,
      clientId: "",
      clientContactId: "",
      leaderId: "",
      technicianIds: [],
    },
  });

  // Reset form when project changes or modal opens
  useEffect(() => {
    if (open) {
      if (project) {
        form.reset({
          name: project.name,
          rate: project.rate || 85,
          hoursPool: project.hoursPool,
          endDate: new Date(project.endDate),
          clientId: project.clientId || "",
          clientContactId: "",
          leaderId: project.teamLead.id || "",
          technicianIds: project.team.map(t => t.id).filter(Boolean) as string[],
        });
        setSelectedTechnicians(project.team.map(t => t.id).filter(Boolean) as string[]);
        setSelectedClientId(project.clientId);
      } else {
        form.reset({
          name: "",
          rate: 85,
          hoursPool: 100,
          endDate: undefined,
          clientId: "",
          clientContactId: "",
          leaderId: "",
          technicianIds: [],
        });
        setSelectedTechnicians([]);
        setSelectedClientId(undefined);
      }
    }
  }, [open, project, form]);

  const handleSubmit = async (data: ProjectFormValues) => {
    setIsSubmitting(true);

    try {
      const projectData = {
        name: data.name,
        hourly_rate: data.rate,
        pool_hours: data.hoursPool,
        start_date: new Date().toISOString().split('T')[0],
        end_date: data.endDate.toISOString().split('T')[0],
        client_id: data.clientId,
        status: 'In Progress',
      };

      let projectId: string = project?.id || '';

      if (isEditing && project) {
        const { error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', project.id);

        if (error) throw error;
        projectId = project.id;

        // ✅ Eliminar miembros anteriores
        await supabase.from('project_members').delete().eq('project_id', projectId);

      } else {
        const { data: newProject, error } = await supabase
          .from('projects')
          .insert(projectData)
          .select()
          .single();

        if (error) throw error;
        projectId = newProject.id;
      }

      // ✅ Guardar líder en project_members
      if (data.leaderId && projectId) {
        await supabase.from('project_members').insert({
          project_id: projectId,
          user_id: data.leaderId,
          role_in_project: 'leader',
        });
      }

      // ✅ Guardar técnicos en project_members
      if (data.technicianIds.length > 0 && projectId) {
        const memberInserts = data.technicianIds.map(techId => ({
          project_id: projectId,
          user_id: techId,
          role_in_project: 'member',
        }));
        await supabase.from('project_members').insert(memberInserts);
      }

      toast.success(isEditing ? "Proyecto actualizado" : "Proyecto creado");

      if (onSubmit) onSubmit(data);
      onOpenChange(false);
      
    } catch (error: any) {
      console.error('Error al guardar proyecto:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTechnician = (techId: string) => {
    const newSelection = selectedTechnicians.includes(techId)
      ? selectedTechnicians.filter(id => id !== techId)
      : [...selectedTechnicians, techId];

    setSelectedTechnicians(newSelection);
    form.setValue("technicianIds", newSelection);
  };

  // Filtrar técnicos disponibles (excluyendo al líder seleccionado)
  const availableTechnicians = technicians.filter(
    m => m.id !== form.watch("leaderId")
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            {isEditing ? "Editar Proyecto" : "Crear Nuevo Proyecto"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Project Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Nombre del Proyecto</FormLabel>
                  <FormControl>
                    <Input placeholder="Ingrese el nombre del proyecto" className="bg-muted/50 border-border focus:border-primary" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Rate and Hours Pool */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Tarifa por Hora ($)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={10000} placeholder="85" className="bg-muted/50 border-border focus:border-primary" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hoursPool"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Pool de Horas</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={10000} placeholder="100" className="bg-muted/50 border-border focus:border-primary" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* End Date */}
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-foreground">Fecha de Fin</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className={cn("w-full pl-3 text-left font-normal bg-muted/50 border-border hover:bg-muted", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "PPP") : <span>Seleccionar fecha</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Client Selection with Search */}
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Cliente</FormLabel>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Buscar por nombre o email..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} className="pl-9 bg-muted/50 border-border" />
                    </div>
                    <Select onValueChange={(value) => { field.onChange(value); setSelectedClientId(value); form.setValue("clientContactId", ""); }} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/50 border-border">
                          <SelectValue placeholder={loadingClients ? "Cargando..." : "Seleccionar cliente"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card border-border max-h-[200px]">
                        {clients.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">{loadingClients ? "Cargando..." : "No se encontraron clientes"}</div>
                        ) : (
                          clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              <div className="flex flex-col"><span>{client.name}</span>{client.ruc && <span className="text-xs text-muted-foreground">RIF: {client.ruc}</span>}</div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Client Contact */}
            {selectedClientId && (
              <FormField
                control={form.control}
                name="clientContactId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Contacto del Cliente</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/50 border-border"><SelectValue placeholder="Seleccionar contacto (opcional)" /></SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card border-border">
                        {clientContacts.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">No hay contactos registrados</div>
                        ) : (
                          clientContacts.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              <div className="flex flex-col"><span>{contact.name}</span><span className="text-xs text-muted-foreground">{contact.position} {contact.email && `• ${contact.email}`}</span></div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Project Leader with Search */}
            <FormField
              control={form.control}
              name="leaderId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Líder del Proyecto</FormLabel>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Buscar por nombre o email..." value={leaderSearch} onChange={(e) => setLeaderSearch(e.target.value)} className="pl-9 bg-muted/50 border-border" />
                    </div>
                    <Select onValueChange={(value) => { field.onChange(value); if (selectedTechnicians.includes(value)) { const ns = selectedTechnicians.filter(id => id !== value); setSelectedTechnicians(ns); form.setValue("technicianIds", ns); } }} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/50 border-border"><SelectValue placeholder={loadingUsers ? "Cargando..." : "Seleccionar líder"} /></SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card border-border max-h-[200px]">
                        {allUsers.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">{loadingUsers ? "Cargando..." : "No se encontraron usuarios"}</div>
                        ) : (
                          allUsers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6"><AvatarImage src={member.avatar_url || undefined} /><AvatarFallback className="text-xs bg-primary text-primary-foreground">{(member.full_name || member.email || "U")[0].toUpperCase()}</AvatarFallback></Avatar>
                                <div className="flex flex-col"><span>{member.full_name || "Sin nombre"}</span><span className="text-xs text-muted-foreground">{member.email}</span></div>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Technician Multi-Select with Search */}
            <FormField
              control={form.control}
              name="technicianIds"
              render={() => (
                <FormItem>
                  <FormLabel className="text-foreground">Asignar Técnicos</FormLabel>
                  <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Buscar técnicos por nombre o email..." value={techSearch} onChange={(e) => setTechSearch(e.target.value)} className="pl-9 bg-card border-border" />
                    </div>
                    {selectedTechnicians.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedTechnicians.map((techId) => {
                          const tech = technicians.find(m => m.id === techId);
                          if (!tech) return null;
                          return (
                            <Badge key={techId} variant="secondary" className="flex items-center gap-1 pl-1 pr-2 py-1">
                              <Avatar className="h-5 w-5"><AvatarImage src={tech.avatar_url || undefined} /><AvatarFallback className="text-[10px]">{(tech.full_name || tech.email || "T")[0].toUpperCase()}</AvatarFallback></Avatar>
                              <span className="text-xs">{tech.full_name || tech.email}</span>
                              <button type="button" onClick={() => toggleTechnician(techId)} className="ml-1 rounded-full hover:bg-muted p-0.5"><X className="h-3 w-3" /></button>
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                    {loadingTechnicians ? (
                      <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                    ) : availableTechnicians.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-4">No hay técnicos disponibles</div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                        {availableTechnicians.map((member) => {
                          const isSelected = selectedTechnicians.includes(member.id);
                          return (
                            <button key={member.id} type="button" onClick={() => toggleTechnician(member.id)} className={cn("flex items-center gap-3 p-3 rounded-lg border transition-all text-left", isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30 hover:bg-muted")}>
                              <Avatar className="h-8 w-8"><AvatarImage src={member.avatar_url || undefined} /><AvatarFallback className="bg-secondary text-secondary-foreground text-xs">{(member.full_name || member.email || "T")[0].toUpperCase()}</AvatarFallback></Avatar>
                              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">{member.full_name || "Sin nombre"}</p><p className="text-xs text-muted-foreground truncate">{member.email}</p></div>
                              {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditing ? "Guardar Cambios" : "Crear Proyecto"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}