import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { FileText, Download, TrendingUp, Clock, Sun, Moon, Calendar } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { useServices } from "@/hooks/useServices";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function Reports() {
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [reportType, setReportType] = useState<'summary' | 'detailed'>('summary');

    const { data: tasks = [] } = useTasks();
    const { data: projects = [] } = useProjects();
    const { data: services = [] } = useServices();

    const filteredTasks = useMemo(() => {
        const [year, month] = selectedMonth.split('-').map(Number);
        const start = startOfMonth(new Date(year, month - 1));
        const end = endOfMonth(new Date(year, month - 1));
        return tasks.filter(task => {
            if (!task.start_time) return false;
            const d = parseISO(task.start_time);
            return d >= start && d <= end;
        });
    }, [tasks, selectedMonth]);

    const totalHours = useMemo(() => filteredTasks.reduce((acc, t) => {
        if (t.start_time && t.end_time) return acc + (new Date(t.end_time).getTime() - new Date(t.start_time).getTime()) / 3600000;
        return acc;
    }, 0), [filteredTasks]);

    const normalHoursTotal = useMemo(() => filteredTasks.reduce((acc, t) => acc + ((t as any).normal_hours || 0), 0), [filteredTasks]);
    const overtimeHoursTotal = useMemo(() => filteredTasks.reduce((acc, t) => acc + ((t as any).overtime_hours || 0), 0), [filteredTasks]);
    const totalRevenue = useMemo(() => filteredTasks.reduce((acc, t) => acc + ((t as any).total_pay || 0), 0), [filteredTasks]);

    const hoursByProject = useMemo(() => {
        const g: Record<string, number> = {};
        filteredTasks.forEach(t => {
            if (!t.start_time || !t.end_time) return;
            const n = t.projects?.name || 'Sin proyecto';
            g[n] = (g[n] || 0) + (new Date(t.end_time).getTime() - new Date(t.start_time).getTime()) / 3600000;
        });
        return Object.entries(g).map(([name, hours]) => ({ name, hours: Math.round(hours * 10) / 10 }));
    }, [filteredTasks]);

    const hoursByService = useMemo(() => {
        const g: Record<string, number> = {};
        filteredTasks.forEach(t => {
            if (!t.start_time || !t.end_time) return;
            const n = t.services?.name || 'Sin servicio';
            g[n] = (g[n] || 0) + (new Date(t.end_time).getTime() - new Date(t.start_time).getTime()) / 3600000;
        });
        return Object.entries(g).map(([name, value]) => ({ name, value: Math.round(value * 10) / 10 }));
    }, [filteredTasks]);

    const revenueByProject = useMemo(() => {
        const g: Record<string, number> = {};
        filteredTasks.forEach(t => {
            const n = t.projects?.name || 'Sin proyecto';
            g[n] = (g[n] || 0) + ((t as any).total_pay || 0);
        });
        return Object.entries(g).map(([name, revenue]) => ({ name, revenue: Math.round(revenue * 100) / 100 }));
    }, [filteredTasks]);

    const dailyHours = useMemo(() => {
        const [year, month] = selectedMonth.split('-').map(Number);
        const start = startOfMonth(new Date(year, month - 1));
        const end = endOfMonth(new Date(year, month - 1));
        return eachDayOfInterval({ start, end }).map(day => {
            const ds = format(day, 'yyyy-MM-dd');
            const dayTasks = filteredTasks.filter(t => t.start_time?.startsWith(ds));
            const hours = dayTasks.reduce((acc, t) => {
                if (t.start_time && t.end_time) return acc + (new Date(t.end_time).getTime() - new Date(t.start_time).getTime()) / 3600000;
                return acc;
            }, 0);
            return { date: format(day, 'd'), hours: Math.round(hours * 10) / 10 };
        });
    }, [filteredTasks, selectedMonth]);

    const availableMonths = useMemo(() => {
        const now = new Date();
        return Array.from({ length: 12 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: es }) };
        });
    }, []);

    const tasksExtra = filteredTasks.filter(t => ((t as any).overtime_hours || 0) > 0).length;

    // ─── PDF ───
    const generatePDF = () => {
        const doc = new jsPDF();
        const [year, month] = selectedMonth.split('-').map(Number);
        const monthName = format(new Date(year, month - 1), 'MMMM yyyy', { locale: es });
        const pw = doc.internal.pageSize.width;
        const dark = [40, 40, 50], gray = [130, 130, 140], line = [230, 230, 235], primary = [139, 92, 246];

        doc.setFont('helvetica', 'bold').setFontSize(22).setTextColor(dark[0], dark[1], dark[2]);
        doc.text('HormiWatch', 20, 25);
        doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(gray[0], gray[1], gray[2]);
        doc.text(`Reporte de ${monthName}  ·  ${format(new Date(), 'dd/MM/yyyy')}`, 20, 33);
        doc.setDrawColor(line[0], line[1], line[2]).line(20, 38, pw - 20, 38);

        doc.setFontSize(13).setFont('helvetica', 'bold').setTextColor(dark[0], dark[1], dark[2]).text('Resumen', 20, 52);
        autoTable(doc, {
            startY: 56, theme: 'plain', styles: { fontSize: 10, cellPadding: 2 },
            body: [
                ['Total de tareas', filteredTasks.length.toString()],
                ['Horas normales', `${normalHoursTotal.toFixed(1)}h`],
                ['Horas extra', `${overtimeHoursTotal.toFixed(1)}h`],
                ['Horas totales', `${totalHours.toFixed(1)}h`],
                ['Ingresos totales', `$${totalRevenue.toFixed(2)}`],
            ],
            columnStyles: { 0: { textColor: gray[0] }, 1: { textColor: dark[0], fontStyle: 'bold', halign: 'right' } },
            margin: { left: 20 }, tableWidth: 180,
        });

        if (revenueByProject.length > 0) {
            const y = (doc as any).lastAutoTable.finalY + 12;
            doc.setFontSize(13).setFont('helvetica', 'bold').setTextColor(dark[0], dark[1], dark[2]).text('Ingresos por Proyecto', 20, y);
            autoTable(doc, {
                startY: y + 5, theme: 'plain',
                head: [['Proyecto', 'Horas', 'Ingresos']],
                body: revenueByProject.map(p => [p.name, `${hoursByProject.find(x => x.name === p.name)?.hours || 0}h`, `$${p.revenue.toFixed(2)}`]),
                headStyles: { fillColor: [250, 250, 252], textColor: dark[0], fontStyle: 'bold', fontSize: 9 },
                bodyStyles: { fontSize: 9, textColor: dark[0] },
                columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'center' }, 2: { halign: 'right', fontStyle: 'bold', textColor: primary } },
                margin: { left: 20, right: 20 },
            });
        }

        if (hoursByService.length > 0) {
            const y = (doc as any).lastAutoTable.finalY + 15;
            doc.setFontSize(13).setFont('helvetica', 'bold').setTextColor(dark[0], dark[1], dark[2]).text('Horas por Servicio', 20, y);
            autoTable(doc, {
                startY: y + 6, theme: 'plain',
                head: [['Servicio', 'Horas', '%']],
                body: hoursByService.map(s => [s.name, `${s.value}h`, `${((s.value / totalHours) * 100).toFixed(0)}%`]),
                headStyles: { fillColor: [250, 250, 252], textColor: dark[0], fontStyle: 'bold', fontSize: 9 },
                bodyStyles: { fontSize: 9, textColor: dark[0] },
                columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'center' }, 2: { halign: 'right', textColor: gray } },
                margin: { left: 20, right: 20 },
            });
        }

        if (reportType === 'detailed' && filteredTasks.length > 0) {
            const y = (doc as any).lastAutoTable.finalY + 18;
            if (y > 250) doc.addPage();
            doc.setFontSize(13).setFont('helvetica', 'bold').setTextColor(dark[0], dark[1], dark[2]).text('Detalle de Tareas', 20, y > 250 ? 25 : y);
            autoTable(doc, {
                startY: (y > 250 ? 25 : y) + 6, theme: 'plain',
                head: [['Fecha', 'Proyecto', 'Servicio', 'Normal', 'Extra', 'Pago']],
                body: filteredTasks.map(t => [
                    t.start_time ? format(parseISO(t.start_time), 'dd/MM') : '-',
                    (t.projects?.name || 'N/A').substring(0, 20),
                    (t.services?.name || 'N/A').substring(0, 20),
                    `${((t as any).normal_hours || 0).toFixed(1)}h`,
                    `${((t as any).overtime_hours || 0).toFixed(1)}h`,
                    `$${((t as any).total_pay || 0).toFixed(2)}`
                ]),
                headStyles: { fillColor: [250, 250, 252], textColor: dark[0], fontStyle: 'bold', fontSize: 8 },
                bodyStyles: { fontSize: 8, textColor: dark[0] },
                columnStyles: { 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'right', fontStyle: 'bold' } },
                margin: { left: 20, right: 20 },
            });
        }

        const pages = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
            doc.setPage(i).setDrawColor(line[0], line[1], line[2]).line(20, 285, pw - 20, 285);
            doc.setFontSize(7).setTextColor(gray[0], gray[1], gray[2]).text(`HormiWatch  ·  Página ${i} de ${pages}`, 20, 290);
        }
        doc.save(`HormiWatch_Reporte_${selectedMonth}.pdf`);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div><h1 className="text-3xl font-bold">Reportes</h1><p className="text-muted-foreground">Visualiza y exporta reportes</p></div>
                    <div className="flex gap-2">
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                            <SelectContent>{availableMonths.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={reportType} onValueChange={v => setReportType(v as any)}>
                            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="summary">Resumen</SelectItem><SelectItem value="detailed">Detallado</SelectItem></SelectContent>
                        </Select>
                        <Button onClick={generatePDF} className="gap-2"><Download className="h-4 w-4" />Exportar PDF</Button>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card><CardContent className="flex items-center gap-4 p-4"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><FileText className="h-6 w-6 text-primary" /></div><div><p className="text-2xl font-bold">{filteredTasks.length}</p><p className="text-sm text-muted-foreground">Tareas</p></div></CardContent></Card>
                    <Card><CardContent className="flex items-center gap-4 p-4"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10"><Clock className="h-6 w-6 text-cyan-500" /></div><div><p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p><p className="text-sm text-muted-foreground">Horas Totales</p></div></CardContent></Card>
                    <Card><CardContent className="flex items-center gap-4 p-4"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10"><TrendingUp className="h-6 w-6 text-green-500" /></div><div><p className="text-2xl font-bold">${totalRevenue.toFixed(0)}</p><p className="text-sm text-muted-foreground">Ingresos</p></div></CardContent></Card>
                    <Card><CardContent className="flex items-center gap-4 p-4"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10"><Moon className="h-6 w-6 text-amber-500" /></div><div><p className="text-2xl font-bold">{overtimeHoursTotal.toFixed(1)}h</p><p className="text-sm text-muted-foreground">Horas Extra</p></div></CardContent></Card>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border bg-card p-3 text-center"><Sun className="h-4 w-4 text-green-500 mx-auto mb-1" /><p className="text-lg font-bold text-green-600">{normalHoursTotal.toFixed(1)}h</p><p className="text-xs text-muted-foreground">Normales (×1)</p></div>
                    <div className="rounded-xl border bg-card p-3 text-center"><Moon className="h-4 w-4 text-amber-500 mx-auto mb-1" /><p className="text-lg font-bold text-amber-600">{overtimeHoursTotal.toFixed(1)}h</p><p className="text-xs text-muted-foreground">Extra (×1.5)</p></div>
                    <div className="rounded-xl border bg-card p-3 text-center"><Calendar className="h-4 w-4 text-red-500 mx-auto mb-1" /><p className="text-lg font-bold text-red-600">{tasksExtra}</p><p className="text-xs text-muted-foreground">Tareas con extra</p></div>
                </div>

                <Tabs defaultValue="daily" className="space-y-4">
                    <TabsList><TabsTrigger value="daily">Horas Diarias</TabsTrigger><TabsTrigger value="projects">Por Proyecto</TabsTrigger><TabsTrigger value="services">Por Servicio</TabsTrigger></TabsList>
                    <TabsContent value="daily"><Card><CardHeader><CardTitle>Horas Diarias</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={350}><LineChart data={dailyHours}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Line type="monotone" dataKey="hours" stroke="hsl(var(--primary))" strokeWidth={2} /></LineChart></ResponsiveContainer></CardContent></Card></TabsContent>
                    <TabsContent value="projects"><Card><CardHeader><CardTitle>Horas por Proyecto</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={350}><BarChart data={hoursByProject} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={150} /><Tooltip /><Bar dataKey="hours" fill="hsl(var(--primary))" radius={[0,4,4,0]} /></BarChart></ResponsiveContainer></CardContent></Card></TabsContent>
                    <TabsContent value="services"><Card><CardHeader><CardTitle>Por Servicio</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={350}><PieChart><Pie data={hoursByService} cx="50%" cy="50%" outerRadius={120} dataKey="value" label>{hoursByService.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></CardContent></Card></TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}