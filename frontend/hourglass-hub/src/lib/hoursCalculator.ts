/**
 * Sistema de Cálculo de Horas y Tarifas - HormiWatch
 * 
 * Horario Diurno:  8:00 AM - 5:00 PM  → ×1
 * Horario Nocturno: 5:00 PM - 7:00 AM → ×1.5
 * 
 * Multiplicadores por tipo de día:
 * - Día normal (L-V):     ×1
 * - Fin de semana (S-D):  ×1.5
 * - Feriado:              ×2
 * - Finde + Feriado:      ×3
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

// Para compatibilidad con código existente
export interface HoursBreakdown {
  normalHours: number;
  overtimeHours: number;
  normalPay: number;
  overtimePay: number;
  totalHours: number;
  totalPay: number;
}

const DAYS_OF_WEEK = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function getDayMultiplier(date: Date, holidaysList: string[]): number {
  const dateStr = date.toISOString().split('T')[0];
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isHoliday = holidaysList.includes(dateStr);

  if (isWeekend && isHoliday) return 3;
  if (isHoliday) return 2;
  if (isWeekend) return 1.5;
  return 1;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
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
  const multiplier = getDayMultiplier(date, holidaysList);
  
  let normalMinutes = 0;
  let overtimeMinutes = 0;
  
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;
  
  for (let m = startTotalMinutes; m < endTotalMinutes; m++) {
    const hour = Math.floor(m / 60);
    if (hour >= 8 && hour < 17) {
      normalMinutes++;
    } else {
      overtimeMinutes++;
    }
  }
  
  const normalHours = Math.round((normalMinutes / 60) * 100) / 100;
  const overtimeHours = Math.round((overtimeMinutes / 60) * 100) / 100;
  const totalHours = Math.round((normalHours + overtimeHours) * 100) / 100;
  
  const normalPay = Math.round(normalHours * hourlyRate * multiplier * 100) / 100;
  const overtimePay = Math.round(overtimeHours * hourlyRate * 1.5 * multiplier * 100) / 100;
  const totalPay = Math.round((normalPay + overtimePay) * 100) / 100;
  
  return {
    date: dateStr,
    dayOfWeek: DAYS_OF_WEEK[date.getDay()],
    isWeekend: isWeekend(date),
    isHoliday: holidaysList.includes(dateStr),
    normalHours,
    overtimeHours,
    normalPay,
    overtimePay,
    totalHours,
    totalPay,
    multiplier,
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
      
      if (breakdown.totalHours > 0) {
        days.push(breakdown);
      }
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  const grandTotalHours = Math.round(days.reduce((sum, d) => sum + d.totalHours, 0) * 100) / 100;
  const grandTotalPay = Math.round(days.reduce((sum, d) => sum + d.totalPay, 0) * 100) / 100;
  
  return {
    days,
    grandTotalHours,
    grandTotalPay,
    hasOvertime: days.some(d => d.overtimeHours > 0),
    hasHoliday: days.some(d => d.isHoliday),
    hasWeekend: days.some(d => d.isWeekend),
    overallMultiplier: `${Math.max(...days.map(d => d.multiplier), 1)}x`,
  };
}

// Compatibilidad
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