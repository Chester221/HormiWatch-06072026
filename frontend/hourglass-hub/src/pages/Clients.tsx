import { useState, useEffect } from "react";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Building2, MapPin, Search, Plus, ChevronDown, Phone, Mail, User,
  Pencil, Trash2, Loader2, FileText, RefreshCw, AlertTriangle, ShieldOff,
  FolderKanban, Briefcase, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useClientsWithContacts, useDeleteClient, useReactivateClient, type ClientWithContacts } from "@/hooks/useClientes";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { motion } from "framer-motion";

// Componente para renderizar una tarjeta de cliente
function ClientCard({ client, expandedClients, toggleClient, handleEditClient, handleDeleteClick, reactivateClientMutation, index }: any) {
  return (
    <Collapsible open={expandedClients.includes(client.id)} onOpenChange={() => toggleClient(client.id)}>
      <Card className={cn(
        "overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/5",
        client.is_active === false && "opacity-60 border-red-500/20 bg-red-500/5",
        "opacity-0 animate-fade-in"
      )} style={{ animationDelay: `${200 + index * 50}ms` }}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer transition-colors hover:bg-muted/30">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white border border-border overflow-hidden">
                  {(client as any).logo_url ? (
                    <img src={(client as any).logo_url} alt={client.name} className="w-full h-full object-contain p-1" />
                  ) : (
                    <Building2 className="h-6 w-6 text-primary/60" />
                  )}
                </div>
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
                <Button variant="ghost" size="sm" onClick={(e) => handleDeleteClick(client, e)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                <motion.div
                  animate={{ rotate: expandedClients.includes(client.id) ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
                </motion.div>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent asChild>
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <CardContent className="border-t border-border/50 pt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-muted-foreground">Contactos</h4>
                  {client.address && (
                    <a
                      href={`https://www.google.com/maps/place/${encodeURIComponent(client.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                    >
                      <MapPin className="h-3 w-3" />
                      Maps
                    </a>
                  )}
                </div>
                {client.contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No hay contactos registrados</p>
                ) : (
                  <div className="grid gap-2">
                    {client.contacts.map((contact: any) => (
                      <div key={contact.id} className="rounded-xl bg-muted/30 p-3 transition-colors hover:bg-muted/50">
                        <div className="flex items-center gap-2 mb-1.5">
                          <User className="h-4 w-4 text-primary/70 shrink-0" />
                          <p className="font-medium text-foreground text-sm">{contact.name}</p>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 ml-6">
                          {contact.position && (
                            <div className="flex items-center gap-1.5">
                              <Briefcase className="h-3 w-3 text-muted-foreground shrink-0" />
                              <p className="text-xs text-muted-foreground">{contact.position}</p>
                            </div>
                          )}
                          {(contact as any).department && (
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                              <p className="text-xs text-muted-foreground">{(contact as any).department}</p>
                            </div>
                          )}
                          {contact.email && (
                            <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${contact.email}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[200px]">{contact.email}</span>
                            </a>
                          )}
                          {contact.phone && (
                            <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                              <Phone className="h-3 w-3 shrink-0" />
                              {contact.phone}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </motion.div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [expandedClients, setExpandedClients] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientWithContacts | null>(null);
  
  const [deactivateDialog, setDeactivateDialog] = useState<{ open: boolean; clientId: string; clientName: string }>({ open: false, clientId: '', clientName: '' });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; clientId: string; clientName: string }>({ open: false, clientId: '', clientName: '' });
  const [cannotDeleteDialog, setCannotDeleteDialog] = useState<{ open: boolean; clientName: string; projectCount: number }>({ open: false, clientName: '', projectCount: 0 });

  const { data: clients = [], isLoading, refetch } = useClientsWithContacts(searchQuery, showInactive);
  const deleteClientMutation = useDeleteClient();
  const reactivateClientMutation = useReactivateClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [inactiveCount, setInactiveCount] = useState(0);

  useEffect(() => {
    const fetchInactiveCount = async () => {
      const { count } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', false);
      setInactiveCount(count || 0);
    };
    fetchInactiveCount();
  }, [clients]);

  const activeClients = clients.filter(c => c.is_active !== false);
  const totalContacts = clients.reduce((acc, c) => acc + c.contacts.length, 0);

  const toggleClient = (clientId: string) => {
    setExpandedClients(prev => prev.includes(clientId) ? prev.filter(id => id !== clientId) : [...prev, clientId]);
  };

  const handleAddClient = () => { setEditingClient(null); setIsModalOpen(true); };
  const handleEditClient = (client: ClientWithContacts, e: React.MouseEvent) => { e.stopPropagation(); setEditingClient(client); setIsModalOpen(true); };
  
  const handleDeleteClick = async (client: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (client.is_active === false) {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, status')
        .eq('client_id', client.id)
        .neq('status', 'Completed')
        .neq('status', 'Cancelled');
      
      if (projects && projects.length > 0) {
        setCannotDeleteDialog({ open: true, clientName: client.name, projectCount: projects.length });
      } else {
        setDeleteDialog({ open: true, clientId: client.id, clientName: client.name });
      }
    } else {
      setDeactivateDialog({ open: true, clientId: client.id, clientName: client.name });
    }
  };

  const confirmDeactivate = async () => {
    try {
      await deleteClientMutation.mutateAsync(deactivateDialog.clientId);
      toast.success(`"${deactivateDialog.clientName}" desactivado`);
      setDeactivateDialog({ open: false, clientId: '', clientName: '' });
    } catch (error: any) { toast.error(`Error: ${error.message}`); }
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await supabase.from('client_contacts').delete().eq('client_id', deleteDialog.clientId);
      await supabase.from('clients').delete().eq('id', deleteDialog.clientId);
      toast.success(`"${deleteDialog.clientName}" eliminado`);
      setDeleteDialog({ open: false, clientId: '', clientName: '' });
      refetch();
    } catch (error: any) { toast.error(`Error: ${error.message}`); }
    setIsDeleting(false);
  };

  const handleModalClose = (open: boolean) => { setIsModalOpen(open); if (!open) refetch(); };

  // Separar clientes en columna izquierda (pares) y derecha (impares)
  const leftClients = clients.filter((_, i) => i % 2 === 0);
  const rightClients = clients.filter((_, i) => i % 2 === 1);

  const cardProps = {
    expandedClients,
    toggleClient,
    handleEditClient,
    handleDeleteClick,
    reactivateClientMutation,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between opacity-0 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground">Gestiona tu directorio de clientes y contactos</p>
          </div>
          <Button onClick={handleAddClient} className="gap-2 shadow-glow"><Plus className="h-4 w-4" />Nuevo Cliente</Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 opacity-0 animate-fade-in" style={{ animationDelay: "100ms" }}>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50"><CardContent className="flex items-center gap-4 p-4"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><Building2 className="h-6 w-6 text-primary" /></div><div><p className="text-2xl font-bold text-foreground">{activeClients.length}</p><p className="text-sm text-muted-foreground">Clientes Activos</p></div></CardContent></Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50"><CardContent className="flex items-center gap-4 p-4"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10"><User className="h-6 w-6 text-accent-foreground" /></div><div><p className="text-2xl font-bold text-foreground">{totalContacts}</p><p className="text-sm text-muted-foreground">Total Contactos</p></div></CardContent></Card>
        </div>

        <div className="flex items-center gap-4 opacity-0 animate-fade-in" style={{ animationDelay: "150ms" }}>
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nombre, dirección o RIF..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-muted/50 border-transparent focus:border-primary focus:bg-card" />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="inactive" checked={showInactive} onCheckedChange={setShowInactive} disabled={inactiveCount === 0 && !showInactive} />
            <Label htmlFor="inactive" className={`text-sm whitespace-nowrap ${inactiveCount === 0 && !showInactive ? 'text-muted-foreground/40 cursor-not-allowed' : 'text-muted-foreground cursor-pointer'}`}>
              Ver inactivos {inactiveCount > 0 && `(${inactiveCount})`}
            </Label>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : clients.length === 0 ? (
          <Card className="border-dashed"><CardContent className="flex flex-col items-center justify-center py-12"><Building2 className="h-12 w-12 text-muted-foreground/50" /><h3 className="mt-4 text-lg font-medium text-foreground">No se encontraron clientes</h3></CardContent></Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Columna izquierda: índices pares (0, 2, 4...) */}
            <div className="flex flex-col gap-4">
              {leftClients.map((client, index) => (
                <ClientCard key={client.id} client={client} {...cardProps} index={index * 2} />
              ))}
            </div>
            {/* Columna derecha: índices impares (1, 3, 5...) */}
            <div className="flex flex-col gap-4">
              {rightClients.map((client, index) => (
                <ClientCard key={client.id} client={client} {...cardProps} index={index * 2 + 1} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal DESACTIVAR */}
      <Dialog open={deactivateDialog.open} onOpenChange={(open) => setDeactivateDialog({ ...deactivateDialog, open })}>
        <DialogContent className="sm:max-w-md bg-card border-border p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500/10 to-amber-500/5 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 ring-4 ring-amber-500/10">
                <ShieldOff className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-foreground">Desactivar Cliente</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">El cliente se ocultará de la lista principal</p>
              </div>
            </div>
          </div>
          <div className="p-6 pt-4">
            <p className="text-sm text-foreground">¿Desactivar a <span className="font-semibold text-amber-400">"{deactivateDialog.clientName}"</span>?</p>
            <p className="text-xs text-muted-foreground mt-3 bg-muted/50 rounded-lg p-3">Podrás verlo y reactivarlo con <strong>"Ver inactivos"</strong>.</p>
          </div>
          <DialogFooter className="p-4 pt-0 gap-2">
            <Button variant="outline" onClick={() => setDeactivateDialog({ open: false, clientId: '', clientName: '' })} className="flex-1">Cancelar</Button>
            <Button onClick={confirmDeactivate} disabled={deleteClientMutation.isPending} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-medium">
              {deleteClientMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <ShieldOff className="h-4 w-4 mr-1.5" />}Desactivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal ELIMINAR */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <DialogContent className="sm:max-w-md bg-card border-border p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-red-500/10 to-red-500/5 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/20 ring-4 ring-red-500/10">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-foreground">Eliminar Permanentemente</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Esta acción no se puede deshacer</p>
              </div>
            </div>
          </div>
          <div className="p-6 pt-4">
            <p className="text-sm text-foreground">¿Eliminar a <span className="font-semibold text-red-400">"{deleteDialog.clientName}"</span>?</p>
            <div className="mt-3 bg-red-500/5 border border-red-500/10 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-400">Se eliminarán todos los datos y contactos asociados.</p>
            </div>
          </div>
          <DialogFooter className="p-4 pt-0 gap-2">
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, clientId: '', clientName: '' })} className="flex-1">Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting} className="flex-1 font-medium">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Trash2 className="h-4 w-4 mr-1.5" />}Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal NO SE PUEDE ELIMINAR */}
      <Dialog open={cannotDeleteDialog.open} onOpenChange={(open) => setCannotDeleteDialog({ ...cannotDeleteDialog, open })}>
        <DialogContent className="sm:max-w-md bg-card border-border p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500/10 to-blue-500/5 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/20 ring-4 ring-blue-500/10">
                <FolderKanban className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-foreground">No se puede eliminar</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">El cliente tiene proyectos en curso</p>
              </div>
            </div>
          </div>
          <div className="p-6 pt-4">
            <p className="text-sm text-foreground"><span className="font-semibold">"{cannotDeleteDialog.clientName}"</span> tiene <span className="font-semibold text-blue-400">{cannotDeleteDialog.projectCount} proyecto(s)</span> sin finalizar.</p>
            <p className="text-xs text-muted-foreground mt-3 bg-muted/50 rounded-lg p-3">Debes completar o cancelar todos los proyectos del cliente antes de poder eliminarlo permanentemente.</p>
          </div>
          <DialogFooter className="p-4 pt-0">
            <Button variant="outline" onClick={() => setCannotDeleteDialog({ open: false, clientName: '', projectCount: 0 })} className="w-full">Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClientFormModal open={isModalOpen} onOpenChange={handleModalClose} client={editingClient} />
    </DashboardLayout>
  );
}