import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ClientFormModal } from "@/components/clients/ClientFormModal";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Building2, MapPin, Search, Plus, ChevronDown, Phone, Mail, User,
  Pencil, Trash2, Loader2, FileText, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useClientsWithContacts, useDeleteClient, useReactivateClient, type ClientWithContacts } from "@/hooks/useClientes";
import { toast } from "sonner";

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [expandedClients, setExpandedClients] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientWithContacts | null>(null);

  const { data: clients = [], isLoading, refetch } = useClientsWithContacts(searchQuery, showInactive);
  const deleteClientMutation = useDeleteClient();
  const reactivateClientMutation = useReactivateClient();

  const totalClients = clients.length;
  const totalContacts = clients.reduce((acc, c) => acc + c.contacts.length, 0);

  const toggleClient = (clientId: string) => {
    setExpandedClients(prev => prev.includes(clientId) ? prev.filter(id => id !== clientId) : [...prev, clientId]);
  };

  const handleAddClient = () => { setEditingClient(null); setIsModalOpen(true); };
  const handleEditClient = (client: ClientWithContacts, e: React.MouseEvent) => { e.stopPropagation(); setEditingClient(client); setIsModalOpen(true); };
  const handleDeleteClient = async (clientId: string, clientName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`¿Estás seguro de desactivar el cliente "${clientName}"?`)) return;
    try {
      await deleteClientMutation.mutateAsync(clientId);
      toast.success("Cliente desactivado correctamente");
    } catch (error: any) { toast.error(`Error: ${error.message}`); }
  };
  const handleModalClose = (open: boolean) => { setIsModalOpen(open); if (!open) refetch(); };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between opacity-0 animate-fade-in">
          <div><h1 className="text-3xl font-bold text-foreground">Clientes</h1><p className="text-muted-foreground">Gestiona tu directorio de clientes y contactos</p></div>
          <Button onClick={handleAddClient} className="gap-2 shadow-glow"><Plus className="h-4 w-4" />Nuevo Cliente</Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 opacity-0 animate-fade-in" style={{ animationDelay: "100ms" }}>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50"><CardContent className="flex items-center gap-4 p-4"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><Building2 className="h-6 w-6 text-primary" /></div><div><p className="text-2xl font-bold text-foreground">{totalClients}</p><p className="text-sm text-muted-foreground">Total Clientes</p></div></CardContent></Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50"><CardContent className="flex items-center gap-4 p-4"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10"><User className="h-6 w-6 text-accent-foreground" /></div><div><p className="text-2xl font-bold text-foreground">{totalContacts}</p><p className="text-sm text-muted-foreground">Total Contactos</p></div></CardContent></Card>
        </div>

        <div className="flex items-center gap-4 opacity-0 animate-fade-in" style={{ animationDelay: "150ms" }}>
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nombre, dirección o RUC..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-muted/50 border-transparent focus:border-primary focus:bg-card" />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="inactive" checked={showInactive} onCheckedChange={setShowInactive} />
            <Label htmlFor="inactive" className="text-sm text-muted-foreground cursor-pointer whitespace-nowrap">Ver inactivos</Label>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              {clients.map((client, index) => (
                <Collapsible key={client.id} open={expandedClients.includes(client.id)} onOpenChange={() => toggleClient(client.id)}>
                  <Card className={cn("overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/5", "opacity-0 animate-fade-in")} style={{ animationDelay: `${200 + index * 50}ms` }}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer transition-colors hover:bg-muted/30">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10"><Building2 className="h-6 w-6 text-primary" /></div>
                            <div className="space-y-1">
                              <CardTitle className="text-lg">{client.name}</CardTitle>
                              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                {client.address && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{client.address}</span>}
                                {client.ruc && <Badge variant="secondary" className="text-xs gap-1"><FileText className="h-3 w-3" />{client.ruc}</Badge>}
                                {client.is_active === false && <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/20">Inactivo</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground">{client.contacts.length} contacto{client.contacts.length !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {client.is_active === false && (
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); reactivateClientMutation.mutate(client.id); }} className="h-8 w-8 p-0 text-muted-foreground hover:text-green-500" title="Reactivar cliente"><RefreshCw className="h-4 w-4" /></Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={(e) => handleEditClient(client, e)} className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={(e) => handleDeleteClient(client.id, client.name, e)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                            <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200", expandedClients.includes(client.id) && "rotate-180")} />
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="border-t border-border/50 pt-4">
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-muted-foreground">Contactos</h4>
                          {client.contacts.length === 0 ? <p className="text-sm text-muted-foreground italic">No hay contactos registrados</p> : (
                            <div className="grid gap-3">
                              {client.contacts.map(contact => (
                                <div key={contact.id} className="flex flex-col gap-2 rounded-xl bg-muted/30 p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="space-y-1"><p className="font-medium text-foreground">{contact.name}</p>{contact.position && <p className="text-sm text-muted-foreground">{contact.position}</p>}</div>
                                  <div className="flex flex-wrap gap-3 text-sm">
                                    {contact.phone && <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"><Phone className="h-3.5 w-3.5" />{contact.phone}</a>}
                                    {contact.email && <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"><Mail className="h-3.5 w-3.5" />{contact.email}</a>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
            {clients.length === 0 && !isLoading && (
              <Card className="border-dashed"><CardContent className="flex flex-col items-center justify-center py-12"><Building2 className="h-12 w-12 text-muted-foreground/50" /><h3 className="mt-4 text-lg font-medium text-foreground">No se encontraron clientes</h3></CardContent></Card>
            )}
          </>
        )}
      </div>
      <ClientFormModal open={isModalOpen} onOpenChange={handleModalClose} client={editingClient} />
    </DashboardLayout>
  );
}