import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, Upload, User, Pencil } from "lucide-react";

const memberSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(8, "Teléfono debe tener al menos 8 caracteres"),
  cedula: z.string().min(5, "Cédula debe tener al menos 5 caracteres"),
  role: z.enum(["admin", "technician", "manager", "viewer"], {
    required_error: "Por favor selecciona un rol",
  }),
});

type MemberFormData = z.infer<typeof memberSchema>;

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  cedula: string;
  role: "admin" | "technician" | "manager" | "viewer";
  avatar?: string;
  isSuspended: boolean;
}

interface TeamMemberFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: TeamMember | null;
  onSubmit: (data: Omit<TeamMember, "id" | "isSuspended"> & { id?: string }) => void;
}

export function TeamMemberFormModal({
  open,
  onOpenChange,
  member,
  onSubmit,
}: TeamMemberFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(member?.avatar);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      cedula: "",
      role: undefined,
    },
  });

  // 🔄 Cargar datos del miembro al abrir
  useEffect(() => {
  if (open && member) {
    console.log('🔍 Miembro recibido:', member);
    console.log('🔍 name:', member.name);
    console.log('🔍 full_name:', (member as any).full_name);
    form.reset({
      name: member.name || (member as any).full_name || "",
      email: member.email || "",
      phone: member.phone || "",
      cedula: member.cedula || "",
      role: member.role || undefined,
    });
    setAvatarPreview(member.avatar);
  }

}, [open, member, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("La imagen debe ser menor a 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (data: MemberFormData) => {
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      onSubmit({
        id: member?.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        cedula: data.cedula,
        role: data.role,
        avatar: avatarPreview,
      });
      toast.success(member ? "Miembro actualizado" : "Miembro agregado");
      onOpenChange(false);
    } catch (error) {
      toast.error("Algo salió mal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2) || "?";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Pencil className="h-5 w-5 text-primary" />
            {member ? "Editar Miembro" : "Agregar Miembro"}
          </DialogTitle>
          {member && (
            <p className="text-sm text-muted-foreground mt-1">
  Modifica los datos de <strong>{member.name || (member as any).full_name || 'Usuario'}</strong>
</p>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-20 w-20 border-2 border-border">
                <AvatarImage src={avatarPreview} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                  {form.watch("name") ? getInitials(form.watch("name")) : <User className="h-8 w-8" />}
                </AvatarFallback>
              </Avatar>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
                <Upload className="h-4 w-4" /> {avatarPreview ? 'Cambiar foto' : 'Subir foto'}
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Nombre Completo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre completo" {...field} className="bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="correo@ejemplo.com" {...field} className="bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono *</FormLabel>
                    <FormControl>
                      <Input placeholder="+58 414-1234567" {...field} className="bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cedula"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cédula *</FormLabel>
                    <FormControl>
                      <Input placeholder="V-12345678" {...field} className="bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Seleccionar rol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="technician">Técnico</SelectItem>
                        <SelectItem value="viewer">Solo Vista</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {member ? "Guardar Cambios" : "Agregar Miembro"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}