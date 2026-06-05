import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2, Wrench, DollarSign, FolderKanban, Plus, Trash2, Tag,
  Code, BarChart3, Palette, Briefcase, Server, Landmark, ClipboardCheck, Search
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useServiceCategories, useCreateService, useUpdateService, type Service } from "@/hooks/useServices";
import { supabase } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const categoryIcons: Record<string, any> = {
  "Consulta": ClipboardCheck, "Evaluación": Search, "Mantenimiento": Wrench,
  "Desarrollo": Code, "Integración Bancaria": Landmark, "Análisis de Datos": BarChart3,
  "Infraestructura": Server, "Diseño": Palette, "Consultoría": Briefcase,
};

const serviceSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  category_id: z.string().min(1, "Por favor selecciona una categoría"),
  description: z.string().optional(),
  default_hourly_rate: z.number().min(0, "La tarifa no puede ser negativa"),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

interface ServiceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
}

export function ServiceFormModal({ open, onOpenChange, service }: ServiceFormModalProps) {
  const isEditing = !!service;
  const { data: categories = [], isLoading: loadingCategories, refetch: refetchCategories } = useServiceCategories();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const isSubmitting = createService.isPending || updateService.isPending;
  const queryClient = useQueryClient();

  const [categoryDialog, setCategoryDialog] = useState<{ open: boolean; mode: 'add' | 'delete' }>({ open: false, mode: 'add' });
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { name: "", category_id: "", description: "", default_hourly_rate: 0 },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: service?.name || "",
        category_id: service?.category_id || "",
        description: service?.description || "",
        default_hourly_rate: service?.default_hourly_rate || 0,
      });
    }
  }, [open, service, form]);

  const handleSubmit = async (data: ServiceFormData) => {
    try {
      if (isEditing && service) {
        await updateService.mutateAsync({
          id: service.id,
          data: { name: data.name, category_id: data.category_id, description: data.description || null, default_hourly_rate: data.default_hourly_rate },
        });
        toast.success("Servicio actualizado");
      } else {
        await createService.mutateAsync({
          name: data.name, category_id: data.category_id, description: data.description || undefined, default_hourly_rate: data.default_hourly_rate,
        });
        toast.success("Servicio creado");
      }
      onOpenChange(false);
    } catch (error: any) { toast.error(`Error: ${error.message}`); }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) { toast.error("El nombre es obligatorio"); return; }
    try {
      await supabase.from('service_categories').insert({ name: newCategoryName, description: newCategoryDesc });
      toast.success("Categoría creada");
      setCategoryDialog({ open: false, mode: 'add' });
      setNewCategoryName(""); setNewCategoryDesc("");
      refetchCategories();
      queryClient.invalidateQueries({ queryKey: ['service_categories'] });
    } catch (e: any) { toast.error(`Error: ${e.message}`); }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    try {
      await supabase.from('service_categories').delete().eq('id', categoryId);
      toast.success(`Categoría "${categoryName}" eliminada`);
      refetchCategories();
      queryClient.invalidateQueries({ queryKey: ['service_categories'] });
    } catch (e: any) { toast.error(`Error: ${e.message}`); }
  };

  const watchedName = form.watch("name");
  const watchedRate = form.watch("default_hourly_rate");

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border p-0 overflow-hidden">
          <div className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/20 ring-4 ring-primary/10">
                <Wrench className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">{isEditing ? "Editar Servicio" : "Nuevo Servicio"}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{isEditing ? "Modifica los datos del servicio" : "Agrega un nuevo servicio al catálogo"}</p>
              </div>
            </div>
          </div>
          <div className="p-6 pt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel className="text-sm font-medium">Nombre del Servicio *</FormLabel><FormControl><Input placeholder="Ej: Desarrollo de API Bancaria" className="h-10 text-sm bg-background border-border" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField control={form.control} name="category_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Categoría *</FormLabel>
                      <div className="flex gap-2">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="h-10 text-sm bg-background border-border flex-1"><FolderKanban className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue placeholder={loadingCategories ? "Cargando..." : "Seleccionar"} /></SelectTrigger></FormControl>
                          <SelectContent>
                            {categories.map((cat) => {
                              const Icon = categoryIcons[cat.name] || Tag;
                              return <SelectItem key={cat.id} value={cat.id}><span className="flex items-center gap-2"><Icon className="h-4 w-4" />{cat.name}</span></SelectItem>;
                            })}
                          </SelectContent>
                        </Select>
                        <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => { setCategoryDialog({ open: true, mode: 'add' }); setNewCategoryName(""); setNewCategoryDesc(""); }}><Plus className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent side="top"><p className="text-xs">Agregar categoría</p></TooltipContent></Tooltip></TooltipProvider>
                        <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-10 w-10 shrink-0 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30" onClick={() => setCategoryDialog({ open: true, mode: 'delete' })}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent side="top"><p className="text-xs">Eliminar categoría</p></TooltipContent></Tooltip></TooltipProvider>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="default_hourly_rate" render={({ field }) => (
                    <FormItem><FormLabel className="text-sm font-medium">Tarifa por Hora ($) *</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" min="0" step="0.01" placeholder="0.00" className="pl-10 h-10 text-sm bg-background border-border" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></div></FormControl><FormMessage /></FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel className="text-sm font-medium">Descripción</FormLabel><FormControl><Textarea placeholder="Describe el servicio, alcance, entregables..." className="resize-none bg-background border-border text-sm" rows={3} {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                {watchedName && (
                  <div className="rounded-xl bg-muted/30 p-4 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vista previa</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">{categories.find(c => c.id === form.watch("category_id"))?.name || "Sin categoría"}</Badge>
                      <span className="font-medium text-foreground">{watchedName}</span>
                      {watchedRate > 0 && <span className="text-sm font-semibold text-emerald-500 flex items-center gap-1 ml-auto"><DollarSign className="h-3.5 w-3.5" />{watchedRate.toFixed(2)}/hr</span>}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
                  <Button type="submit" disabled={isSubmitting} className="gap-2 shadow-sm">{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}{isEditing ? "Guardar Cambios" : "Crear Servicio"}</Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal GESTIONAR CATEGORÍAS */}
      <Dialog open={categoryDialog.open} onOpenChange={(o) => setCategoryDialog({ open: o, mode: 'add' })}>
        <DialogContent className="sm:max-w-md bg-card border-border p-0 overflow-hidden">
          <div className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/20 ring-4 ring-primary/10"><Tag className="h-6 w-6 text-primary" /></div>
              <div>
                <DialogTitle className="text-xl font-bold">{categoryDialog.mode === 'add' ? 'Agregar Categoría' : 'Eliminar Categoría'}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{categoryDialog.mode === 'add' ? 'Crea una nueva categoría' : 'Selecciona la categoría a eliminar'}</p>
              </div>
            </div>
          </div>
          <div className="p-6 pt-4">
            {categoryDialog.mode === 'add' ? (
              <div className="space-y-3">
                <div><Label className="text-xs">Nombre *</Label><Input placeholder="Nombre de la categoría" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="h-9 text-sm mt-1 bg-background" /></div>
                <div><Label className="text-xs">Descripción (opcional)</Label><Input placeholder="Descripción breve" value={newCategoryDesc} onChange={e => setNewCategoryDesc(e.target.value)} className="h-9 text-sm mt-1 bg-background" /></div>
                <Button onClick={handleAddCategory} size="sm" className="gap-1.5 w-full"><Plus className="h-4 w-4" /> Agregar Categoría</Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {categories.map((cat: any) => {
                  const Icon = categoryIcons[cat.name] || Tag;
                  return (
                    <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/10 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-2.5"><Icon className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">{cat.name}</span></div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-red-500/10 hover:text-red-500" onClick={() => handleDeleteCategory(cat.id, cat.name)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter className="p-4 pt-0"><Button variant="outline" onClick={() => setCategoryDialog({ open: false, mode: 'add' })} className="w-full">Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}