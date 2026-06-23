import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload, User, Pencil, Briefcase, Wrench, Mail, Phone, CreditCard } from "lucide-react";

const HORMI_BLUE = '#0DA2E7';

const memberSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().min(1, "El email es obligatorio").refine(val => val.includes('@'), {
    message: "Debe contener @ para ser válido",
  }),
  phone: z.string().optional(),
  cedula: z.string().optional(),
  role: z.enum(["Technician", "Manager"], {
    required_error: "Selecciona un rol",
  }),
});

type MemberFormData = z.infer<typeof memberSchema>;

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  cedula: string;
  role: "Technician" | "Manager";
  avatar?: string;
  isSuspended: boolean;
}

interface TeamMemberFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: TeamMember | null;
  onSubmit: (data: Omit<TeamMember, "id" | "isSuspended"> & { id?: string }) => void;
}

export function TeamMemberFormModal({ open, onOpenChange, member, onSubmit }: TeamMemberFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(member?.avatar);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phone, setPhone] = useState("+58 ");
  const [cedulaType, setCedulaType] = useState<"V" | "E">("V");
  const [cedulaNum, setCedulaNum] = useState("");

  const form = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: { name: "", email: "", phone: "", cedula: "", role: undefined },
  });

  useEffect(() => {
    if (open && member) {
      form.reset({
        name: member.name || (member as any).full_name || "",
        email: member.email || "",
        phone: "",
        cedula: "",
        role: member.role || undefined,
      });
      setAvatarPreview(member.avatar);
      
      if (member.phone) {
        setPhone(member.phone.startsWith("+58") ? member.phone : "+58 " + member.phone);
      } else {
        setPhone("+58 ");
      }
      
      if (member.cedula) {
        const match = member.cedula.match(/^([VE])-?(\d+)$/);
        if (match) {
          setCedulaType(match[1] as "V" | "E");
          setCedulaNum(match[2]);
        } else {
          setCedulaNum(member.cedula.replace(/[^\d]/g, ""));
        }
      } else {
        setCedulaType("V");
        setCedulaNum("");
      }
    }
  }, [open, member, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { toast.error("La imagen debe ser menor a 5MB"); return; }
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    val = val.replace(/[^\d+]/g, "");
    if (!val.startsWith("+58")) {
      const digits = val.replace(/\D/g, "");
      val = "+58" + digits;
    }
    const digits = val.slice(3).replace(/\D/g, "");
    let formatted = "+58";
    if (digits.length > 0) formatted += " " + digits.slice(0, 3);
    if (digits.length > 3) formatted += " " + digits.slice(3, 6);
    if (digits.length > 6) formatted += " " + digits.slice(6, 10);
    setPhone(formatted.trim());
    form.setValue("phone", formatted.trim());
  };

  const handleCedulaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d]/g, "").slice(0, 8);
    setCedulaNum(val);
    form.setValue("cedula", val ? `${cedulaType}-${val}` : "");
  };

  const handleCedulaTypeChange = (type: "V" | "E") => {
    setCedulaType(type);
    form.setValue("cedula", cedulaNum ? `${type}-${cedulaNum}` : "");
  };

  const handleSubmit = async (data: MemberFormData) => {
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      onSubmit({
        id: member?.id,
        name: data.name,
        email: data.email,
        phone: phone.length > 4 ? phone : "",
        cedula: cedulaNum ? `${cedulaType}-${cedulaNum}` : "",
        role: data.role,
        avatar: avatarPreview,
      });
      toast.success(member ? "Miembro actualizado" : "Miembro agregado");
      onOpenChange(false);
    } catch (error) { toast.error("Algo salió mal"); }
    finally { setIsSubmitting(false); }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2) || "?";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border p-0 rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative p-5 bg-gradient-to-r from-[#0DA2E7]/15 via-[#0DA2E7]/5 to-transparent border-b border-border">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#0DA2E7]/5 rounded-full blur-2xl" />
          <div className="flex items-center gap-3 relative">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0DA2E7] to-[#0B8BC7] shadow-lg shadow-[#0DA2E7]/30">
              <Pencil className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {member ? "Editar Miembro" : "Agregar Miembro"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {member ? `Modifica los datos de ${member.name || (member as any).full_name || 'Usuario'}` : "Agrega un nuevo miembro al equipo"}
              </DialogDescription>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="p-5 space-y-4">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-2 pb-1">
              <div className="relative">
                <Avatar className="h-16 w-16 ring-4 ring-border">
                  <AvatarImage src={avatarPreview} />
                  <AvatarFallback className="text-lg font-bold bg-muted text-muted-foreground">
                    {form.watch("name") ? getInitials(form.watch("name")) : <User className="h-6 w-6" />}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[#0DA2E7] text-white cursor-pointer hover:bg-[#0B8BC7] transition-colors shadow-lg">
                  <Upload className="h-3 w-3" />
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              </div>
              <p className="text-[10px] text-muted-foreground">{avatarPreview ? 'Click para cambiar' : 'Click para subir foto'}</p>
            </div>

            {/* Grid de 2 columnas */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Nombre - ocupa 2 columnas */}
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel className="text-xs font-medium flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" /> Nombre Completo *
                  </FormLabel>
                  <FormControl><Input placeholder="Nombre completo" {...field} className="bg-muted/30 border-border h-10 rounded-lg text-sm" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Email */}
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Correo Electrónico *
                  </FormLabel>
                  <FormControl><Input type="email" placeholder="correo@ejemplo.com" {...field} className="bg-muted/30 border-border h-10 rounded-lg text-sm" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Teléfono */}
              <div>
                <Label className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Teléfono <span className="text-muted-foreground/50">(opcional)</span>
                </Label>
                <Input
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="+58 424 191 7950"
                  className="bg-muted/30 border-border h-10 rounded-lg text-sm font-mono"
                  inputMode="numeric"
                />
              </div>

              {/* Cédula - ocupa 2 columnas */}
              <div className="sm:col-span-2">
                <Label className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground" /> Cédula <span className="text-muted-foreground/50">(opcional)</span>
                </Label>
                <div className="flex gap-2">
                  <Select value={cedulaType} onValueChange={(v) => handleCedulaTypeChange(v as "V" | "E")}>
                    <SelectTrigger className="w-16 bg-muted/30 border-border h-10 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="V">V</SelectItem>
                      <SelectItem value="E">E</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={cedulaNum}
                    onChange={handleCedulaChange}
                    placeholder="12345678"
                    className="bg-muted/30 border-border h-10 rounded-lg text-sm flex-1"
                    inputMode="numeric"
                  />
                </div>
                {cedulaNum && <p className="text-[10px] text-muted-foreground mt-1">{cedulaType}-{cedulaNum}</p>}
              </div>

              {/* Rol */}
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel className="text-xs font-medium">Rol *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-muted/30 border-border h-10 rounded-lg text-sm">
                        <SelectValue placeholder="Seleccionar rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="Manager">
                        <span className="flex items-center gap-2 text-sm"><Briefcase className="h-4 w-4 text-blue-500" /> Manager</span>
                      </SelectItem>
                      <SelectItem value="Technician">
                        <span className="flex items-center gap-2 text-sm"><Wrench className="h-4 w-4" style={{ color: HORMI_BLUE }} /> Técnico</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg h-10 px-4 text-sm">Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-lg h-10 px-4 gap-2 text-white text-sm" style={{ backgroundColor: HORMI_BLUE }}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                {member ? "Guardar Cambios" : "Agregar Miembro"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}