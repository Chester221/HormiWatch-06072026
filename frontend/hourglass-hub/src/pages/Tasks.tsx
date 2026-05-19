import { useState } from "react";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Filter, Calendar as CalendarIcon, List as ListIcon, Loader2, FileText } from "lucide-react";
import { LogTimeModal } from "@/components/tasks/LogTimeModal";
import { TaskCalendar, type Task } from "@/components/tasks/TaskCalendar";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskEditModal } from "@/components/tasks/TaskEditModal";
import { toast } from "sonner";
import { useProjects } from "@/hooks/useProjects";
import { useServices } from "@/hooks/useServices";
import { useTasks, useCreateTasks, useDeleteTask, useUpdateTask } from "@/hooks/useTasks";
import { useAuth } from "@/hooks/useAuth";
import { useHolidays } from "@/hooks/useHolidays";
import { calculateTaskBreakdown } from "@/lib/hoursCalculator";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const Tasks = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [logTimeModalOpen, setLogTimeModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("list");
  const [calendarView, setCalendarView] = useState<"week" | "month">("week");
  const [projectFilter, setProjectFilter] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<any>(null);

  const { user } = useAuth();
  const { data: projectsList, isLoading: isLoadingProjects } = useProjects();
  const { data: servicesList = [] } = useServices();
  const { holidays } = useHolidays();
  const { data: tasksData, isLoading: isLoadingTasks, refetch: refetchTasks } = useTasks(projectFilter);

  const createTasksMutation = useCreateTasks();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // Si la hora fin es menor que la inicio, es del día siguiente
    if (endDate < startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }
    
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.round(diffHours * 10) / 10;
  };

  // 1. Crear Tarea
  const handleCreateTask = async (data: any) => {
    if (!user) return toast.error("Debes iniciar sesión para crear una tarea.");

    const dateStr = format(data.date, "yyyy-MM-dd");
    const startHour = parseInt(data.startTime.split(':')[0]);
    const endHour = parseInt(data.endTime.split(':')[0]);
    const isNextDay = endHour < startHour || (endHour === startHour && data.endTime <= data.startTime);

    const start_time = new Date(`${dateStr}T${data.startTime}:00`).toISOString();
    let end_time: string;
    if (isNextDay) {
      const nextDay = new Date(data.date);
      nextDay.setDate(nextDay.getDate() + 1);
      end_time = new Date(`${format(nextDay, "yyyy-MM-dd")}T${data.endTime}:00`).toISOString();
    } else {
      end_time = new Date(`${dateStr}T${data.endTime}:00`).toISOString();
    }

    const selectedService = servicesList?.find(s => s.id === data.serviceId);
    const hourlyRate = selectedService?.default_hourly_rate || 0;

    const holidaysList = (holidays.data || [])
      .filter(h => !h.is_working_day)
      .map(h => h.date);

    const breakdown = calculateTaskBreakdown(start_time, end_time, hourlyRate, holidaysList);

    const tasksToCreate = breakdown.days.map(day => ({
      project_id: data.projectId,
      service_id: data.serviceId,
      technician_id: user.id,
      start_time: `${day.date}T${data.startTime}:00`,
      end_time: `${day.date}T${data.endTime}:00`,
      description: data.description,
      status: data.completed ? 'Completed' : 'Pending',
      priority: 'Medium',
      applied_hourly_rate: hourlyRate,
      normal_hours: day.normalHours,
      overtime_hours: day.overtimeHours,
      normal_pay: day.normalPay,
      overtime_pay: day.overtimePay,
      total_pay: day.totalPay,
    }));

    createTasksMutation.mutate(tasksToCreate, {
      onSuccess: () => {
        const msgs: string[] = [];
        if (breakdown.days.length > 1) msgs.push(`Dividido en ${breakdown.days.length} días`);
        if (breakdown.hasOvertime) msgs.push('Horas extra ×1.5');
        if (breakdown.hasHoliday) msgs.push('Feriado ×2');
        if (breakdown.hasWeekend) msgs.push('Finde ×1.5');
        
        toast.success(`Tarea registrada${msgs.length ? ' · ' + msgs.join(' · ') : ''}`);
        toast.info(`Total: ${breakdown.grandTotalHours}h · $${breakdown.grandTotalPay.toFixed(2)}`, { duration: 5000 });
        
        setLogTimeModalOpen(false);
        refetchTasks();
      },
      onError: (error: any) => {
        console.error("Error al crear tarea:", error);
        toast.error(`Error: ${error.message}`);
      },
    });
  };

  // 2. Eliminar Tarea
  const handleDeleteTask = (taskId: string) => {
    setTaskToDelete(taskId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTask = async () => {
  if (!taskToDelete) return;
  
  deleteTaskMutation.mutate(taskToDelete, {
    onSuccess: (data) => {
      // Verificar si realmente se eliminó algo
      if (!data) {
        toast.error("No tienes permisos para eliminar esta tarea");
        setDeleteDialogOpen(false);
        setTaskToDelete(null);
        return;
      }
      toast.success("Tarea eliminada correctamente");
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
      refetchTasks();
    },
    onError: (error: any) => {
      console.error("Error al eliminar:", error);
      
      // Mensajes específicos según el error
      if (error.message?.includes('403') || error.message?.includes('permission')) {
        toast.error("No tienes permisos para eliminar esta tarea");
      } else if (error.message?.includes('row-level security')) {
        toast.error("No tienes permisos para eliminar esta tarea. Solo puedes eliminar tus propias tareas.");
      } else {
        toast.error(`Error al eliminar: ${error.message || 'Error desconocido'}`);
      }
      
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    },
  });
};

  // 3. Actualizar Tarea
  const handleUpdateTask = (updatedData: any) => {
  if (!taskToEdit) return;
  
  // Si la tarea ya está completada, no permitir cambiar a otro estado
  if (taskToEdit.status === 'Completed' && updatedData.status && updatedData.status !== 'Completed') {
    toast.error("No puedes cambiar el estado de una tarea completada. Crea una nueva tarea para registrar más horas.");
    return;
  }
  
  updateTaskMutation.mutate({
    id: taskToEdit.id,
    data: updatedData
  }, {
    onSuccess: () => {
      toast.success("Tarea actualizada correctamente");
      setEditModalOpen(false);
      setTaskToEdit(null);
      refetchTasks();
    },
    onError: (error: any) => {
      toast.error(`Error al actualizar: ${error.message}`);
    }
  });
};

  // 4. Editar Tarea
  const handleEditTask = (task: Task) => {
    const originalTask = tasksData?.find(t => String(t.id) === task.id);
    if (originalTask) {
      setTaskToEdit(originalTask);
      setEditModalOpen(true);
    } else {
      toast.error("No se pudo encontrar la tarea para editar");
    }
  };

  // 5. Exportar PDF
  const exportTasksPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setTextColor(139, 92, 246);
    doc.text('HormiWatch - Reporte de Tareas', 20, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, 30);
    doc.text(`Total: ${filteredTasks.length} tareas · ${totalHours.toFixed(1)}h · $${filteredTasks.reduce((acc, task) => acc + ((task as any).total_pay || 0), 0).toFixed(2)}`, 20, 38);
    
    const tableData = filteredTasks.map(task => {
      const t = task as any;
      return [
        task.date,
        task.startTime,
        task.endTime,
        task.project || 'N/A',
        task.serviceType || 'N/A',
        task.completed ? 'Sí' : 'No',
        `${task.hours}h`,
        t.normal_hours > 0 ? `${t.normal_hours}h` : '-',
        t.overtime_hours > 0 ? `${t.overtime_hours}h` : '-',
        t.total_pay > 0 ? `$${t.total_pay.toFixed(2)}` : '-',
      ];
    });
    
    autoTable(doc, {
      startY: 45,
      head: [['Fecha', 'Inicio', 'Fin', 'Proyecto', 'Servicio', 'OK', 'Total', 'Normal', 'Extra', 'Pago']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246], fontSize: 8 },
      bodyStyles: { fontSize: 7 },
    });
    
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`HormiWatch - Página ${i} de ${pageCount}`, 20, 285);
    }
    
    doc.save(`Tareas_HormiWatch_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  // Lógica de Filtrado
  const tasks: Task[] = (tasksData || []).map(t => {
  const taskWithExtras = t as any;
  return {
    id: String(t.id),
    title: t.description || t.title || "Tarea sin descripción",
    date: t.start_time?.split('T')[0] || new Date().toISOString().split('T')[0],
    startTime: t.start_time?.split('T')[1]?.substring(0, 5) || "00:00",
    endTime: t.end_time?.split('T')[1]?.substring(0, 5) || "00:00",
    project: t.projects?.name || "General",
    serviceType: t.services?.name || "General",
    completed: t.status === 'Completed',
    hours: calculateDuration(t.start_time, t.end_time),
    normal_hours: taskWithExtras.normal_hours || 0,
    overtime_hours: taskWithExtras.overtime_hours || 0,
    normal_pay: taskWithExtras.normal_pay || 0,       // ← AGREGAR
    overtime_pay: taskWithExtras.overtime_pay || 0,   // ← AGREGAR
    total_pay: taskWithExtras.total_pay || 0,
    isHoliday: taskWithExtras.is_holiday || false,
  };
});

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.serviceType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.project?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const totalHours = filteredTasks.reduce((acc, task) => acc + task.hours, 0);
  const completedTasksCount = filteredTasks.filter(t => t.completed).length;

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between opacity-0 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Tareas</h1>
          <p className="mt-1 text-muted-foreground">Registra y gestiona tus horas de trabajo</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={exportTasksPDF}>
            <FileText className="h-4 w-4" />
            Exportar PDF
          </Button>
          <Button className="gap-2 shadow-glow" onClick={() => setLogTimeModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Registrar Tiempo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 opacity-0 animate-fade-in" style={{ animationDelay: "100ms" }}>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Tareas</p>
          <p className="text-2xl font-bold text-foreground">{filteredTasks.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground mb-1">Horas Registradas</p>
          <p className="text-2xl font-bold text-primary">{totalHours.toFixed(1)}h</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground mb-1">Completadas</p>
          <p className="text-2xl font-bold text-green-500">{completedTasksCount}</p>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between opacity-0 animate-fade-in" style={{ animationDelay: "150ms" }}>
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar tareas..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-muted/50 border-transparent focus:border-primary focus:bg-card" />
          </div>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full sm:w-[200px] bg-muted/50 border-transparent">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filtrar por proyecto" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">Todos los Proyectos</SelectItem>
              {projectsList?.map((project) => (
                <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "calendar" | "list")}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="calendar" className="gap-2 data-[state=active]:bg-card"><CalendarIcon className="h-4 w-4" />Calendario</TabsTrigger>
              <TabsTrigger value="list" className="gap-2 data-[state=active]:bg-card"><ListIcon className="h-4 w-4" />Lista</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="opacity-0 animate-fade-in" style={{ animationDelay: "200ms" }}>
        {isLoadingTasks || isLoadingProjects ? (
          <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            {viewMode === "calendar" ? (
              <TaskCalendar tasks={filteredTasks} view={calendarView} onTaskClick={(task) => handleEditTask(task)} />
            ) : (
              <TaskList tasks={filteredTasks} onTaskClick={(task) => handleEditTask(task)} onEditTask={(task) => handleEditTask(task)} onDeleteTask={(taskId) => handleDeleteTask(taskId)} />
            )}
          </>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Tarea</AlertDialogTitle>
            <AlertDialogDescription>¿Estás seguro de que deseas eliminar esta tarea?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTask} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TaskEditModal task={taskToEdit} open={editModalOpen} onOpenChange={setEditModalOpen} onSuccess={handleUpdateTask} />
      <LogTimeModal open={logTimeModalOpen} onOpenChange={setLogTimeModalOpen} projects={projectsList || []} onSubmit={handleCreateTask} />
    </DashboardLayout>
  );
};

export default Tasks;