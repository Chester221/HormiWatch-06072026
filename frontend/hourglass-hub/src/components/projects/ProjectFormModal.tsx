import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, X, Check, Loader2, Search, FolderKanban, User, Crown, Users, Clock, DollarSign, Hash, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

const HORMI_BLUE = '#0DA2E7';

import { useClients, useClientContacts } from "@/hooks/useClientes";
import { useTechnicians, useAllUsers } from "@/hooks/useTeamMembers";

const projectFormSchema = z.object({
  name: z.string().trim().min(3, "Mínimo 3 caracteres").max(100),
  rate: z.number().min(1, "Mínimo $1").max(10000),
  hoursPool: z.number().min(1, "Mínimo 1 hora").max(10000),
  endDate: z.date({ required_error: "Selecciona una fecha" }),
  clientId: z.string().min(1, "Selecciona un cliente"),
  clientContactId: z.string().optional(),
  leaderId: z.string().min(1, "Selecciona un líder"),
  technicianIds: z.array(z.string()).min(0),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface Project {
  id: string; name: string; client: string; clientId?: string;
  status: string; progress: number; hoursConsumed: number; hoursPool: number;
  endDate: string; startDate?: string; rate?: number;
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

  const { data: clients = [] } = useClients(clientSearch);
  const { data: allUsers = [] } = useAllUsers(leaderSearch);
  const managers = allUsers.filter((u: any) => u.role === 'Manager');
  const { data: technicians = [] } = useTechnicians(techSearch);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>();
  const { data: clientContacts = [] } = useClientContacts(selectedClientId);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: { name: "", rate: 85, hoursPool: 100, endDate: undefined, clientId: "", clientContactId: "", leaderId: "", technicianIds: [] },
  });

  useEffect(() => {
    if (open) {
      if (project) {
        form.reset({
          name: project.name, rate: project.rate || 85, hoursPool: project.hoursPool,
          endDate: new Date(project.endDate), clientId: project.clientId || "",
          clientContactId: "", leaderId: project.teamLead.id || "",
          technicianIds: project.team.map(t => t.id).filter(Boolean) as string[],
        });
        setSelectedTechnicians(project.team.map(t => t.id).filter(Boolean) as string[]);
        setSelectedClientId(project.clientId);
      } else {
        form.reset({ name: "", rate: 85, hoursPool: 100, endDate: undefined, clientId: "", clientContactId: "", leaderId: "", technicianIds: [] });
        setSelectedTechnicians([]);
        setSelectedClientId(undefined);
      }
    }
  }, [open, project, form]);

  const handleSubmit = async (data: ProjectFormValues) => {
    setIsSubmitting(true);
    try {
      const projectData = {
        name: data.name, hourly_rate: data.rate, pool_hours: data.hoursPool,
        start_date: new Date().toISOString().split('T')[0],
        end_date: data.endDate.toISOString().split('T')[0],
        client_id: data.clientId, status: 'In Progress',
      };
      let projectId = project?.id || '';

      if (isEditing && project) {
        await supabase.from('projects').update(projectData).eq('id', project.id);
        projectId = project.id;
        await supabase.from('project_members').delete().eq('project_id', projectId);
      } else {
        const { data: newProject, error } = await supabase.from('projects').insert(projectData).select().single();
        if (error) throw error;
        projectId = newProject.id;
      }

      if (data.leaderId && projectId) {
        await supabase.from('project_members').insert({ project_id: projectId, user_id: data.leaderId, role_in_project: 'leader' });
      }
      if (data.technicianIds.length > 0 && projectId) {
        await supabase.from('project_members').insert(data.technicianIds.map(techId => ({ project_id: projectId, user_id: techId, role_in_project: 'member' })));
      }

      toast.success(isEditing ? "Proyecto actualizado" : "Proyecto creado");
      if (onSubmit) onSubmit(data);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTechnician = (techId: string) => {
    const ns = selectedTechnicians.includes(techId) ? selectedTechnicians.filter(id => id !== techId) : [...selectedTechnicians, techId];
    setSelectedTechnicians(ns);
    form.setValue("technicianIds", ns);
  };

  const availableTechnicians = technicians.filter(m => m.id !== form.watch("leaderId"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-card border-border p-0 rounded-2xl overflow-hidden shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="relative p-5 bg-gradient-to-r from-[#0DA2E7]/15 via-[#0DA2E7]/5 to-transparent border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0DA2E7] to-[#0B8BC7] shadow-lg">
              {isEditing ? <Pencil className="h-5 w-5 text-white" /> : <FolderKanban className="h-5 w-5 text-white" />}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-foreground">
                {isEditing ? "Editar Proyecto" : "Nuevo Proyecto"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {isEditing ? (
                  <span>Editando: <strong className="text-foreground">{project?.name}</strong></span>
                ) : (
                  "Crea un nuevo proyecto"
                )}
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="p-5 space-y-4">
          {/* Nombre */}
          <div>
            <Label className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
              <Hash className="h-3.5 w-3.5 text-muted-foreground" /> Nombre *
            </Label>
            <Input 
              placeholder="Nombre del proyecto" 
              {...form.register("name")} 
              className="bg-muted/30 border-border h-10 rounded-lg text-sm"
              autoFocus={!isEditing}
            />
            {form.formState.errors.name && <p className="text-[10px] text-red-500 mt-1">{form.formState.errors.name.message}</p>}
          </div>

          {/* Tarifa + Pool */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" /> Tarifa/hora *
              </Label>
              <Input type="number" placeholder="85" {...form.register("rate", { valueAsNumber: true })} className="bg-muted/30 border-border h-10 rounded-lg text-sm" />
            </div>
            <div>
              <Label className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Pool horas *
              </Label>
              <Input type="number" placeholder="100" {...form.register("hoursPool", { valueAsNumber: true })} className="bg-muted/30 border-border h-10 rounded-lg text-sm" />
            </div>
          </div>

          {/* Fecha fin */}
          <div>
            <Label className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" /> Fecha de Fin *
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full h-10 pl-3 text-left font-normal bg-muted/30 border-border rounded-lg text-sm", !form.watch("endDate") && "text-muted-foreground")}>
                  {form.watch("endDate") ? format(form.watch("endDate"), "PPP") : "Seleccionar fecha"}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                <Calendar mode="single" selected={form.watch("endDate")} onSelect={(d) => form.setValue("endDate", d as Date)} disabled={(date) => date < new Date()} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          {/* Cliente */}
          <div>
            <Label className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" /> Cliente *
            </Label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Buscar cliente..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} className="pl-9 bg-muted/30 border-border h-10 rounded-lg text-sm" />
            </div>
            <Select value={form.watch("clientId")} onValueChange={(v) => { form.setValue("clientId", v); setSelectedClientId(v); form.setValue("clientContactId", ""); }}>
              <SelectTrigger className="bg-muted/30 border-border h-10 rounded-lg text-sm"><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      {c.logo_url ? (
                        <img src={c.logo_url} alt={c.name} className="h-5 w-5 rounded object-cover" />
                      ) : (
                        <div className="h-5 w-5 rounded bg-muted flex items-center justify-center">
                          <User className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                      <span>{c.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contacto del Cliente */}
          {selectedClientId && clientContacts.length > 0 && (
            <div>
              <Label className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" /> Contacto del Cliente
              </Label>
              <Select value={form.watch("clientContactId")} onValueChange={(v) => form.setValue("clientContactId", v)}>
                <SelectTrigger className="bg-muted/30 border-border h-10 rounded-lg text-sm"><SelectValue placeholder="Seleccionar contacto (opcional)" /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {clientContacts.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name} - {c.position}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Líder */}
          <div>
            <Label className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
              <Crown className="h-3.5 w-3.5 text-muted-foreground" /> Líder *
            </Label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Buscar líder..." value={leaderSearch} onChange={e => setLeaderSearch(e.target.value)} className="pl-9 bg-muted/30 border-border h-10 rounded-lg text-sm" />
            </div>
            <Select value={form.watch("leaderId")} onValueChange={(v) => { form.setValue("leaderId", v); if (selectedTechnicians.includes(v)) toggleTechnician(v); }}>
              <SelectTrigger className="bg-muted/30 border-border h-10 rounded-lg text-sm"><SelectValue placeholder="Seleccionar líder" /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                {managers.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5"><AvatarImage src={m.avatar_url} /><AvatarFallback className="text-[9px]">{(m.full_name || "U")[0]}</AvatarFallback></Avatar>
                      {m.full_name || m.email}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {managers.length === 0 && (
              <p className="text-[10px] text-amber-500 mt-1">No hay managers disponibles. Contacta al administrador.</p>
            )}
          </div>

          {/* Técnicos */}
          <div>
            <Label className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" /> Técnicos
            </Label>
            <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Buscar técnicos..." value={techSearch} onChange={e => setTechSearch(e.target.value)} className="pl-9 bg-card border-border h-9 rounded-lg text-sm" />
              </div>
              
              {selectedTechnicians.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedTechnicians.map(tid => {
                    const tech = technicians.find(m => m.id === tid);
                    if (!tech) return null;
                    return (
                      <Badge key={tid} variant="secondary" className="gap-1 pl-1 pr-2 py-1 text-xs">
                        <Avatar className="h-5 w-5"><AvatarImage src={tech.avatar_url} /><AvatarFallback className="text-[9px]">{(tech.full_name || "T")[0]}</AvatarFallback></Avatar>
                        {tech.full_name}
                        <button type="button" onClick={() => toggleTechnician(tid)} className="ml-1 hover:text-red-500"><X className="h-3 w-3" /></button>
                      </Badge>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto">
                {availableTechnicians.length === 0 ? (
                  <p className="text-xs text-muted-foreground col-span-2 text-center py-2">No hay técnicos disponibles</p>
                ) : (
                  availableTechnicians.map(m => {
                    const isSel = selectedTechnicians.includes(m.id);
                    return (
                      <button key={m.id} type="button" onClick={() => toggleTechnician(m.id)}
                        className={cn("flex items-center gap-2 p-2 rounded-lg text-left transition-all text-sm",
                          isSel ? "bg-[#0DA2E7]/10 border border-[#0DA2E7]/30" : "bg-card border border-border/50 hover:border-[#0DA2E7]/20")}
                      >
                        <Avatar className="h-7 w-7"><AvatarImage src={m.avatar_url} /><AvatarFallback className="text-[9px]">{(m.full_name || "T")[0]}</AvatarFallback></Avatar>
                        <span className="flex-1 truncate text-xs">{m.full_name || m.email}</span>
                        {isSel && <Check className="h-3.5 w-3.5 text-[#0DA2E7] shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg h-10 px-4 text-sm border-border flex-1">Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-lg h-10 px-4 gap-2 text-white text-sm flex-1" style={{ backgroundColor: HORMI_BLUE }}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? <Pencil className="h-4 w-4" /> : <FolderKanban className="h-4 w-4" />}
              {isSubmitting ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear Proyecto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}