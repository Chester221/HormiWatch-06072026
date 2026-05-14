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
import { Plus, Search, Filter, Calendar as CalendarIcon, List as ListIcon, Loader2 } from "lucide-react";
import { LogTimeModal } from "@/components/tasks/LogTimeModal";
import { TaskCalendar, type Task } from "@/components/tasks/TaskCalendar";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskEditModal } from "@/components/tasks/TaskEditModal";
import { toast } from "sonner";
import { useProjects } from "@/hooks/useProjects";
import { useServices } from "@/hooks/useServices";
import { useTasks, useCreateTask, useDeleteTask, useUpdateTask, type CreateTaskData as NewTask } from "@/hooks/useTasks";
import { useAuth } from "@/hooks/useAuth";
import { useHolidays } from "@/hooks/useHolidays";

const Tasks = () => {
  // Filtros y UI
  const [searchQuery, setSearchQuery] = useState("");
  const [logTimeModalOpen, setLogTimeModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("list");
  const [calendarView, setCalendarView] = useState<"week" | "month">("week");
  const [projectFilter, setProjectFilter] = useState("all");

  // Estado para eliminar
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  // Estado para editar
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<any>(null);

  // --- Data Fetching con Hooks de Supabase ---
  const { user } = useAuth();
  const { data: projectsList, isLoading: isLoadingProjects } = useProjects();
  const { data: servicesList = [] } = useServices();

  const { holidays } = useHolidays();
  const { data: tasksData, isLoading: isLoadingTasks, refetch: refetchTasks } = useTasks(projectFilter);

  // --- Mutaciones para CUD (Create, Update, Delete) ---
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  // Helper: Calcular horas entre dos timestamps ISO
  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.round(diffHours * 10) / 10;
  };

  // 1. Crear Tarea
  const handleCreateTask = async (data: any) => {
    if (!user) return toast.error("Debes iniciar sesión para crear una tarea.");

    const dateStr = format(data.date, "yyyy-MM-dd");
    const start_time = new Date(`${dateStr}T${data.startTime}:00`).toISOString();
    const end_time = new Date(`${dateStr}T${data.endTime}:00`).toISOString();

    const selectedService = servicesList?.find(s => s.id === data.serviceId);

    const isHoliday = holidays.data?.some(h => h.date === dateStr && !h.is_working_day);
    let hourlyRate = selectedService?.default_hourly_rate || 0;

    if (isHoliday) {
      hourlyRate *= 2;
      console.log("Aplicando tarifa festiva (x2)");
    }

    const payload: NewTask = {
      project_id: data.projectId,
      service_id: data.serviceId,
      technician_id: user.id,
      start_time,
      end_time,
      description: data.description,
      status: data.completed ? 'Completed' : 'Pending',
      priority: 'Medium',
      applied_hourly_rate: hourlyRate,
    };

    createTaskMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Tarea registrada correctamente");
        if (isHoliday) {
          toast.info("Se aplicó tarifa festiva (x2) automáticamente.", { duration: 4000 });
        }
        setLogTimeModalOpen(false);
        refetchTasks();
      },
      onError: (error: any) => {
        console.error("Error detallado al crear tarea:", error);
        toast.error(`Error al crear la tarea: ${error.message || 'Error desconocido'}`);
        if (error.code === '403') {
          toast.error("Permiso denegado (403). Verifica tu rol de usuario.");
        }
      },
    });
  };

  // 2. Eliminar Tarea
  const handleDeleteTask = (taskId: string) => {
    console.log("=== handleDeleteTask ===");
    console.log("ID recibido:", taskId);
    console.log("Tipo:", typeof taskId);
    setTaskToDelete(taskId);
    setDeleteDialogOpen(true);
  };

  // Eliminar tarea - MODIFICAR ESTA PARTE
const confirmDeleteTask = async () => {
  if (!taskToDelete) return;
  console.log("=== confirmDeleteTask ===");
  console.log("Eliminando ID:", taskToDelete);
  
  deleteTaskMutation.mutate(taskToDelete, {
    onSuccess: () => {
      toast.success("Tarea eliminada correctamente");
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
      // En lugar de refetchTasks, forzar recarga manual
      window.location.reload();
    },
    onError: (error: any) => {
      console.error("Error al eliminar:", error);
      toast.error(`Error: ${error.message}`);
    },
  });
};

// Actualizar tarea - MODIFICAR ESTA PARTE
const handleUpdateTask = (updatedData: any) => {
  if (!taskToEdit) return;
  
  updateTaskMutation.mutate({
    id: taskToEdit.id,
    data: updatedData
  }, {
    onSuccess: () => {
      toast.success("Tarea actualizada correctamente");
      setEditModalOpen(false);
      setTaskToEdit(null);
      // En lugar de refetchTasks, forzar recarga manual
      window.location.reload();
    },
    onError: (error: any) => {
      console.error("Error al actualizar tarea:", error);
      toast.error(`Error al actualizar: ${error.message}`);
    }
  });
};

  // 3. Editar Tarea
  const handleEditTask = (task: Task) => {
    console.log("=== handleEditTask ===");
    console.log("Tarea a editar:", task);
    const originalTask = tasksData?.find(t => String(t.id) === task.id);
    if (originalTask) {
      setTaskToEdit(originalTask);
      setEditModalOpen(true);
    } else {
      toast.error("No se pudo encontrar la tarea para editar");
    }
  };

  // 4. Actualizar Tarea después de editar
  const handleUpdateTask = (updatedData: any) => {
    if (!taskToEdit) return;
    
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
        console.error("Error al actualizar tarea:", error);
        toast.error(`Error al actualizar: ${error.message}`);
      }
    });
  };

  // Lógica de Filtrado
  const tasks: Task[] = (tasksData || []).map(t => {
    console.log("=== Mapeando tarea ===");
    console.log("t completo:", t);
    console.log("t.id:", t.id);
    console.log("t.title:", t.title);
    
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
      {/* Encabezado */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between opacity-0 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Tareas</h1>
          <p className="mt-1 text-muted-foreground">
            Registra y gestiona tus horas de trabajo
          </p>
        </div>
        <Button className="gap-2 shadow-glow" onClick={() => setLogTimeModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Registrar Tiempo
        </Button>
      </div>

      {/* Tarjetas de Estadísticas */}
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

      {/* Filtros y Selector de Vista */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between opacity-0 animate-fade-in" style={{ animationDelay: "150ms" }}>
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar tareas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 border-transparent focus:border-primary focus:bg-card"
            />
          </div>

          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full sm:w-[200px] bg-muted/50 border-transparent">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filtrar por proyecto" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">Todos los Proyectos</SelectItem>
              {projectsList?.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "calendar" | "list")}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="calendar" className="gap-2 data-[state=active]:bg-card">
                <CalendarIcon className="h-4 w-4" />
                Calendario
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-2 data-[state=active]:bg-card">
                <ListIcon className="h-4 w-4" />
                Lista
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {viewMode === "calendar" && (
            <Tabs value={calendarView} onValueChange={(v) => setCalendarView(v as "week" | "month")}>
              <TabsList className="bg-muted/50">
                <TabsTrigger value="week" className="data-[state=active]:bg-card">Semana</TabsTrigger>
                <TabsTrigger value="month" className="data-[state=active]:bg-card">Mes</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="opacity-0 animate-fade-in" style={{ animationDelay: "200ms" }}>
        {isLoadingTasks || isLoadingProjects ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {viewMode === "calendar" ? (
              <TaskCalendar
                tasks={filteredTasks}
                view={calendarView}
                onTaskClick={(task) => handleEditTask(task)}
              />
            ) : (
              <TaskList
                tasks={filteredTasks}
                onTaskClick={(task) => handleEditTask(task)}
                onEditTask={(task) => handleEditTask(task)}
                onDeleteTask={(taskId) => handleDeleteTask(taskId)}
              />
            )}
          </>
        )}
      </div>

      {/* Diálogo de Confirmación de Borrado */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Tarea</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar esta tarea? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTask}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal para Editar Tarea */}
      <TaskEditModal
        task={taskToEdit}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSuccess={() => {
          refetchTasks();
          toast.success("Tarea actualizada correctamente");
        }}
      />

      {/* Modal para Registrar Tiempo */}
      <LogTimeModal
        open={logTimeModalOpen}
        onOpenChange={setLogTimeModalOpen}
        projects={projectsList || []}
        onSubmit={handleCreateTask}
      />
    </DashboardLayout>
  );
};

export default Tasks;