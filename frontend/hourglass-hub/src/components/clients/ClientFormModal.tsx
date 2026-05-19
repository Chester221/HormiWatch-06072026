import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Plus, Trash2, User, Loader2 } from "lucide-react";
import { z } from "zod";
import { useSaveClientWithContacts, type ClientWithContacts } from "@/hooks/useClientes";

interface LocalContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
}

interface ClientFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: ClientWithContacts | null;
}

const clientSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  address: z.string().optional(),
  ruc: z.string().optional(),
});

const contactSchema = z.object({
  name: z.string().min(2, "El nombre del contacto es requerido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  position: z.string().optional(),
});

export function ClientFormModal({ open, onOpenChange, client }: ClientFormModalProps) {
  const isEditing = !!client;
  const [errors, setErrors] = useState<Record<string, string>>({});

  const saveClientMutation = useSaveClientWithContacts();

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    ruc: "",
  });

  const [contacts, setContacts] = useState<LocalContact[]>([]);

  useEffect(() => {
    if (open) {
      if (client) {
        setFormData({
          name: client.name,
          address: client.address || "",
          ruc: client.ruc || "",
        });
        setContacts(client.contacts.map(c => ({
          id: c.id,
          name: c.name,
          email: c.email || "",
          phone: c.phone || "",
          position: c.position || "",
        })));
      } else {
        setFormData({ name: "", address: "", ruc: "" });
        setContacts([]);
      }
      setErrors({});
    }
  }, [client, open]);

  const addContact = () => {
    const newContact: LocalContact = {
      id: `new-${Date.now()}`,
      name: "",
      email: "",
      phone: "",
      position: "",
    };
    setContacts([...contacts, newContact]);
  };

  const updateContact = (id: string, field: keyof LocalContact, value: string) => {
    setContacts(contacts.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const removeContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate client data
    const clientResult = clientSchema.safeParse(formData);
    if (!clientResult.success) {
      const fieldErrors: Record<string, string> = {};
      clientResult.error.errors.forEach(err => {
        fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    // Validate contacts (only non-empty ones)
    const validContacts = contacts.filter(c => c.name.trim() !== "");
    for (let i = 0; i < validContacts.length; i++) {
      const contactResult = contactSchema.safeParse(validContacts[i]);
      if (!contactResult.success) {
        const firstError = contactResult.error.errors[0];
        setErrors({ [`contact_${i}`]: `Contacto ${i + 1}: ${firstError.message}` });
        return;
      }
    }

    try {
      await saveClientMutation.mutateAsync({
        client: {
          id: client?.id,
          name: formData.name,
          address: formData.address || undefined,
          ruc: formData.ruc || undefined,
        },
        contacts: validContacts.map(c => ({
          name: c.name,
          email: c.email || undefined,
          phone: c.phone || undefined,
          position: c.position || undefined,
        })),
        isEditing,
      });

      toast.success(isEditing ? "Cliente actualizado correctamente" : "Cliente creado correctamente");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 bg-card border-border">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl">
            {isEditing ? "Editar Cliente" : "Nuevo Cliente"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[calc(90vh-160px)] px-6">
            <div className="space-y-6 pb-6">
              {/* Company Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Información del Cliente</h3>

                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Cliente *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ingresa el nombre de la empresa"
                    className={errors.name ? "border-destructive" : "bg-muted/50 border-border"}
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ruc">RUC / NIT</Label>
                    <Input
                      id="ruc"
                      value={formData.ruc}
                      onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                      placeholder="Ej: 20123456789"
                      className="bg-muted/50 border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Ciudad, País"
                      className="bg-muted/50 border-border"
                    />
                  </div>
                </div>
              </div>

              {/* Contacts */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Contactos ({contacts.length})
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addContact}
                    className="gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar Contacto
                  </Button>
                </div>

                {Object.keys(errors).filter(k => k.startsWith("contact_")).map(key => (
                  <p key={key} className="text-xs text-destructive">{errors[key]}</p>
                ))}

                {contacts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-8">
                    <User className="h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">No hay contactos agregados</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addContact}
                      className="mt-2 gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Agregar primer contacto
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {contacts.map((contact, index) => (
                      <div
                        key={contact.id}
                        className="rounded-xl border border-border/50 bg-muted/20 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">
                            Contacto {index + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeContact(contact.id)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Nombre *</Label>
                            <Input
                              value={contact.name}
                              onChange={(e) => updateContact(contact.id, "name", e.target.value)}
                              placeholder="Nombre completo"
                              className="h-9 bg-card border-border"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Cargo</Label>
                            <Input
                              value={contact.position}
                              onChange={(e) => updateContact(contact.id, "position", e.target.value)}
                              placeholder="Ej: Gerente General"
                              className="h-9 bg-card border-border"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Teléfono</Label>
                            <Input
                              value={contact.phone}
                              onChange={(e) => updateContact(contact.id, "phone", e.target.value)}
                              placeholder="+506 0000-0000"
                              className="h-9 bg-card border-border"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Email</Label>
                            <Input
                              type="email"
                              value={contact.email}
                              onChange={(e) => updateContact(contact.id, "email", e.target.value)}
                              placeholder="contacto@empresa.com"
                              className="h-9 bg-card border-border"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-3 border-t border-border/50 p-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saveClientMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saveClientMutation.isPending}
              className="gap-2 shadow-glow"
            >
              {saveClientMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? "Guardar Cambios" : "Crear Cliente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
