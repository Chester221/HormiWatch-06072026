import { useState } from "react";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, Filter, Calendar as CalendarIcon, List as ListIcon, Loader2, FileText, FolderKanban } from "lucide-react";
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
import { useClientsWithContacts } from "@/hooks/useClientes";

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
  const { data: clients = [] } = useClientsWithContacts();

  const { user, profile } = useAuth();
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
    if (endDate < startDate) endDate.setDate(endDate.getDate() + 1);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.round(diffHours * 10) / 10;
  };

  const handleCreateTask = async (data: any) => {
    if (!user) return toast.error("Debes iniciar sesión para crear una tarea.");
    const dateStr = format(data.date, "yyyy-MM-dd");
    const startHour = parseInt(data.startTime.split(':')[0]);
    const endHour = parseInt(data.endTime.split(':')[0]);
    const isNextDay = endHour < startHour || (endHour === startHour && data.endTime <= data.startTime);
    const start_time = new Date(`${dateStr}T${data.startTime}:00`).toISOString();
    let end_time: string;
    if (isNextDay) { const nextDay = new Date(data.date); nextDay.setDate(nextDay.getDate() + 1); end_time = new Date(`${format(nextDay, "yyyy-MM-dd")}T${data.endTime}:00`).toISOString(); }
    else { end_time = new Date(`${dateStr}T${data.endTime}:00`).toISOString(); }
    const selectedService = servicesList?.find(s => s.id === data.serviceId);
    const hourlyRate = selectedService?.default_hourly_rate || 0;
    const holidaysList = (holidays.data || []).filter(h => !h.is_working_day).map(h => h.date);
    const breakdown = calculateTaskBreakdown(start_time, end_time, hourlyRate, holidaysList);
    const tasksToCreate = breakdown.days.map(day => ({
      project_id: data.projectId, service_id: data.serviceId, technician_id: user.id,
      start_time: `${day.date}T${data.startTime}:00`, end_time: `${day.date}T${data.endTime}:00`,
      description: data.description, status: data.completed ? 'Completed' : 'Pending',
      priority: 'Medium', applied_hourly_rate: hourlyRate,
      normal_hours: day.normalHours, overtime_hours: day.overtimeHours,
      normal_pay: day.normalPay, overtime_pay: day.overtimePay, total_pay: day.totalPay,
    }));
    createTasksMutation.mutate(tasksToCreate, { onSuccess: () => { toast.success('Tarea registrada'); setLogTimeModalOpen(false); refetchTasks(); }, onError: (error: any) => toast.error(`Error: ${error.message}`) });
  };

  const handleDeleteTask = (taskId: string) => { setTaskToDelete(taskId); setDeleteDialogOpen(true); };
  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    deleteTaskMutation.mutate(taskToDelete, { onSuccess: () => { toast.success("Tarea eliminada"); setDeleteDialogOpen(false); setTaskToDelete(null); refetchTasks(); }, onError: (error: any) => toast.error(`Error: ${error.message || 'No tienes permisos'}`) });
  };

  const handleUpdateTask = (updatedData: any) => {
    if (!taskToEdit) return;
    updateTaskMutation.mutate({ id: taskToEdit.id, data: updatedData }, { onSuccess: () => { toast.success("Tarea actualizada"); setEditModalOpen(false); setTaskToEdit(null); refetchTasks(); }, onError: (error: any) => toast.error(`Error: ${error.message}`) });
  };

  const handleEditTask = (task: Task) => {
    const original = tasksData?.find(t => String(t.id) === task.id);
    if (original) { setTaskToEdit(original); setEditModalOpen(true); } else toast.error("No se pudo encontrar la tarea");
  };

  const tasks: Task[] = (tasksData || []).map(t => {
    const tx = t as any;
    return { id: String(t.id), title: t.description || t.title || "Tarea sin descripción", date: t.start_time?.split('T')[0] || '', startTime: t.start_time?.split('T')[1]?.substring(0,5) || '', endTime: t.end_time?.split('T')[1]?.substring(0,5) || '', project: t.projects?.name || "General", serviceType: t.services?.name || "General", completed: t.status === 'Completed', hours: calculateDuration(t.start_time, t.end_time), normal_hours: tx.normal_hours || 0, overtime_hours: tx.overtime_hours || 0, normal_pay: tx.normal_pay || 0, overtime_pay: tx.overtime_pay || 0, total_pay: tx.total_pay || 0, isHoliday: tx.is_holiday || false };
  });
  const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.serviceType.toLowerCase().includes(searchQuery.toLowerCase()) || t.project?.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalHours = filteredTasks.reduce((acc, t) => acc + t.hours, 0);
  const completedTasksCount = filteredTasks.filter(t => t.completed).length;

  // ═══════════════ EXPORTACIÓN EXCEL ═══════════════

  const FILA_INICIO = 16;
  const FILA_FIN = 44;
  const TAREAS_POR_PAGINA = FILA_FIN - FILA_INICIO + 1; // 29

  const exportExcel = async (
    tasksToExport: Task[],
    projectName?: string,
    paginaActual?: number,
    totalPaginas?: number,
    nombreZip?: string
  ): Promise<{ blob: Blob; nombre: string } | void> => {
    const ExcelJS = await import('exceljs');
    const response = await fetch('https://ldjuetrvmvmrudtzypyr.supabase.co/storage/v1/object/public/logos/Plantilla.xlsx');
    const arrayBuffer = await response.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    const sheet = workbook.getWorksheet(1);
    sheet.name = 'Bytes Creativos';

    const setVal = (ref: string, val: any) => { const cell = sheet.getCell(ref); cell.value = val; if (cell.font?.bold) cell.font = { ...cell.font, bold: false }; cell.alignment = { ...cell.alignment, vertical: 'middle', horizontal: 'left' }; };
    const userName = profile?.full_name || user?.email?.split('@')[0] || 'N/A';
    const firstTask = tasksToExport[0];
    const projData = projectsList?.find((p: any) => p.name === (firstTask.project || 'General'));
    const clientId = projData?.client_id;
    const clientData = clientId ? clients.find((c: any) => c.id === clientId) || {} : {};
    const contactData = (clientData as any)?.contacts?.[0] || {};

    const pagActual = paginaActual || 1;
    const pagTotal = totalPaginas || 1;

    setVal('L1', 'HMW-' + format(new Date(), 'yyyyMMdd-HHmmss'));
    setVal('L2', format(new Date(), 'dd/MM/yyyy'));
    setVal('L3', `${pagActual} de ${pagTotal}`);
    setVal('C6', clientData.name || projectName || firstTask.project || 'General');
    setVal('I6', contactData.name || userName);
    setVal('C7', clientData.ruc || clientData.code || 'N/A');
    setVal('I7', contactData.position || 'N/A');
    setVal('C8', clientData.department || 'N/A');
    setVal('I8', contactData.phone || 'N/A');
    setVal('D10', clientData.channel || 'Digital');
    setVal('J10', firstTask.serviceType || 'N/A');
    setVal('D11', userName);

    tasksToExport.forEach((task, i) => {
      const t = task as any; 
      const row = FILA_INICIO + i; 
      if (row > FILA_FIN) return;
      
      const fecha = task.date;
      const diaNumero = new Date(fecha + 'T12:00:00').getDay();
      
      const tipo = t.isHoliday ? 'DF' 
        : diaNumero === 0 ? 'DF' 
        : diaNumero === 6 ? 'EH' 
        : t.overtime_hours > 0 ? 'EH' 
        : 'HO';
      
      const factor = tipo === 'DF' ? 2 : tipo === 'EH' ? 1.5 : 1;
      const hDef = ((t.normal_hours * factor + t.overtime_hours * factor) || 0).toFixed(1);
      
      setVal(`B${row}`, t.description || task.title || '');
      setVal(`D${row}`, task.date);
      setVal(`E${row}`, task.startTime);
      setVal(`F${row}`, task.endTime);
      setVal(`G${row}`, tipo);
      setVal(`H${row}`, task.hours.toFixed(1));
      setVal(`I${row}`, hDef);
      setVal(`J${row}`, task.completed ? 'C' : '');
      setVal(`K${row}`, !task.completed ? 'P' : '');
      setVal(`L${row}`, t.notes || '');

      ['D', 'E', 'F', 'G', 'H', 'I', 'J'].forEach(col => {
        const cell = sheet.getCell(`${col}${row}`);
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      sheet.getCell(`G${row}`).font = { name: 'Calibri', size: 12 };
    });

    const totHrs = tasksToExport.reduce((a, t) => a + t.hours, 0);
    sheet.getCell('I45').value = totHrs.toFixed(1);
    setVal('C47', tasksToExport[0]?.notes || 'Ninguna');

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    if (nombreZip && totalPaginas && totalPaginas > 1) {
      return { blob, nombre: `${nombreZip}_p${pagActual}.xlsx` };
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;

    let nombreArchivo = '';
    if (tasksToExport.length === 1) {
      nombreArchivo = (tasksToExport[0].title || 'TAREA').replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').trim().replace(/\s+/g, '_').toUpperCase();
    } else if (projectName) {
      nombreArchivo = `TAREAS_${projectName.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').trim().replace(/\s+/g, '_').toUpperCase()}`;
    } else {
      nombreArchivo = `TAREAS_TODAS_${format(new Date(), 'yyyyMMdd')}`;
    }

    a.download = `${nombreArchivo}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Excel exportado correctamente');
  };

  const exportarPorLotes = async (tasksToExport: Task[], projectName?: string) => {
    const totalPaginas = Math.ceil(tasksToExport.length / TAREAS_POR_PAGINA);

    if (totalPaginas === 0) {
      toast.error('No hay tareas para exportar');
      return;
    }

    let nombreBase = '';
    if (projectName) {
      nombreBase = `TAREAS_${projectName.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').trim().replace(/\s+/g, '_').toUpperCase()}`;
    } else {
      nombreBase = `TAREAS_TODAS_${format(new Date(), 'yyyyMMdd')}`;
    }

    if (totalPaginas === 1) {
      await exportExcel(tasksToExport, projectName, 1, 1);
      return;
    }

    toast.info(`Generando ZIP con ${totalPaginas} archivos...`);

    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    for (let pagina = 1; pagina <= totalPaginas; pagina++) {
      const inicio = (pagina - 1) * TAREAS_POR_PAGINA;
      const fin = inicio + TAREAS_POR_PAGINA;
      const lote = tasksToExport.slice(inicio, fin);

      const resultado = await exportExcel(lote, projectName, pagina, totalPaginas, nombreBase);
      if (resultado) {
        zip.file(resultado.nombre, resultado.blob);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombreBase}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`ZIP descargado con ${totalPaginas} archivos`);
  };

  const handleExportAllExcel = () => {
    if (filteredTasks.length === 0) { toast.error('No hay tareas'); return; }
    exportarPorLotes(filteredTasks);
  };

  const handleExportByProjectExcel = (projectId: string, projectName: string) => {
    const projectTasks = filteredTasks.filter(t => {
      const o = tasksData?.find(td => String(td.id) === t.id);
      return (o as any)?.project_id === projectId;
    });
    if (projectTasks.length === 0) { toast.error(`No hay tareas de "${projectName}"`); return; }
    exportarPorLotes(projectTasks, projectName);
  };

  const handleExportSingleExcel = (task: Task) => exportExcel([task]);

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between opacity-0 animate-fade-in">
        <div><h1 className="text-3xl font-bold">Tareas</h1><p className="text-muted-foreground">Registra y gestiona tus horas de trabajo</p></div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" className="gap-2"><FileText className="h-4 w-4" />Exportar</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border w-56">
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={handleExportAllExcel}><FileText className="h-4 w-4" /> Exportar Todas las Tareas</DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer gap-2"><FolderKanban className="h-4 w-4" /> Exportar por Proyecto</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="bg-card border-border w-48">
                  {projectsList?.map((p: any) => <DropdownMenuItem key={p.id} className="cursor-pointer gap-2 text-xs" onClick={() => handleExportByProjectExcel(p.id, p.name)}>{p.name}</DropdownMenuItem>)}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button className="gap-2 shadow-glow" onClick={() => setLogTimeModalOpen(true)}><Plus className="h-4 w-4" />Registrar Tiempo</Button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Total Tareas</p><p className="text-2xl font-bold">{filteredTasks.length}</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Horas Registradas</p><p className="text-2xl font-bold text-primary">{totalHours.toFixed(1)}h</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Completadas</p><p className="text-2xl font-bold text-green-500">{completedTasksCount}</p></div>
      </div>
      <div className="mb-6 flex gap-4">
        <div className="relative max-w-md flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" /><Input placeholder="Buscar tareas..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-muted/50" /></div>
        <Select value={projectFilter} onValueChange={setProjectFilter}><SelectTrigger className="w-[200px] bg-muted/50"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Filtrar" /></SelectTrigger><SelectContent>{[{id:'all',name:'Todos'},...(projectsList||[])].map(p=><SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
      </div>
      {isLoadingTasks ? <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div> : viewMode === "calendar" ? <TaskCalendar tasks={filteredTasks} view={calendarView} onTaskClick={handleEditTask} /> : <TaskList tasks={filteredTasks} onTaskClick={handleEditTask} onEditTask={handleEditTask} onDeleteTask={handleDeleteTask} onExportPDF={handleExportSingleExcel} />}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminar Tarea</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteTask} className="bg-destructive">Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <TaskEditModal task={taskToEdit} open={editModalOpen} onOpenChange={setEditModalOpen} onSuccess={handleUpdateTask} />
      <LogTimeModal open={logTimeModalOpen} onOpenChange={setLogTimeModalOpen} projects={projectsList || []} onSubmit={handleCreateTask} />
    </DashboardLayout>
  );
};

export default Tasks;