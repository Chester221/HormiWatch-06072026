import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Calendar, Clock, DollarSign, Download, FileText, BarChart3, CheckCircle2, Circle, User, Users, Plus, Trash2, Pencil, Crown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTasks, useDeleteTask, type Task } from "@/hooks/useTasks";
import { TaskFormModal } from "@/components/tasks/TaskFormModal";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "@/hooks/useAuth";

interface TeamMember {
  name: string;
  avatar: string;
  role?: string;
}

interface Project {
  id: string;
  name: string;
  client: string;
  status: "active" | "completed" | "on-hold" | "planning" | "In Progress" | "Not Started" | "Cancelled";
  progress: number;
  hoursConsumed: number;
  hoursPool: number;
  endDate: string;
  startDate?: string;
  rate?: number;
  teamLead: TeamMember;
  team: TeamMember[];
}

interface ProjectDetailModalProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig: Record<string, { label: string; class: string }> = {
  active: { label: "Activo", class: "bg-success/10 text-success border-success/20" },
  completed: { label: "Completado", class: "bg-primary/10 text-primary border-primary/20" },
  "on-hold": { label: "En Pausa", class: "bg-warning/10 text-warning border-warning/20" },
  planning: { label: "Planificación", class: "bg-muted text-muted-foreground border-border" },
  "Not Started": { label: "Sin Empezar", class: "bg-muted text-muted-foreground border-border" },
  "In Progress": { label: "En Progreso", class: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  "Completed": { label: "Completado", class: "bg-green-500/10 text-green-500 border-green-500/20" },
  "On Hold": { label: "En Espera", class: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  "Cancelled": { label: "Cancelado", class: "bg-red-500/10 text-red-500 border-red-500/20" },
  default: { label: "Desconocido", class: "bg-slate-100 text-slate-500 border-slate-200" }
};

const taskStatusConfig: Record<string, { label: string; icon: any; class: string }> = {
  'Completed': { label: "Completada", icon: CheckCircle2, class: "text-green-500" },
  'In Progress': { label: "En Progreso", icon: Clock, class: "text-blue-500" },
  'Pending': { label: "Pendiente", icon: Circle, class: "text-gray-400" },
  'On Hold': { label: "En Espera", icon: Circle, class: "text-yellow-500" },
  'Cancelled': { label: "Cancelada", icon: Circle, class: "text-red-500" },
  default: { label: "Desconocido", icon: Circle, class: "text-gray-400" }
};

export function ProjectDetailModal({ project, open, onOpenChange }: ProjectDetailModalProps) {
  if (!project) return null;

  const { profile } = useAuth();
  const userRole = profile?.role;
  const isManager = userRole === 'Manager';
  const canEditTasks = isManager;

  const { data: tasks = [] } = useTasks(project.id);
  const deleteTask = useDeleteTask();
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
<<<<<<< HEAD
=======

  // Cargar miembros del proyecto desde project_members
  useEffect(() => {
    if (open && project) {
      supabase
        .from('project_members')
        .select('*, profiles(id, full_name, avatar_url)')
        .eq('project_id', project.id)
        .then(({ data }) => setProjectMembers(data || []));
    }
  }, [open, project]);
>>>>>>> 11069f104d1610e5c5ea848911ab81005acbe8e2

  useEffect(() => {
    if (open && project) {
      supabase
        .from('project_members')
        .select('*, profiles(id, full_name, avatar_url)')
        .eq('project_id', project.id)
        .then(({ data }) => setProjectMembers(data || []));
    }
  }, [open, project]);

  // ✅ CORREGIDO: usar hours en lugar de duration_in_minutes
  const realHoursConsumed = tasks.reduce((acc, t) => acc + (t.hours || 0), 0);
  const displayHoursConsumed = realHoursConsumed || project.hoursConsumed;
  const hoursPercentage = project.hoursPool > 0 ? Math.min(Math.round((displayHoursConsumed / project.hoursPool) * 100), 100) : 0;
  const statusInfo = statusConfig[project.status] || statusConfig.default;

  const handleEditTask = (task: Task) => { 
    if (!canEditTasks) return;
    setEditingTask(task); 
    setTaskFormOpen(true); 
  };
  const handleCreateTask = () => { 
    if (!canEditTasks) return;
    setEditingTask(null); 
    setTaskFormOpen(true); 
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!canEditTasks) return;
    if (!confirm("¿Estás seguro de eliminar esta tarea?")) return;
    try { await deleteTask.mutateAsync(taskId); toast.success("Tarea eliminada"); }
    catch { toast.error("Error al eliminar tarea"); }
  };

  const downloadSimplePDF = () => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.width;
    const dark = [40, 40, 50];
    const gray = [130, 130, 140];
    const line = [230, 230, 235];
    const primary = [139, 92, 246];

    doc.setFont('helvetica', 'bold').setFontSize(22).setTextColor(dark[0], dark[1], dark[2]);
    doc.text(project.name, 20, 25);
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(gray[0], gray[1], gray[2]);
    doc.text(`Reporte de Proyecto · ${new Date().toLocaleDateString('es-ES')}`, 20, 33);
    doc.setDrawColor(line[0], line[1], line[2]).line(20, 38, pw - 20, 38);

    doc.setFontSize(12).setFont('helvetica', 'bold').setTextColor(dark[0], dark[1], dark[2]).text('Resumen', 20, 52);
    const summaryData = [
        ['Cliente', project.client],
        ['Estado', statusInfo.label],
        ['Tarifa', `$${project.rate || 0}/hr`],
        ['Presupuesto', `$${((project.rate || 0) * project.hoursPool).toLocaleString()}`],
        ['Horas consumidas', `${displayHoursConsumed.toFixed(1)}h / ${project.hoursPool}h (${hoursPercentage}%)`],
        ['Tareas totales', tasks.length.toString()],
        ['Completadas', tasks.filter(t => t.status === 'Completed').length.toString()],
    ];
    autoTable(doc, {
        startY: 56,
        body: summaryData.map(([l, v]) => [l, v]),
        theme: 'plain', styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 0: { textColor: gray[0], fontStyle: 'normal' }, 1: { textColor: dark[0], fontStyle: 'bold', halign: 'right' } },
        margin: { left: 20 }, tableWidth: 180,
    });

    if (tasks.length > 0) {
        const ty = (doc as any).lastAutoTable.finalY + 12;
        doc.setFontSize(12).setFont('helvetica', 'bold').setTextColor(dark[0], dark[1], dark[2]).text('Tareas', 20, ty);
        autoTable(doc, {
            startY: ty + 6,
            head: [['Fecha', 'Descripción', 'Estado', 'Horas']],
            body: tasks.map(t => [
                t.start_time ? new Date(t.start_time).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) : '-',
                (t.description || '').substring(0, 35),
                t.status,
                // ✅ CORREGIDO: usar hours en lugar de duration_in_minutes
                `${(t.hours || 0).toFixed(1)}h`
            ]),
            theme: 'plain',
            headStyles: { fillColor: [250, 250, 252], textColor: dark[0], fontStyle: 'bold', fontSize: 8 },
            bodyStyles: { fontSize: 8, textColor: dark[0] },
            columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 70 }, 2: { halign: 'center' }, 3: { halign: 'right', fontStyle: 'bold' } },
            margin: { left: 20, right: 20 },
        });
    }

    const pages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i).setDrawColor(line[0], line[1], line[2]).line(20, 285, pw - 20, 285);
        doc.setFontSize(7).setTextColor(gray[0], gray[1], gray[2]).text(`HormiWatch · Página ${i} de ${pages}`, 20, 290);
    }
    doc.save(`${project.name}_Reporte.pdf`);
  };

  const downloadGraphicPDF = () => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.width;
    const dark = [40, 40, 50];
    const gray = [130, 130, 140];
    const line = [230, 230, 235];
    const primary = [139, 92, 246];
    const green = [16, 185, 129];
    const amber = [245, 158, 11];

    doc.setFont('helvetica', 'bold').setFontSize(22).setTextColor(dark[0], dark[1], dark[2]);
    doc.text(project.name, 20, 25);
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(gray[0], gray[1], gray[2]);
    doc.text(`Reporte Gráfico · ${new Date().toLocaleDateString('es-ES')}`, 20, 33);
    doc.setDrawColor(line[0], line[1], line[2]).line(20, 38, pw - 20, 38);

    doc.setFontSize(12).setFont('helvetica', 'bold').setTextColor(dark[0], dark[1], dark[2]).text('Progreso de Horas', 20, 52);
    doc.setFillColor(245, 245, 248);
    doc.roundedRect(20, 58, pw - 40, 14, 3, 3, 'F');
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.roundedRect(20, 58, ((pw - 40) * Math.min(hoursPercentage, 100)) / 100, 14, 3, 3, 'F');
    doc.setFontSize(10).setTextColor(255, 255, 255);
    doc.text(`${displayHoursConsumed.toFixed(1)}h / ${project.hoursPool}h (${hoursPercentage}%)`, 28, 67);
    doc.setTextColor(dark[0], dark[1], dark[2]);

    const completed = tasks.filter(t => t.status === 'Completed').length;
    const pending = tasks.filter(t => t.status === 'Pending').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const total = tasks.length;

    doc.setFontSize(12).setFont('helvetica', 'bold').text('Distribución de Tareas', 20, 92);
    const stats = [
        ['Completadas', completed.toString(), green],
        ['En Progreso', inProgress.toString(), primary],
        ['Pendientes', pending.toString(), amber],
        ['Total', total.toString(), dark],
    ];
    autoTable(doc, {
        startY: 98,
        body: stats.map(([l, v, c]) => [l, v]),
        theme: 'plain', styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 0: { textColor: gray[0] }, 1: { textColor: dark[0], fontStyle: 'bold', halign: 'right' } },
        margin: { left: 20 }, tableWidth: 180,
    });

    const ry = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(12).setFont('helvetica', 'bold').text('Resumen Financiero', 20, ry);
    autoTable(doc, {
        startY: ry + 6,
        body: [
            ['Tarifa por hora', `$${project.rate || 0}/hr`],
            ['Presupuesto total', `$${((project.rate || 0) * project.hoursPool).toLocaleString()}`],
            ['Horas consumidas', `${displayHoursConsumed.toFixed(1)}h`],
            ['Horas restantes', `${(project.hoursPool - displayHoursConsumed).toFixed(1)}h`],
        ],
        theme: 'plain', styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 0: { textColor: gray[0] }, 1: { textColor: dark[0], fontStyle: 'bold', halign: 'right' } },
        margin: { left: 20 }, tableWidth: 180,
    });

    const pages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i).setDrawColor(line[0], line[1], line[2]).line(20, 285, pw - 20, 285);
        doc.setFontSize(7).setTextColor(gray[0], gray[1], gray[2]).text(`HormiWatch · Página ${i} de ${pages}`, 20, 290);
    }
    doc.save(`${project.name}_Reporte_Grafico.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col bg-card border-border">
        <DialogHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-bold text-foreground">{project.name}</DialogTitle>
              <p className="text-muted-foreground">{project.client}</p>
            </div>
            <Badge variant="outline" className={cn("shrink-0", statusInfo.class)}>{statusInfo.label}</Badge>
          </div>
        </DialogHeader>

        <div className="rounded-xl bg-muted/50 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /><span className="font-medium">Progreso de Horas</span></div>
            <span className="text-sm font-semibold">{displayHoursConsumed.toFixed(1)}h / {project.hoursPool}h</span>
          </div>
          <Progress value={hoursPercentage} className="h-3 bg-muted" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{hoursPercentage}% consumido</span>
            <span>{(project.hoursPool - displayHoursConsumed).toFixed(1)}h restantes</span>
          </div>
        </div>

        <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50">
            <TabsTrigger value="details">Detalles</TabsTrigger>
            <TabsTrigger value="tasks">Tareas ({tasks.length})</TabsTrigger>
            <TabsTrigger value="reports">Reportes</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="details" className="m-0 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border bg-card p-4"><div className="flex items-center gap-2 text-muted-foreground mb-2"><DollarSign className="h-4 w-4" />Tarifa por Hora</div><p className="text-2xl font-bold">${project.rate || 0}/hr</p></div>
                <div className="rounded-xl border bg-card p-4"><div className="flex items-center gap-2 text-muted-foreground mb-2"><Clock className="h-4 w-4" />Presupuesto</div><p className="text-2xl font-bold">${((project.rate || 0) * project.hoursPool).toLocaleString()}</p></div>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" />Línea de Tiempo</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-muted-foreground">Inicio</p><p className="font-medium">{new Date(project.startDate || new Date().toISOString()).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}</p></div>
                  <div><p className="text-xs text-muted-foreground">Fin</p><p className="font-medium">{new Date(project.endDate).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}</p></div>
                </div>
              </div>
              {/* ✅ Equipo del Proyecto desde project_members */}
              <div className="rounded-xl border bg-card p-4">
                <h4 className="font-semibold mb-4 flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Equipo del Proyecto</h4>
<<<<<<< HEAD
=======
                
                {/* Líder */}
>>>>>>> 11069f104d1610e5c5ea848911ab81005acbe8e2
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Crown className="h-3 w-3 text-amber-500" /> Líder</p>
                  {project.teamLead.name !== "Sin líder" ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                      <Avatar className="h-10 w-10 ring-2 ring-amber-500/30">
                        <AvatarImage src={project.teamLead.avatar} />
                        <AvatarFallback className="bg-amber-500/10 text-amber-600 font-bold">
                          {project.teamLead.name?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div><p className="font-medium">{project.teamLead.name}</p><p className="text-xs text-amber-500">👑 Líder</p></div>
<<<<<<< HEAD
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No asignado</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Users className="h-3 w-3" /> Miembros</p>
                  {project.team.length > 0 ? (
                    <div className="space-y-2">
                      {project.team.map((m, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={m.avatar} />
                            <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">
                              {m.name?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{m.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {m.role === 'leader' ? '👑 Líder' : '👤 Miembro'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
=======
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No asignado</p>
                  )}
                </div>

                {/* Miembros */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Users className="h-3 w-3" /> Miembros</p>
                  {project.team.length > 0 ? (
                    <div className="space-y-2">
                      {project.team.map((m, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={m.avatar} />
                            <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">
                              {m.name?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{m.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {m.role === 'leader' ? '👑 Líder' : '👤 Miembro'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
>>>>>>> 11069f104d1610e5c5ea848911ab81005acbe8e2
                    <div className="text-center py-4 text-xs text-muted-foreground bg-muted/20 rounded-xl">
                      <Users className="h-6 w-6 mx-auto mb-1 opacity-30" />
                      No hay miembros asignados
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="m-0 space-y-3">
              {canEditTasks && (
                <div className="flex justify-end mb-4">
                  <Button size="sm" onClick={handleCreateTask}>
                    <Plus className="h-4 w-4 mr-1" />Nueva Tarea
                  </Button>
                </div>
              )}
              {tasks.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No hay tareas en este proyecto.</div>
              ) : (
                tasks.map((task, i) => {
                  const sd = taskStatusConfig[task.status] || taskStatusConfig.default;
                  const Icon = sd.icon;
                  return (
                    <div key={task.id} className="group flex items-center gap-4 p-4 rounded-xl border bg-card hover:shadow-card opacity-0 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                      <Icon className={cn("h-5 w-5 shrink-0", sd.class)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{task.description || "Sin descripción"}</p>
                          <Badge variant="secondary" className="text-[10px]">{task.services?.name}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />{task.technician?.full_name || "Sin asignar"}
                          <span>•</span>
                          {/* ✅ CORREGIDO: usar hours */}
                          <span>{(task.hours || 0).toFixed(1)}h</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant="outline" className={cn("text-xs", sd.class)}>{sd.label}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(task.start_time).toLocaleDateString("es-ES", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                      {canEditTasks && (
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditTask(task)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-red-500" onClick={() => handleDeleteTask(task.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="reports" className="m-0 space-y-4">
              <div className="rounded-xl border bg-card p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">Reporte PDF</h4>
                    <p className="text-sm text-muted-foreground mt-1">Resumen detallado de horas, tareas y rendimiento del equipo.</p>
                  </div>
                  <Button className="gap-2 shrink-0" onClick={downloadSimplePDF}>
                    <Download className="h-4 w-4" />Descargar
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="rounded-xl bg-muted/50 p-4">
                <h4 className="font-medium mb-2">Vista Previa</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 rounded-lg bg-card border"><p className="text-2xl font-bold">{tasks.length}</p><p className="text-xs text-muted-foreground">Total Tareas</p></div>
                  <div className="p-3 rounded-lg bg-card border"><p className="text-2xl font-bold text-success">{tasks.filter(t => t.status === "Completed").length}</p><p className="text-xs text-muted-foreground">Completadas</p></div>
                  <div className="p-3 rounded-lg bg-card border"><p className="text-2xl font-bold text-primary">{displayHoursConsumed.toFixed(1)}h</p><p className="text-xs text-muted-foreground">Horas Registradas</p></div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {canEditTasks && (
          <TaskFormModal open={taskFormOpen} onOpenChange={setTaskFormOpen} task={editingTask} projectId={project.id} />
        )}
      </DialogContent>
    </Dialog>
  );
}