/**
 * Sistema de Cálculo de Horas y Tarifas - HormiWatch
 * 
 * Horario Diurno:  6:00 AM - 6:59 PM → ×1
 * Horario Nocturno: 7:00 PM - 5:59 AM → ×1.5
 * 
 * Multiplicadores por tipo de día:
 * - Lunes a Viernes: Diurno ×1, Nocturno ×1.5
 * - Sábado: Todo el día ×1.5
 * - Domingo: Todo el día ×2
 * - Feriado: Todo el día ×2 (máxima prioridad)
 */

export interface DayBreakdown {
  date: string;
  dayOfWeek: string;
  isWeekend: boolean;
  isHoliday: boolean;
  normalHours: number;
  overtimeHours: number;
  normalPay: number;
  overtimePay: number;
  totalHours: number;
  totalPay: number;
  multiplier: number;
  multiplierLabel: string;
}

export interface TaskBreakdown {
  days: DayBreakdown[];
  grandTotalHours: number;
  grandTotalPay: number;
  hasOvertime: boolean;
  hasHoliday: boolean;
  hasWeekend: boolean;
  overallMultiplier: string;
}

export interface HoursBreakdown {
  normalHours: number;
  overtimeHours: number;
  normalPay: number;
  overtimePay: number;
  totalHours: number;
  totalPay: number;
}

const DAYS_OF_WEEK = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function getDayMultiplier(date: Date, holidaysList: string[]): { multiplier: number; label: string } {
  const dateStr = date.toISOString().split('T')[0];
  const dayOfWeek = date.getDay(); // 0=Domingo, 6=Sábado
  const isHoliday = holidaysList.includes(dateStr);
  const isSaturday = dayOfWeek === 6;
  const isSunday = dayOfWeek === 0;

  // 1. Feriado gana sobre todo
  if (isHoliday) return { multiplier: 2, label: 'Feriado ×2' };
  // 2. Domingo
  if (isSunday) return { multiplier: 2, label: 'Domingo ×2' };
  // 3. Sábado
  if (isSaturday) return { multiplier: 1.5, label: 'Sábado ×1.5' };
  // 4. Lunes a Viernes - se calcula por horario
  return { multiplier: 1, label: 'Diurno ×1' };
}

function calculateDayBreakdown(
  date: Date,
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
  hourlyRate: number,
  holidaysList: string[]
): DayBreakdown {
  const dateStr = date.toISOString().split('T')[0];
  const { multiplier, label } = getDayMultiplier(date, holidaysList);
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isHoliday = holidaysList.includes(dateStr);
  const isSaturday = dayOfWeek === 6;
  const isSunday = dayOfWeek === 0;

  let normalMinutes = 0;
  let overtimeMinutes = 0;

  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;

  // Si es sábado, domingo o feriado, todo es según el multiplicador del día
  if (isSaturday || isSunday || isHoliday) {
    // Todo el tiempo se considera "normal" con el multiplicador del día
    for (let m = startTotalMinutes; m < endTotalMinutes; m++) {
      const hour = Math.floor(m / 60);
      // Diurno: 6AM - 6:59PM, Nocturno: 7PM - 5:59AM
      if (hour >= 6 && hour < 19) {
        normalMinutes++;
      } else {
        overtimeMinutes++;
      }
    }
  } else {
    // Lunes a Viernes: separar diurno/nocturno
    for (let m = startTotalMinutes; m < endTotalMinutes; m++) {
      const hour = Math.floor(m / 60);
      // Diurno: 6:00 - 18:59 (6 AM - 6:59 PM)
      if (hour >= 6 && hour < 19) {
        normalMinutes++;
      } else {
        // Nocturno: 19:00 - 5:59 (7 PM - 5:59 AM)
        overtimeMinutes++;
      }
    }
  }

  const normalHours = Math.round((normalMinutes / 60) * 100) / 100;
  const overtimeHours = Math.round((overtimeMinutes / 60) * 100) / 100;
  const totalHours = Math.round((normalHours + overtimeHours) * 100) / 100;

  // Calcular pagos
  let normalPay: number;
  let overtimePay: number;

  if (isSaturday || isSunday || isHoliday) {
    // Todo el día usa el multiplicador del día
    normalPay = Math.round(normalHours * hourlyRate * multiplier * 100) / 100;
    overtimePay = Math.round(overtimeHours * hourlyRate * multiplier * 100) / 100;
  } else {
    // Lunes a Viernes: diurno ×1, nocturno ×1.5
    normalPay = Math.round(normalHours * hourlyRate * 1 * 100) / 100;
    overtimePay = Math.round(overtimeHours * hourlyRate * 1.5 * 100) / 100;
  }

  const totalPay = Math.round((normalPay + overtimePay) * 100) / 100;

  return {
    date: dateStr,
    dayOfWeek: DAYS_OF_WEEK[dayOfWeek],
    isWeekend,
    isHoliday,
    normalHours,
    overtimeHours,
    normalPay,
    overtimePay,
    totalHours,
    totalPay,
    multiplier,
    multiplierLabel: label,
  };
}

export function calculateTaskBreakdown(
  startTime: string,
  endTime: string,
  hourlyRate: number,
  holidaysList: string[]
): TaskBreakdown {
  const start = new Date(startTime);
  const end = new Date(endTime);

  const days: DayBreakdown[] = [];
  let current = new Date(start);
  current.setHours(0, 0, 0, 0);

  while (current <= end) {
    const dayStart = new Date(current);
    const dayEnd = new Date(current);
    dayEnd.setHours(23, 59, 59, 999);

    const effectiveStart = start > dayStart ? start : dayStart;
    const effectiveEnd = end < dayEnd ? end : dayEnd;

    if (effectiveStart < effectiveEnd) {
      const breakdown = calculateDayBreakdown(
        new Date(current),
        effectiveStart.getHours(), effectiveStart.getMinutes(),
        effectiveEnd.getHours(), effectiveEnd.getMinutes(),
        hourlyRate,
        holidaysList
      );
      if (breakdown.totalHours > 0) days.push(breakdown);
    }
    current.setDate(current.getDate() + 1);
  }

  const grandTotalHours = Math.round(days.reduce((sum, d) => sum + d.totalHours, 0) * 100) / 100;
  const grandTotalPay = Math.round(days.reduce((sum, d) => sum + d.totalPay, 0) * 100) / 100;
  const maxMultiplier = Math.max(...days.map(d => d.multiplier), 1);

  return {
    days,
    grandTotalHours,
    grandTotalPay,
    hasOvertime: days.some(d => d.overtimeHours > 0),
    hasHoliday: days.some(d => d.isHoliday),
    hasWeekend: days.some(d => d.isWeekend),
    overallMultiplier: `${maxMultiplier}x`,
  };
}

export function calculateHoursBreakdown(
  startTime: string,
  endTime: string,
  hourlyRate: number,
  isHoliday: boolean = false
): HoursBreakdown {
  const holidaysList: string[] = [];
  const breakdown = calculateTaskBreakdown(startTime, endTime, hourlyRate, holidaysList);
  return {
    normalHours: breakdown.days.reduce((s, d) => s + d.normalHours, 0),
    overtimeHours: breakdown.days.reduce((s, d) => s + d.overtimeHours, 0),
    normalPay: breakdown.days.reduce((s, d) => s + d.normalPay, 0),
    overtimePay: breakdown.days.reduce((s, d) => s + d.overtimePay, 0),
    totalHours: breakdown.grandTotalHours,
    totalPay: breakdown.grandTotalPay,
  };
}

export function calculateTotalHours(startTime: string, endTime: string): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
}