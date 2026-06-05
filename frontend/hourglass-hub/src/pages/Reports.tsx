import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Plus, Search, X, Download,
  Calendar as CalendarIcon, Clock, CheckCircle2, Circle, Loader2,
  Users, FolderKanban, User, Video, Sun, Moon, DollarSign,
  Briefcase, AlertCircle, ClipboardList
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase/client";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

export default function Reports() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedMember, setSelectedMember] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [showDayPanel, setShowDayPanel] = useState(false);
  const [meetings, setMeetings] = useState<any[]>([]);

  const [meetingForm, setMeetingForm] = useState({
    open: false, title: "", description: "", date: "", startTime: "09:00", endTime: "10:00",
    clientName: "", projectId: "",
    attendees: [] as { user_id?: string; name: string; email: string; is_external: boolean }[],
  });

  const { data: tasks = [], isLoading } = useTasks();
  const { data: projects = [] } = useProjects();
  const { data: members = [] } = useTeamMembers();
  const { profile } = useAuth();

  const fetchMeetings = async () => {
    const { data } = await supabase.from('meetings').select('*, meeting_attendees(*)').order('created_at', { ascending: false });
    setMeetings(data || []);
  };

  useEffect(() => { fetchMeetings(); }, []);

  const filteredTasks = tasks.filter(task => {
    const mp = selectedProject === "all" || (task as any).project_id === selectedProject;
    const mm = selectedMember === "all" || (task as any).technician_id === selectedMember;
    const s = searchQuery.toLowerCase();
    const ms = !searchQuery || 
      (task.description || "").toLowerCase().includes(s) ||
      (task.projects?.name || "").toLowerCase().includes(s) ||
      (task.technician?.full_name || "").toLowerCase().includes(s);
    return mp && mm && ms;
  });

  const monthStart = startOfMonth(currentDate);
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const startDate = viewMode === "month" ? startOfWeek(monthStart, { weekStartsOn: 1 }) : weekStart;
  const endDate = viewMode === "month" ? endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }) : weekEnd;

  const days: Date[] = [];
  let day = startDate;
  while (day <= endDate) { days.push(day); day = addDays(day, 1); }

  const getTasksForDay = (d: Date) => filteredTasks.filter(t => {
    const td = t.start_time ? parseISO(t.start_time) : null;
    return td && isSameDay(td, d);
  });

  const getMeetingsForDay = (d: Date) => meetings.filter(m => m.date === format(d, "yyyy-MM-dd"));

  const selectedDayTasks = selectedDay ? getTasksForDay(selectedDay) : [];
  const selectedDayMeetings = selectedDay ? getMeetingsForDay(selectedDay) : [];

  const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    "Completed": { label: "Completada", color: "text-emerald-500", bg: "bg-emerald-500/10", icon: CheckCircle2 },
    "In Progress": { label: "En Progreso", color: "text-blue-500", bg: "bg-blue-500/10", icon: Clock },
    "Pending": { label: "Pendiente", color: "text-[#00BFFF]", bg: "bg-[#00BFFF]/10", icon: ClipboardList },
    "On Hold": { label: "En Espera", color: "text-orange-500", bg: "bg-orange-500/10", icon: AlertCircle },
  };

  const getStatus = (s: string) => statusConfig[s] || statusConfig["Pending"];

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    viewMode === "month" ? d.setMonth(d.getMonth() + dir) : d.setDate(d.getDate() + dir * 7);
    setCurrentDate(d);
  };

  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h1 className="text-3xl font-bold text-foreground">Calendario</h1><p className="text-muted-foreground">{filteredTasks.length} tareas · {meetings.length} reuniones</p></div>
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
            <Button variant={viewMode === "month" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("month")} className="text-xs h-8">Mes</Button>
            <Button variant={viewMode === "week" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("week")} className="text-xs h-8">Semana</Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative w-56"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar tarea, proyecto, técnico..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-muted/50 h-9 text-sm rounded-xl" /></div>
          <Select value={selectedProject} onValueChange={setSelectedProject}><SelectTrigger className="w-44 h-9 text-sm bg-muted/50 rounded-xl"><FolderKanban className="h-3.5 w-3.5 mr-2" /><SelectValue placeholder="Proyecto" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los proyectos</SelectItem>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
          <Select value={selectedMember} onValueChange={setSelectedMember}><SelectTrigger className="w-44 h-9 text-sm bg-muted/50 rounded-xl"><Users className="h-3.5 w-3.5 mr-2" /><SelectValue placeholder="Miembro" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los miembros</SelectItem>{members.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>)}</SelectContent></Select>
          {(selectedProject !== "all" || selectedMember !== "all" || searchQuery) && <Button variant="ghost" size="sm" onClick={() => { setSelectedProject("all"); setSelectedMember("all"); setSearchQuery(""); }} className="rounded-xl"><X className="h-4 w-4 mr-1" /> Limpiar</Button>}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => navigate(-1)}><ChevronLeft className="h-5 w-5" /></Button><h2 className="text-xl font-bold min-w-[220px] text-center capitalize">{viewMode === "month" ? format(currentDate, "MMMM yyyy", { locale: es }) : `${format(weekStart, "d MMM", { locale: es })} - ${format(weekEnd, "d MMM yyyy", { locale: es })}`}</h2><Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => navigate(1)}><ChevronRight className="h-5 w-5" /></Button></div>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setCurrentDate(new Date())}>Hoy</Button>
        </div>

        <div className="flex gap-4">
          <div className={cn("flex-1 transition-all", showDayPanel && "lg:w-[calc(100%-340px)]")}>
            <div className="grid grid-cols-7 rounded-2xl overflow-hidden border border-border/50 shadow-sm">
              {dayNames.map(n => <div key={n} className="bg-muted/30 p-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border/30">{n}</div>)}
              {days.map((date, i) => {
                const dayTasks = getTasksForDay(date);
                const dayMeetings = getMeetingsForDay(date);
                const isCurrentMonth = isSameMonth(date, currentDate);
                const isToday = isSameDay(date, new Date());
                const isSelected = selectedDay && isSameDay(date, selectedDay);
                const totalActivities = dayTasks.length + dayMeetings.length;
                return (
                  <div key={i} onClick={() => { setSelectedDay(date); setShowDayPanel(true); }}
                    className={cn(
                      "min-h-[100px] bg-card p-2 cursor-pointer hover:bg-muted/20 transition-colors border-b border-r border-border/20",
                      !isCurrentMonth && "opacity-30 bg-muted/10",
                      isToday && "bg-primary/[0.03]",
                      isSelected && "bg-primary/[0.06] ring-1 ring-inset ring-primary/20"
                    )}
                  >
                    <span className={cn("text-xs font-semibold mb-1 inline-block w-6 h-6 flex items-center justify-center rounded-full",
                      isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    )}>{format(date, "d")}</span>
                    <div className="flex flex-col items-center justify-center flex-1 gap-1">
                      {totalActivities > 0 ? (
                        <>
                          <div className="flex items-center justify-center gap-2">
                            {dayTasks.length > 0 && (
                              <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: "#00BFFF" }}>
                                <ClipboardList className="h-3.5 w-3.5" />{dayTasks.length}
                              </span>
                            )}
                            {dayMeetings.length > 0 && (
                              <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: "#A855F7" }}>
                                <Video className="h-3.5 w-3.5" />{dayMeetings.length}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-0.5 justify-center flex-wrap">
                            {dayTasks.slice(0, 5).map(task => {
                              const st = getStatus(task.status);
                              return <div key={task.id} className={cn("w-1.5 h-1.5 rounded-full", st.color.replace("text-", "bg-"))} />;
                            })}
                            {totalActivities > 5 && <span className="text-[9px] text-muted-foreground">+{totalActivities - 5}</span>}
                          </div>
                        </>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/25">-</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <AnimatePresence>
            {showDayPanel && selectedDay && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="w-80 shrink-0">
                <Card className="border-border/50 shadow-sm sticky top-4">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div><h3 className="font-bold text-base capitalize">{format(selectedDay, "EEEE d", { locale: es })}</h3><p className="text-xs text-muted-foreground">{format(selectedDay, "MMMM yyyy", { locale: es })}</p></div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setShowDayPanel(false)}><X className="h-4 w-4" /></Button>
                    </div>
                    <div className="flex gap-2 mb-4">
                      <Button size="sm" variant="outline" className="flex-1 text-xs h-9 rounded-lg" onClick={() => setMeetingForm({ ...meetingForm, open: true, date: format(selectedDay, "yyyy-MM-dd") })}><Video className="h-3.5 w-3.5 mr-1" /> Reunión</Button>
                      <Button size="sm" variant="outline" className="flex-1 text-xs h-9 rounded-lg"><Plus className="h-3.5 w-3.5 mr-1" /> Tarea</Button>
                    </div>
                    {selectedDayMeetings.length > 0 && (
                      <div className="mb-4"><p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Reuniones</p>
                        {selectedDayMeetings.map(m => <div key={m.id} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-purple-500/5 border border-purple-500/10 mb-2"><Video className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" /><div><p className="text-sm font-medium">{m.title}</p><p className="text-xs text-muted-foreground">{m.start_time?.substring(0,5)} - {m.end_time?.substring(0,5)}</p></div></div>)}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Tareas</p>
                      {selectedDayTasks.length === 0 ? <p className="text-xs text-muted-foreground text-center py-6 bg-muted/20 rounded-xl">Sin tareas para este día</p> : selectedDayTasks.map(task => { const st = getStatus(task.status); const Icon = st.icon; return (
                        <div key={task.id} onClick={() => { setSelectedTask(task); setTaskDetailOpen(true); }} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/20 hover:bg-muted/30 cursor-pointer mb-2 transition-colors">
                          <Icon className={cn("h-4 w-4 shrink-0", st.color)} /><div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{task.description || "Sin descripción"}</p><div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5"><span>{task.projects?.name || "Sin proyecto"}</span><span>·</span><span>{((task as any).duration_in_minutes || 0) / 60}h</span></div></div>
                        </div>
                      )})}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modal DETALLE DE TAREA */}
      <Dialog open={taskDetailOpen} onOpenChange={setTaskDetailOpen}>
        <DialogContent className="sm:max-w-2xl bg-card border-border p-0 overflow-hidden">
          {selectedTask && (() => {
            const st = getStatus(selectedTask.status);
            const StatusIcon = st.icon;
            const taskDate = selectedTask.start_time ? parseISO(selectedTask.start_time) : null;
            const dayTasks = taskDate ? getTasksForDay(taskDate) : [];
            const dayMeetings = taskDate ? getMeetingsForDay(taskDate) : [];
            const duration = ((selectedTask.duration_in_minutes || 0) / 60);
            const exportReport = async (type: 'pdf' | 'excel') => {
              if (type === 'pdf') {
                const { default: jsPDF } = await import('jspdf'); const { default: autoTable } = await import('jspdf-autotable');
                const doc = new jsPDF(); const pw = doc.internal.pageSize.width;
                doc.setFont('helvetica','bold').setFontSize(20).setTextColor(31,41,55); doc.text('Reporte del Día',20,25);
                doc.setFont('helvetica','normal').setFontSize(10).setTextColor(107,114,128); doc.text(format(taskDate!,"EEEE d 'de' MMMM yyyy",{locale:es}),20,33);
                let y=45;
                if(dayTasks.length>0){doc.setFontSize(14).setFont('helvetica','bold').setTextColor(31,41,55).text('Tareas',20,y); autoTable(doc,{startY:y+6,head:[['Descripción','Estado','Proyecto','Horas','Pago']],body:dayTasks.map(t=>[(t.description||'').substring(0,40),getStatus(t.status).label,t.projects?.name||'-',`${((t.duration_in_minutes||0)/60).toFixed(1)}h`,`$${(t as any).total_pay?.toFixed(2)||'0.00'}`]),theme:'plain',headStyles:{fillColor:[37,99,235],textColor:[255,255,255],fontStyle:'bold',fontSize:8},bodyStyles:{fontSize:8,textColor:[31,41,55]},margin:{left:20,right:20}}); y=(doc as any).lastAutoTable.finalY+10;}
                if(dayMeetings.length>0){doc.setFontSize(14).setFont('helvetica','bold').setTextColor(31,41,55).text('Reuniones',20,y); autoTable(doc,{startY:y+6,head:[['Título','Horario','Cliente','Asistentes']],body:dayMeetings.map(m=>[m.title,`${m.start_time?.substring(0,5)} - ${m.end_time?.substring(0,5)}`,m.client_name||'-',m.meeting_attendees?.length||0]),theme:'plain',headStyles:{fillColor:[37,99,235],textColor:[255,255,255],fontStyle:'bold',fontSize:8},bodyStyles:{fontSize:8,textColor:[31,41,55]},margin:{left:20,right:20}});}
                const pages=(doc as any).internal.getNumberOfPages(); for(let i=1;i<=pages;i++){doc.setPage(i).setDrawColor(229,231,235).line(20,285,pw-20,285); doc.setFontSize(7).setTextColor(156,163,175).text(`HormiWatch · Página ${i} de ${pages}`,20,290);}
                doc.save(`Reporte_${format(taskDate!,"yyyy-MM-dd")}.pdf`);
              } else {
                const { default: ExcelJS } = await import('exceljs'); const wb=new ExcelJS.Workbook(); const ws=wb.addWorksheet('Reporte');
                ws.columns=[{header:'Tipo',key:'type',width:15},{header:'Descripción',key:'desc',width:40},{header:'Estado',key:'status',width:15},{header:'Proyecto',key:'project',width:20},{header:'Horas',key:'hours',width:10},{header:'Pago',key:'pay',width:15}];
                ws.getRow(1).font={color:{argb:'FFFFFF'},bold:true}; ws.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'2563EB'}};
                dayTasks.forEach(t=>ws.addRow({type:'Tarea',desc:t.description||'',status:getStatus(t.status).label,project:t.projects?.name||'-',hours:`${((t.duration_in_minutes||0)/60).toFixed(1)}h`,pay:`$${(t as any).total_pay?.toFixed(2)||'0.00'}`}));
                dayMeetings.forEach(m=>ws.addRow({type:'Reunión',desc:m.title,status:`${m.start_time?.substring(0,5)} - ${m.end_time?.substring(0,5)}`,project:m.client_name||'-',hours:'',pay:''}));
                const buf=await wb.xlsx.writeBuffer(); const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`Reporte_${format(taskDate!,"yyyy-MM-dd")}.xlsx`; a.click(); URL.revokeObjectURL(url);
              }
              toast.success(`Reporte ${type.toUpperCase()} descargado`);
            };
            return (<>
              <div className="p-6 text-white" style={{ background: "linear-gradient(135deg, #2563EB, #1D4ED8)" }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 ring-4 ring-white/10"><StatusIcon className="h-7 w-7 text-white" /></div>
                    <div><DialogTitle className="text-xl font-bold text-white">{selectedTask.description || "Sin descripción"}</DialogTitle>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge className="bg-white/20 text-white border-white/20 text-xs font-medium">{st.label}</Badge>
                        <Badge className="bg-white/10 text-white/90 border-white/20 text-xs gap-1"><FolderKanban className="h-3 w-3" />{selectedTask.projects?.name || "Sin proyecto"}</Badge>
                        <Badge className="bg-white/10 text-white/90 border-white/20 text-xs gap-1"><Briefcase className="h-3 w-3" />{selectedTask.services?.name || "Sin servicio"}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="secondary" size="sm" className="gap-1 rounded-xl bg-white/20 hover:bg-white/30 text-white border-0" onClick={()=>exportReport('pdf')}><Download className="h-4 w-4"/> PDF</Button></TooltipTrigger><TooltipContent side="left" className="text-xs py-1.5 px-3">Descargar PDF</TooltipContent></Tooltip></TooltipProvider>
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="secondary" size="sm" className="gap-1 rounded-xl bg-white/20 hover:bg-white/30 text-white border-0" onClick={()=>exportReport('excel')}><Download className="h-4 w-4"/> Excel</Button></TooltipTrigger><TooltipContent side="left" className="text-xs py-1.5 px-3">Descargar Excel</TooltipContent></Tooltip></TooltipProvider>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-5" style={{ color: "#1F2937" }}>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-white p-3.5 text-center border border-gray-100 shadow-sm"><User className="h-4 w-4 mx-auto mb-1" style={{ color: "#6B7280" }} /><p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: "#6B7280" }}>Técnico</p><p className="text-sm font-semibold mt-0.5" style={{ color: "#1F2937" }}>{selectedTask.technician?.full_name || "Sin asignar"}</p></div>
                  <div className="rounded-xl bg-white p-3.5 text-center border border-gray-100 shadow-sm"><CalendarIcon className="h-4 w-4 mx-auto mb-1" style={{ color: "#6B7280" }} /><p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: "#6B7280" }}>Fecha</p><p className="text-sm font-semibold mt-0.5" style={{ color: "#1F2937" }}>{taskDate ? format(taskDate, "dd/MM/yyyy") : "-"}</p></div>
                  <div className="rounded-xl bg-white p-3.5 text-center border border-gray-100 shadow-sm"><Clock className="h-4 w-4 mx-auto mb-1" style={{ color: "#6B7280" }} /><p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: "#6B7280" }}>Duración</p><p className="text-sm font-semibold mt-0.5" style={{ color: "#1F2937" }}>{duration > 0 ? `${duration.toFixed(1)}h` : 'Pendiente'}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white p-4 border border-amber-100 shadow-sm"><div className="flex items-center gap-2 mb-1"><Sun className="h-4 w-4" style={{ color: "#D97706" }} /><p className="text-xs font-medium" style={{ color: "#92400E" }}>Horas Normales</p></div><p className="text-xl font-bold" style={{ color: "#1E3A5F" }}>{(selectedTask as any).normal_hours || 0}h</p><p className="text-[11px] mt-0.5" style={{ color: "#B45309" }}>×1.0</p></div>
                  <div className="rounded-xl bg-white p-4 border border-blue-100 shadow-sm"><div className="flex items-center gap-2 mb-1"><Moon className="h-4 w-4" style={{ color: "#2563EB" }} /><p className="text-xs font-medium" style={{ color: "#1E40AF" }}>Horas Extra</p></div><p className="text-xl font-bold" style={{ color: "#1E3A5F" }}>{(selectedTask as any).overtime_hours || 0}h</p><p className="text-[11px] mt-0.5" style={{ color: "#1D4ED8" }}>×1.5</p></div>
                </div>
                <div className="rounded-xl bg-white p-4 flex items-center justify-between border border-emerald-100 shadow-sm"><div><p className="text-xs font-medium" style={{ color: "#047857" }}>Pago Total</p><p className="text-2xl font-bold" style={{ color: "#10B981" }}>${(selectedTask as any).total_pay?.toFixed(2) || "0.00"}</p></div><DollarSign className="h-8 w-8" style={{ color: "#10B981", opacity: 0.3 }} /></div>
                {(selectedTask as any).notes && <div className="rounded-xl bg-white p-3 border border-gray-100 shadow-sm"><p className="text-[10px] uppercase tracking-wide font-medium mb-1" style={{ color: "#6B7280" }}>Observaciones</p><p className="text-sm" style={{ color: "#1F2937" }}>{(selectedTask as any).notes}</p></div>}
              </div>
            </>);
          })()}
        </DialogContent>
      </Dialog>

      {/* Modal CREAR REUNIÓN */}
      <Dialog open={meetingForm.open} onOpenChange={(o) => setMeetingForm({ ...meetingForm, open: o })}>
        <DialogContent className="sm:max-w-lg bg-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Video className="h-5 w-5 text-purple-500" /> Nueva Reunión</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-xs">Título *</Label><Input value={meetingForm.title} onChange={e => setMeetingForm({ ...meetingForm, title: e.target.value })} placeholder="Reunión de planificación" className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Fecha *</Label><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 text-sm mt-1", !meetingForm.date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{meetingForm.date ? format(parseISO(meetingForm.date), "PPP", { locale: es }) : "Seleccionar fecha"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={meetingForm.date ? parseISO(meetingForm.date) : undefined} onSelect={(d) => setMeetingForm({ ...meetingForm, date: d ? format(d, "yyyy-MM-dd") : "" })} initialFocus modifiers={{ today: new Date() }} modifiersStyles={{ today: { backgroundColor: '#ef4444', color: 'white', fontWeight: 'bold' } }} /></PopoverContent></Popover></div>
            <div className="grid grid-cols-2 gap-3"><div><Label className="text-xs">Hora inicio</Label><Input type="time" value={meetingForm.startTime} onChange={e => setMeetingForm({ ...meetingForm, startTime: e.target.value })} className="h-9 text-sm mt-1" /></div><div><Label className="text-xs">Hora fin</Label><Input type="time" value={meetingForm.endTime} onChange={e => setMeetingForm({ ...meetingForm, endTime: e.target.value })} className="h-9 text-sm mt-1" /></div></div>
            <div><Label className="text-xs">Cliente (opcional)</Label><Input value={meetingForm.clientName} onChange={e => setMeetingForm({ ...meetingForm, clientName: e.target.value })} placeholder="Nombre del cliente" className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Descripción</Label><Textarea value={meetingForm.description} onChange={e => setMeetingForm({ ...meetingForm, description: e.target.value })} placeholder="Detalles..." className="text-sm mt-1" rows={2} /></div>
            <div><Label className="text-xs mb-2 block">Asistentes ({meetingForm.attendees.length})</Label>
              <div className="space-y-2">{meetingForm.attendees.map((a, i) => <div key={i} className="flex items-center gap-2">{a.is_external ? <><Input value={a.name} onChange={e => { const u = [...meetingForm.attendees]; u[i].name = e.target.value; setMeetingForm({ ...meetingForm, attendees: u }); }} placeholder="Nombre" className="h-8 text-xs flex-1" /><Input value={a.email} onChange={e => { const u = [...meetingForm.attendees]; u[i].email = e.target.value; setMeetingForm({ ...meetingForm, attendees: u }); }} placeholder="Email" className="h-8 text-xs flex-1" /></> : <div className="flex-1 bg-muted/30 rounded px-2 py-1.5 text-xs">{a.name}</div>}<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMeetingForm({ ...meetingForm, attendees: meetingForm.attendees.filter((_, j) => j !== i) })}><X className="h-3 w-3" /></Button></div>)}</div>
              <div className="flex gap-2 mt-2"><Select onValueChange={(v) => { const m = members.find((mb: any) => mb.id === v); if (m) setMeetingForm({ ...meetingForm, attendees: [...meetingForm.attendees, { user_id: m.id, name: m.full_name || m.email, email: m.email, is_external: false }] }); }}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="+ Miembro del equipo" /></SelectTrigger><SelectContent>{members.filter((m: any) => !meetingForm.attendees.some(a => a.user_id === m.id)).map((m: any) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>)}</SelectContent></Select><Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setMeetingForm({ ...meetingForm, attendees: [...meetingForm.attendees, { name: "", email: "", is_external: true }] })}>+ Invitado externo</Button></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setMeetingForm({ ...meetingForm, open: false })}>Cancelar</Button><Button onClick={async () => { if (!meetingForm.title.trim()) { toast.error("El título es obligatorio"); return } try { const { data: meeting } = await supabase.from('meetings').insert({ title: meetingForm.title, description: meetingForm.description, date: meetingForm.date, start_time: meetingForm.startTime, end_time: meetingForm.endTime, client_name: meetingForm.clientName || null, project_id: meetingForm.projectId || null, created_by: profile?.id }).select().single(); if (meeting && meetingForm.attendees.length > 0) await supabase.from('meeting_attendees').insert(meetingForm.attendees.map(a => ({ meeting_id: meeting.id, user_id: a.user_id || null, name: a.name, email: a.email, is_external: a.is_external }))); toast.success("Reunión creada"); setMeetingForm({ open: false, title: "", description: "", date: "", startTime: "09:00", endTime: "10:00", clientName: "", projectId: "", attendees: [] }); setTimeout(async () => { await fetchMeetings(); }, 300); } catch (e: any) { toast.error(`Error: ${e.message}`); } }} className="bg-purple-500 hover:bg-purple-600">Crear Reunión</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}