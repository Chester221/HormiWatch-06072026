import { useMemo } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Building2, FolderKanban, Clock, CheckSquare, Activity,
  Mail, Phone, Briefcase, User, MapPin, Hash,
} from "lucide-react";

interface ClientDetailsModalProps {
  client: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: any[];
  projects: any[];
  tasks: any[];
}

export default function ClientDetailsModal({
  client,
  open,
  onOpenChange,
  clients,
  projects,
  tasks,
}: ClientDetailsModalProps) {
  const clientData = clients.find((c: any) => c.name === client?.name) || client || {};

  // ✅ Obtener el color del cliente (debe venir en clientData o usar uno por defecto)
  const clientColor = clientData.color || "#3b82f6"; // azul por defecto

  const clientProjects = useMemo(() => {
    if (!clientData?.id) return [];
    return projects
      .filter((p: any) => p.client_id === clientData.id)
      .map((p: any) => {
        const projectTasks = tasks.filter((t: any) => t.project_id === p.id);
        const completed = projectTasks.filter((t: any) => t.status === "Completed").length;
        const total = projectTasks.length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        const projectHours = projectTasks.reduce(
          (acc: number, t: any) =>
            acc +
            (t.duration_in_minutes
              ? t.duration_in_minutes / 60
              : (t.normal_hours || 0) + (t.overtime_hours || 0)),
          0
        );
        return { ...p, progress, completed, total, projectHours };
      });
  }, [clientData, projects, tasks]);

  const totalHours = useMemo(() => {
    return clientProjects.reduce((acc, p) => acc + p.projectHours, 0);
  }, [clientProjects]);

  const contacts = (clientData as any)?.contacts || [];

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header fijo */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex-shrink-0"
        >
          <DialogHeader>
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              >
                {/* ✅ Color dinámico aquí */}
                <div 
                  className="relative h-14 w-14 rounded-xl flex items-center justify-center transition-colors duration-300"
                  style={{ backgroundColor: `${clientColor}10` }}
                >
                  {/* Bolita decorativa de fondo - con el color del cliente */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div 
                      className="h-8 w-8 rounded-full transition-transform duration-500 group-hover:scale-150"
                      style={{ backgroundColor: `${clientColor}20` }}
                    />
                  </div>
                  {/* Ícono - con el color del cliente */}
                  <Building2 
                    className="h-7 w-7 relative z-10 transition-all duration-300 group-hover:scale-110"
                    style={{ color: clientColor }}
                  />
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15, duration: 0.25 }}
              >
                <DialogTitle className="text-xl font-bold text-foreground">
                  {clientData.name || client.name}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="gap-1 text-[11px]">
                    <FolderKanban className="h-3 w-3" />
                    {clientProjects.length}{" "}
                    {clientProjects.length === 1 ? "proyecto" : "proyectos"}
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-[11px]">
                    <Clock className="h-3 w-3" />
                    {totalHours.toFixed(1)}h totales
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-[11px]">
                    <User className="h-3 w-3" />
                    {contacts.length}{" "}
                    {contacts.length === 1 ? "contacto" : "contactos"}
                  </Badge>
                </DialogDescription>
              </motion.div>
            </div>
          </DialogHeader>
        </motion.div>

        {/* Contenido con scroll (sin cambios) */}
        <div className="flex-1 overflow-y-auto pr-2 mt-5">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.25 }}
            className="space-y-5"
          >
            {/* Información del cliente */}
            {(clientData.ruc || clientData.code || clientData.address || clientData.department) && (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Información General
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {(clientData.ruc || clientData.code) && (
                      <div className="p-3 rounded-lg border border-border bg-muted/20">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-0.5">
                          <Hash className="h-3 w-3" />
                          RIF / Código
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {clientData.ruc || clientData.code}
                        </p>
                      </div>
                    )}
                    {clientData.department && (
                      <div className="p-3 rounded-lg border border-border bg-muted/20">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-0.5">
                          <Briefcase className="h-3 w-3" />
                          Departamento
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {clientData.department}
                        </p>
                      </div>
                    )}
                    {clientData.address && (
                      <div className="p-3 rounded-lg border border-border bg-muted/20 col-span-2">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-0.5">
                          <MapPin className="h-3 w-3" />
                          Dirección
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {clientData.address}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Contactos */}
            {contacts.length > 0 && (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Contactos
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {contacts.map((contact: any, idx: number) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + idx * 0.04, duration: 0.2 }}
                        className="p-3 rounded-lg border border-border bg-muted/20"
                      >
                        <p className="font-medium text-sm text-foreground">
                          {contact.name}
                        </p>
                        {contact.position && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                            <Briefcase className="h-3 w-3" />
                            {contact.position}
                            {contact.department && (
                              <span>· {contact.department}</span>
                            )}
                          </p>
                        )}
                        <div className="flex flex-col gap-0.5 mt-2">
                          {contact.email && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Mail className="h-3 w-3" />
                              {contact.email}
                            </span>
                          )}
                          {contact.phone && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Phone className="h-3 w-3" />
                              {contact.phone}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Proyectos */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
                Proyectos ({clientProjects.length})
              </h3>
              {clientProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FolderKanban className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No hay proyectos para este cliente
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {clientProjects.map((project: any, idx: number) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + idx * 0.04, duration: 0.2 }}
                      className="p-3 rounded-lg border border-border bg-muted/20"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm text-foreground">
                          {project.name}
                        </h4>
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <CheckSquare className="h-3 w-3" />
                          {project.completed}/{project.total}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Progress
                          value={project.progress}
                          className="h-1.5 flex-1"
                        />
                        <span className="text-xs font-medium text-muted-foreground">
                          {project.progress}%
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {project.projectHours.toFixed(1)}h
                        </span>
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {project.status === "completed"
                            ? "Completado"
                            : project.status === "in_progress"
                            ? "En progreso"
                            : project.isDelayed
                            ? "Atrasado"
                            : "Pendiente"}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}