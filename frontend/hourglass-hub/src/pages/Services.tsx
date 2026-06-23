import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Search, Plus, Pencil, Trash2, Layers, Wrench, DollarSign,
  Loader2, FileText, Filter, CheckCircle, TrendingUp, Clock, ChevronLeft, ChevronRight, MoreVertical
} from "lucide-react";
import { ServiceFormModal } from "@/components/services/ServiceFormModal";
import { useServices, useDeleteService, type Service } from "@/hooks/useServices";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";

const HORMI_BLUE = '#0DA2E7';

export default function Services() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [formModal, setFormModal] = useState<{ open: boolean; service: Service | null }>({
    open: false, service: null,
  });

  const { profile } = useAuth();
  const userRole = profile?.role;
  const isManager = userRole === 'Manager';
  const canEdit = isManager;
  const canCreate = isManager;
  const canDelete = isManager;

  const servicesQuery = useServices(searchQuery);
  const services = servicesQuery.data || [];
  const isLoading = servicesQuery.isLoading;
  const refetch = servicesQuery.refetch;
  const deleteServiceMutation = useDeleteService();

  const uniqueCategories = [...new Set(services.map((s) => s.categories?.name || 'Sin categoría'))];

  // Filtros
  const filteredServices = services.filter(s => {
    const matchesCategory = categoryFilter === "all" || (s.categories?.name || 'Sin categoría') === categoryFilter;
    return matchesCategory;
  });

  // Paginación
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentServices = filteredServices.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);

  // Métricas
  const stats = {
    total: services.length,
    categories: uniqueCategories.length,
    avgRate: services.length > 0 
      ? Math.round(services.reduce((sum, s) => sum + (s.default_hourly_rate || 0), 0) / services.length) 
      : 0,
  };

  const handleEdit = (service: Service) => { if (!canEdit) return; setFormModal({ open: true, service }); };
  const handleAdd = () => { if (!canCreate) return; setFormModal({ open: true, service: null }); };

  const handleDelete = async (service: Service) => {
    if (!canDelete) return;
    if (!confirm(`¿Eliminar "${service.name}"?`)) return;
    try {
      await deleteServiceMutation.mutateAsync(service.id);
      toast.success(`"${service.name}" eliminado`);
      refetch();
    } catch (error: any) { toast.error(`Error: ${error.message}`); }
  };

  const handleModalClose = (open: boolean) => {
    setFormModal(prev => ({ ...prev, open }));
    if (!open) refetch();
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#0DA2E7]/20 to-[#0DA2E7]/5">
                <Wrench className="h-6 w-6" style={{ color: HORMI_BLUE }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Servicios</h1>
                <p className="text-sm text-muted-foreground">{stats.total} servicios · {stats.categories} categorías</p>
              </div>
            </div>
          </div>
          {canCreate && (
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button onClick={handleAdd} size="sm" className="gap-2 text-white" style={{ backgroundColor: HORMI_BLUE }}>
                <Plus className="h-4 w-4" /> Nuevo Servicio
              </Button>
            </motion.div>
          )}
        </motion.div>

        {/* Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: Wrench, label: "Total Servicios", value: stats.total, sub: `${stats.categories} categorías`, delay: 0.05 },
            { icon: Layers, label: "Categorías", value: stats.categories, sub: "tipos de servicio", delay: 0.1 },
            { icon: DollarSign, label: "Tarifa Promedio", value: `$${stats.avgRate}/hr`, sub: "por hora", delay: 0.15 },
          ].map((metric, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: metric.delay }} className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/5 transition-transform duration-300 group-hover:scale-150" />
              <div className="absolute right-4 top-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
                  <metric.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="space-y-1.5 pr-14 p-4 pb-3">
                <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">{metric.value}</p>
                {metric.sub && <p className="text-[10px] text-muted-foreground">{metric.sub}</p>}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Buscador + Filtro */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar servicios..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pl-10 bg-muted/50 h-9 text-xs" />
          </div>
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="h-9 w-[160px] text-xs"><Filter className="h-3.5 w-3.5 mr-1.5" /><SelectValue placeholder="Categoría" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {uniqueCategories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Grid de Servicios */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" style={{ color: HORMI_BLUE }} /></div>
        ) : currentServices.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 rounded-xl border border-border bg-card">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-sm text-muted-foreground">No se encontraron servicios</p>
          </motion.div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {currentServices.map((service, idx) => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: idx * 0.04, duration: 0.3 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="rounded-xl border border-border/50 bg-card hover:shadow-xl hover:border-[#0DA2E7]/20 transition-all duration-300 group relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#0DA2E7]/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: HORMI_BLUE + '15' }}>
                            <Wrench className="h-4 w-4" style={{ color: HORMI_BLUE }} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-foreground group-hover:text-[#0DA2E7] transition-colors">{service.name}</h3>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5 bg-muted/30">
                              {service.categories?.name || 'Sin categoría'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-bold text-emerald-600 flex items-center gap-0.5">
                            <DollarSign className="h-3.5 w-3.5" />
                            {service.default_hourly_rate ? service.default_hourly_rate.toFixed(2) : '0.00'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">/hr</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                        {service.description || 'Sin descripción'}
                      </p>
                      <div className="flex items-center justify-end pt-3 mt-3 border-t border-border/50">
                        {canEdit && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-[#0DA2E7]/10 hover:text-[#0DA2E7] rounded-lg" onClick={() => handleEdit(service)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-500 rounded-lg" onClick={() => handleDelete(service)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-xs text-muted-foreground min-w-[60px] text-center">Pág. {currentPage} de {totalPages}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            )}
          </>
        )}
      </div>

      <ServiceFormModal open={formModal.open} onOpenChange={handleModalClose} service={formModal.service} />
    </DashboardLayout>
  );
}