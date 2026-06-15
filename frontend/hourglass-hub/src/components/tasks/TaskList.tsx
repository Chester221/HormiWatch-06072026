import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle2, Circle, Calendar, MoreVertical, Pencil, Trash2, Sun, Moon, CalendarX, ChevronDown, ChevronUp } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { Task } from "./TaskCalendar";

interface TaskListProps {
  tasks: (Task & {
    canEdit?: boolean;
    canDelete?: boolean;
  })[];
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: any) => void;
}

const getServiceColor = (serviceType: string) => {
  const colors = [
    "bg-blue-500/10 text-blue-600 border-blue-500/20",
    "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    "bg-purple-500/10 text-purple-600 border-purple-500/20",
    "bg-amber-500/10 text-amber-600 border-amber-500/20",
    "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
    "bg-pink-500/10 text-pink-600 border-pink-500/20",
  ];
  const index = serviceType.length % colors.length;
  return colors[index];
};

export function TaskList({ tasks, onEditTask, onDeleteTask }: TaskListProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const toggleExpand = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No se encontraron tareas</h3>
        <p className="text-muted-foreground">Registra horas para ver tus tareas aquí.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task, index) => {
        const taskData = task as any;
        const hasOvertime = (taskData.overtime_hours || 0) > 0;
        const hasNormal = (taskData.normal_hours || 0) > 0;
        const isOnlyNormal = hasNormal && !hasOvertime;
        const isOnlyOvertime = hasOvertime && !hasNormal;
        const isMixed = hasNormal && hasOvertime;
        const isExpanded = expandedTasks.has(task.id);
        const isHoliday = taskData.isHoliday || taskData.is_holiday;
        
        const canEditThis = task.canEdit === true;
        const canDeleteThis = task.canDelete === true;
        const showActions = canEditThis || canDeleteThis;

        return (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="border border-border rounded-xl overflow-hidden bg-card"
          >
            <div
              onClick={(e) => toggleExpand(task.id, e)}
              className="group p-4 cursor-pointer transition-all duration-200 hover:bg-muted/20"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  {task.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-primary" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-medium text-foreground truncate max-w-[200px]">
                      {task.title || "Tarea sin descripción"}
                    </h3>
                    <Badge variant="outline" className={cn("text-[10px]", getServiceColor(task.serviceType))}>
                      {task.serviceType}
                    </Badge>
                    {isHoliday && (
                      <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 border-red-500/20 gap-1">
                        <CalendarX className="h-3 w-3" /> Feriado
                      </Badge>
                    )}
                    {isOnlyNormal && (
                      <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20 gap-1">
                        <Sun className="h-3 w-3" /> Diurno
                      </Badge>
                    )}
                    {isOnlyOvertime && (
                      <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
                        <Moon className="h-3 w-3" /> Nocturno
                      </Badge>
                    )}
                    {isMixed && (
                      <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/20 gap-1">
                        <Sun className="h-3 w-3" /><Moon className="h-3 w-3" /> Mixto
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(task.date).toLocaleDateString("es-VE", { month: "short", day: "numeric" })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {task.startTime} - {task.endTime}
                    </span>
                    {task.project && (
                      <span className="truncate max-w-[120px]">{task.project}</span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-foreground">{task.hours.toFixed(1)}h</p>
                  <p className="text-xs text-emerald-600 font-medium">${taskData.total_pay?.toFixed(2) || '0.00'}</p>
                </div>

                <div className="shrink-0 text-muted-foreground">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>

                {showActions && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-border w-40">
                      {canEditThis && (
                        <DropdownMenuItem 
                          className="cursor-pointer gap-2 text-xs" 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            onEditTask?.(task); 
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </DropdownMenuItem>
                      )}
                      {canDeleteThis && (
                        <DropdownMenuItem 
                          className="cursor-pointer gap-2 text-xs text-destructive" 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            onDeleteTask?.(task); 
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Eliminar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden border-t border-border"
                >
                  <div className="p-4 bg-gradient-to-br from-muted/20 to-muted/5">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                          Desglose de horas
                        </p>
                      </div>
                      
                      {hasNormal && (
                        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-green-500/5 border border-green-500/10">
                          <div className="flex items-center gap-2">
                            <Sun className="h-3.5 w-3.5 text-green-500" />
                            <span className="text-sm text-foreground">Horas Normales</span>
                            <span className="text-xs text-muted-foreground">({taskData.normal_hours}h)</span>
                          </div>
                          <span className="text-sm font-bold text-green-600">${Number(taskData.normal_pay || 0).toFixed(2)}</span>
                        </div>
                      )}
                      
                      {hasOvertime && (
                        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                          <div className="flex items-center gap-2">
                            <Moon className="h-3.5 w-3.5 text-amber-500" />
                            <span className="text-sm text-foreground">Horas Extra</span>
                            <span className="text-xs text-muted-foreground">({taskData.overtime_hours}h ×1.5)</span>
                          </div>
                          <span className="text-sm font-bold text-amber-600">${Number(taskData.overtime_pay || 0).toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-border mt-1">
                        <span className="text-base font-semibold text-foreground">Total</span>
                        <span className="text-xl font-bold text-primary">${Number(taskData.total_pay || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}