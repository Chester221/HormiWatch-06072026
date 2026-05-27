import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle2, Circle, Calendar, MoreVertical, Pencil, Trash2, Sun, Moon, ChevronDown, ChevronRight, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { Task } from "./TaskCalendar";

interface TaskListProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onExportPDF?: (task: Task) => void;
}

const serviceTypeColors: Record<string, string> = {
  development: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  support: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  consulting: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  maintenance: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

export function TaskList({ tasks, onTaskClick, onEditTask, onDeleteTask, onExportPDF }: TaskListProps) {
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
        const hasOvertime = taskData.overtime_hours > 0;
        const hasNormal = taskData.normal_hours > 0;
        const isOnlyNormal = hasNormal && !hasOvertime;
        const isOnlyOvertime = hasOvertime && !hasNormal;
        const isMixed = hasNormal && hasOvertime;
        const isExpanded = expandedTasks.has(task.id);

        return (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <div
              onClick={() => onTaskClick?.(task)}
              className={cn(
                "group flex items-center gap-4 p-4 rounded-xl border border-border bg-card transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 cursor-pointer",
                isExpanded && "rounded-b-none border-b-0 shadow-lg shadow-primary/5"
              )}
            >
              {/* Status Icon */}
              <motion.div
                whileHover={{ scale: 1.1 }}
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
                  task.completed ? "bg-emerald-500/10" : "bg-primary/10"
                )}
              >
                {task.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Circle className="h-5 w-5 text-primary" />
                )}
              </motion.div>

              {/* Task Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-medium text-foreground truncate max-w-[200px]">
                    {task.title || `${task.serviceType} Task`}
                  </h3>
                  <Badge variant="outline" className={cn("text-[10px] capitalize", serviceTypeColors[task.serviceType] || serviceTypeColors.development)}>
                    {task.serviceType}
                  </Badge>
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

              {/* Hours & Pay */}
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-foreground">{task.hours}h</p>
                {taskData.total_pay > 0 && (
                  <p className="text-xs text-emerald-600 font-medium">${taskData.total_pay.toFixed(2)}</p>
                )}
              </div>

              {/* Expand Button */}
              <motion.button
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => toggleExpand(task.id, e)}
                className="shrink-0 p-1 rounded-full hover:bg-muted transition-colors"
              >
                <motion.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </motion.div>
              </motion.button>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border-border w-40">
                  <DropdownMenuItem className="cursor-pointer gap-2 text-xs" onClick={(e) => { e.stopPropagation(); onExportPDF?.(task); }}>
                    <FileText className="h-3.5 w-3.5" /> Exportar Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer gap-2 text-xs" onClick={(e) => { e.stopPropagation(); onEditTask?.(task); }}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer gap-2 text-xs text-destructive" onClick={(e) => { e.stopPropagation(); onDeleteTask?.(String(task.id)); }}>
                    <Trash2 className="h-3.5 w-3.5" /> Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Panel expandible con animación */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="rounded-b-xl border border-t-0 border-border bg-gradient-to-br from-muted/20 to-muted/5 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                      <p className="text-xs font-semibold text-foreground">Desglose de horas</p>
                    </div>
                    
                    <div className="space-y-2">
                      {hasNormal && (
                        <motion.div
                          initial={{ x: -10, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.1 }}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-green-500/5 border border-green-500/10"
                        >
                          <div className="flex items-center gap-2">
                            <Sun className="h-3.5 w-3.5 text-green-500" />
                            <span className="text-xs text-foreground">Horas Normales</span>
                            <span className="text-[10px] text-muted-foreground">({taskData.normal_hours}h)</span>
                          </div>
                          <span className="text-xs font-bold text-green-600">${Number(taskData.normal_pay || 0).toFixed(2)}</span>
                        </motion.div>
                      )}
                      
                      {hasOvertime && (
                        <motion.div
                          initial={{ x: -10, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-amber-500/5 border border-amber-500/10"
                        >
                          <div className="flex items-center gap-2">
                            <Moon className="h-3.5 w-3.5 text-amber-500" />
                            <span className="text-xs text-foreground">Horas Extra</span>
                            <span className="text-[10px] text-muted-foreground">({taskData.overtime_hours}h ×1.5)</span>
                          </div>
                          <span className="text-xs font-bold text-amber-600">${Number(taskData.overtime_pay || 0).toFixed(2)}</span>
                        </motion.div>
                      )}
                    </div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-center justify-between pt-2 border-t border-border"
                    >
                      <span className="text-sm font-semibold text-foreground">Total</span>
                      <motion.span
                        className="text-lg font-bold text-primary"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.4, type: "spring" }}
                      >
                        ${Number(taskData.total_pay || 0).toFixed(2)}
                      </motion.span>
                    </motion.div>
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