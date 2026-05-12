import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Search,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Layers,
  Wrench,
  DollarSign,
  Loader2,
  FileText
} from "lucide-react";
import { ServiceFormModal } from "@/components/services/ServiceFormModal";
import { useServices, useDeleteService, type Service } from "@/hooks/useServices";

export default function Services() {
  const [searchQuery, setSearchQuery] = useState("");
  const [formModal, setFormModal] = useState<{ open: boolean; service: Service | null }>({
    open: false,
    service: null,
  });

  const { data: services = [], isLoading, refetch } = useServices(searchQuery);
  const deleteServiceMutation = useDeleteService();

  const handleEdit = (service: Service) => {
    setFormModal({ open: true, service });
  };

  const handleAdd = () => {
    setFormModal({ open: true, service: null });
  };

  const handleDelete = async (service: Service) => {
    if (!confirm(`¿Estás seguro de eliminar el servicio "${service.name}"?`)) return;

    try {
      await deleteServiceMutation.mutateAsync(service.id);
      toast.success(`Servicio "${service.name}" eliminado correctamente`);
      refetch();
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  };

  const handleModalClose = (open: boolean) => {
    setFormModal(prev => ({ ...prev, open }));
    if (!open) {
      refetch();
    }
  };

  const uniqueCategories = [...new Set(services.map((s) => s.categories?.name || 'Uncategorized'))];
  const totalServices = services.length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Servicios</h1>
            <p className="text-muted-foreground">Gestiona tu catálogo de servicios y tarifas</p>
          </div>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Servicio
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="bg-card/50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Wrench className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalServices}</p>
                <p className="text-sm text-muted-foreground">Total Servicios</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <Layers className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{uniqueCategories.length}</p>
                <p className="text-sm text-muted-foreground">Categorías</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar servicios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/50"
          />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Tarifa/hora</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : services.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No hay servicios registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{service.categories?.name || 'Sin categoría'}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{service.description || '-'}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-green-600">
                          <DollarSign className="h-3.5 w-3.5" />
                          {(service.default_hourly_rate || 0).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(service)}>
                              <Pencil className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(service)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <ServiceFormModal
          open={formModal.open}
          onOpenChange={handleModalClose}
          service={formModal.service}
        />
      </div>
    </DashboardLayout>
  );
}