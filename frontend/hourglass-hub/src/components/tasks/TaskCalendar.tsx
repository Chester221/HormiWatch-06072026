import { useState } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, Sun, Moon, CalendarX } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Task {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  project?: string;
  serviceType: string;
  completed: boolean;
  hours: number;
}

interface TaskCalendarProps {
  tasks: Task[];
  view: "week" | "month";
  onTaskClick?: (task: Task) => void;
}

export function TaskCalendar({ tasks, view, onTaskClick }: TaskCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const navigatePrev = () => {
    setCurrentDate(view === "month" ? subMonths(currentDate, 1) : subWeeks(currentDate, 1));
  };

  const navigateNext = () => {
    setCurrentDate(view === "month" ? addMonths(currentDate, 1) : addWeeks(currentDate, 1));
  };

  const getDaysToDisplay = () => {
    if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      const monthStart = startOfWeek(start, { weekStartsOn: 1 });
      const monthEnd = endOfWeek(end, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: monthStart, end: monthEnd });
    }
  };

  const days = getDaysToDisplay();
  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => isSameDay(new Date(task.date), day));
  };

  // ✅ Colores por estado
  const getTaskColor = (task: Task) => {
    const t = task as any;
    if (t.isHoliday || t.is_holiday) return "bg-red-500/10 text-red-600 border-red-500/20";
    if (task.completed) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    if (t.overtime_hours > 0 && t.normal_hours > 0) return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    if (t.overtime_hours > 0) return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  };

  // ✅ Icono por estado
  const getTaskIcon = (task: Task) => {
    const t = task as any;
    if (t.isHoliday || t.is_holiday) return <CalendarX className="h-3 w-3 shrink-0" />;
    if (task.completed) return <CheckCircle2 className="h-3 w-3 shrink-0" />;
    if (t.overtime_hours > 0 && t.normal_hours > 0) return <Moon className="h-3 w-3 shrink-0" />;
    if (t.overtime_hours > 0) return <Moon className="h-3 w-3 shrink-0" />;
    return <Clock className="h-3 w-3 shrink-0" />;
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground capitalize">
          {view === "month" 
            ? format(currentDate, "MMMM yyyy", { locale: es })
            : `${format(days[0], "MMM d", { locale: es })} - ${format(days[6], "MMM d, yyyy", { locale: es })}`
          }
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={navigatePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Hoy
          </Button>
          <Button variant="outline" size="icon" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className={cn(
        "grid grid-cols-7 gap-1",
        view === "week" ? "auto-rows-[200px]" : "auto-rows-[100px]"
      )}>
        {days.map((day, index) => {
          const dayTasks = getTasksForDay(day);
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, currentDate);

          return (
            <div
              key={index}
              className={cn(
                "rounded-lg border p-2 transition-colors",
                isToday ? "border-primary bg-primary/5" : "border-border hover:border-primary/30",
                !isCurrentMonth && view === "month" && "opacity-40"
              )}
            >
              <div className={cn(
                "text-sm font-medium mb-1",
                isToday ? "text-primary" : "text-foreground"
              )}>
                {format(day, "d")}
              </div>
              
              <div className="space-y-1 overflow-y-auto" style={{ maxHeight: view === "week" ? "160px" : "60px" }}>
                {dayTasks.slice(0, view === "week" ? 5 : 2).map((task) => (
                  <button
                    key={task.id}
                    onClick={() => onTaskClick?.(task)}
                    className={cn(
                      "w-full text-left text-xs p-1.5 rounded transition-colors truncate border",
                      getTaskColor(task)
                    )}
                  >
                    <div className="flex items-center gap-1">
                      {getTaskIcon(task)}
                      <span className="truncate">{task.title || task.serviceType}</span>
                    </div>
                  </button>
                ))}
                {dayTasks.length > (view === "week" ? 5 : 2) && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{dayTasks.length - (view === "week" ? 5 : 2)} más
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}