import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    Legend
} from "recharts";
import { FileText, Download, TrendingUp, Clock, Users, FolderKanban } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { useServices } from "@/hooks/useServices";
import { useTeamMembers } from "@/hooks/useTeamMembers";
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
const { data: teamMembers = [] } = useTeamMembers();
const { data: services = [] } = useServices();

    // Filter tasks by selected month
    const filteredTasks = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));

    return tasks.filter(task => {
        // Verificar que task.start_time existe
        if (!task.start_time) return false;
        const taskDate = parseISO(task.start_time);
        return taskDate >= start && taskDate <= end;
    });
}, [tasks, selectedMonth]);

    // Calculate metrics
    const totalHours = useMemo(() => {
        return filteredTasks.reduce((acc, task) => {
            if (task.start_time && task.end_time) {
                const start = new Date(task.start_time).getTime();
                const end = new Date(task.end_time).getTime();
                return acc + (end - start) / (1000 * 60 * 60);
            }
            return acc;
        }, 0);
    }, [filteredTasks]);

    const totalRevenue = useMemo(() => {
        return filteredTasks.reduce((acc, task) => {
            if (task.start_time && task.end_time && task.applied_hourly_rate) {
                const start = new Date(task.start_time).getTime();
                const end = new Date(task.end_time).getTime();
                const hours = (end - start) / (1000 * 60 * 60);
                return acc + (hours * task.applied_hourly_rate);
            }
            return acc;
        }, 0);
    }, [filteredTasks]);

    // Data for charts
    const hoursByProject = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredTasks.forEach(task => {
        if (!task.start_time || !task.end_time) return;
        const projectName = task.projects?.name || 'Sin proyecto';
        const hours = (new Date(task.end_time).getTime() - new Date(task.start_time).getTime()) / (1000 * 60 * 60);
        grouped[projectName] = (grouped[projectName] || 0) + hours;
    });
    return Object.entries(grouped).map(([name, hours]) => ({ name, hours: Math.round(hours * 10) / 10 }));
}, [filteredTasks]);

const hoursByService = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredTasks.forEach(task => {
        if (!task.start_time || !task.end_time) return;
        const serviceName = task.services?.name || 'Sin servicio';
        const hours = (new Date(task.end_time).getTime() - new Date(task.start_time).getTime()) / (1000 * 60 * 60);
        grouped[serviceName] = (grouped[serviceName] || 0) + hours;
    });
    return Object.entries(grouped).map(([name, value]) => ({ name, value: Math.round(value * 10) / 10 }));
}, [filteredTasks]);

    const dailyHours = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayTasks = filteredTasks.filter(t => t.start_time && t.start_time.startsWith(dayStr));
        const hours = dayTasks.reduce((acc, task) => {
            if (task.start_time && task.end_time) {
                return acc + (new Date(task.end_time).getTime() - new Date(task.start_time).getTime()) / (1000 * 60 * 60);
            }
            return acc;
        }, 0);
        return { date: format(day, 'd'), hours: Math.round(hours * 10) / 10 };
    });
}, [filteredTasks, selectedMonth]);

    // Generate PDF Report
    const generatePDF = () => {
        const doc = new jsPDF();
        const [year, month] = selectedMonth.split('-').map(Number);
        const monthName = format(new Date(year, month - 1), 'MMMM yyyy', { locale: es });

        // Header
        doc.setFontSize(20);
        doc.setTextColor(139, 92, 246); // Purple
        doc.text('Hormiwatch', 20, 20);

        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text(`Reporte de ${monthName}`, 20, 35);

        // Summary Stats
        doc.setFontSize(12);
        doc.text('Resumen General', 20, 50);

        doc.setFontSize(10);
        doc.text(`Total de Tareas: ${filteredTasks.length}`, 20, 60);
        doc.text(`Horas Trabajadas: ${totalHours.toFixed(1)}h`, 20, 68);
        doc.text(`Ingresos Generados: $${totalRevenue.toFixed(2)}`, 20, 76);
        doc.text(`Proyectos Activos: ${projects.length}`, 20, 84);

        // Hours by Project Table
        if (hoursByProject.length > 0) {
            doc.text('Horas por Proyecto', 20, 100);
            autoTable(doc, {
                startY: 105,
                head: [['Proyecto', 'Horas']],
                body: hoursByProject.map(p => [p.name, `${p.hours}h`]),
                theme: 'striped',
                headStyles: { fillColor: [139, 92, 246] }
            });
        }

        // Hours by Service Table
        const finalY = (doc as any).lastAutoTable?.finalY || 105;
        if (hoursByService.length > 0) {
            doc.text('Horas por Servicio', 20, finalY + 15);
            autoTable(doc, {
                startY: finalY + 20,
                head: [['Servicio', 'Horas']],
                body: hoursByService.map(s => [s.name, `${s.value}h`]),
                theme: 'striped',
                headStyles: { fillColor: [6, 182, 212] }
            });
        }

        // Detailed Tasks (if detailed report)
        if (reportType === 'detailed' && filteredTasks.length > 0) {
            doc.addPage();
            doc.setFontSize(14);
            doc.text('Detalle de Tareas', 20, 20);

            autoTable(doc, {
                startY: 30,
                head: [['Fecha', 'Proyecto', 'Servicio', 'Descripción', 'Horas', 'Tarifa']],
                body: filteredTasks.map(task => {
                    const hours = task.start_time && task.end_time
                        ? ((new Date(task.end_time).getTime() - new Date(task.start_time).getTime()) / (1000 * 60 * 60)).toFixed(1)
                        : '0';
                    return [
                        format(parseISO(task.start_time), 'dd/MM/yyyy'),
                        task.projects?.name || 'N/A',
                        task.services?.name || 'N/A',
                        (task.description || '').substring(0, 30),
                        `${hours}h`,
                        `$${task.applied_hourly_rate || 0}`
                    ];
                }),
                theme: 'grid',
                headStyles: { fillColor: [139, 92, 246], fontSize: 8 },
                bodyStyles: { fontSize: 7 },
                columnStyles: { 3: { cellWidth: 40 } }
            });
        }

        // Footer
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(`Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')} - Página ${i} de ${pageCount}`, 20, 285);
        }

        doc.save(`Reporte_Hormiwatch_${selectedMonth}.pdf`);
    };

    // Generate available months (last 12 months)
    const availableMonths = useMemo(() => {
        const months = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                value: format(date, 'yyyy-MM'),
                label: format(date, 'MMMM yyyy', { locale: es })
            });
        }
        return months;
    }, []);

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Reportes</h1>
                        <p className="text-muted-foreground">Visualiza y exporta reportes de productividad</p>
                    </div>
                    <div className="flex gap-2">
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Seleccionar mes" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableMonths.map(m => (
                                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={reportType} onValueChange={(v) => setReportType(v as any)}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="summary">Resumen</SelectItem>
                                <SelectItem value="detailed">Detallado</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button onClick={generatePDF} className="gap-2 shadow-glow">
                            <Download className="h-4 w-4" />
                            Exportar PDF
                        </Button>
                    </div>
                </div>

                {/* Metric Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                        <CardContent className="flex items-center gap-4 p-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                                <FileText className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">{filteredTasks.length}</p>
                                <p className="text-sm text-muted-foreground">Tareas</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                        <CardContent className="flex items-center gap-4 p-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10">
                                <Clock className="h-6 w-6 text-cyan-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">{totalHours.toFixed(1)}h</p>
                                <p className="text-sm text-muted-foreground">Horas</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                        <CardContent className="flex items-center gap-4 p-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
                                <TrendingUp className="h-6 w-6 text-green-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">${totalRevenue.toFixed(0)}</p>
                                <p className="text-sm text-muted-foreground">Ingresos</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                        <CardContent className="flex items-center gap-4 p-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                                <FolderKanban className="h-6 w-6 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">{hoursByProject.length}</p>
                                <p className="text-sm text-muted-foreground">Proyectos Activos</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts */}
                <Tabs defaultValue="daily" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="daily">Horas Diarias</TabsTrigger>
                        <TabsTrigger value="projects">Por Proyecto</TabsTrigger>
                        <TabsTrigger value="services">Por Servicio</TabsTrigger>
                    </TabsList>

                    <TabsContent value="daily">
                        <Card>
                            <CardHeader>
                                <CardTitle>Horas Trabajadas por Día</CardTitle>
                                <CardDescription>Distribución diaria del tiempo registrado</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={350}>
                                    <LineChart data={dailyHours}>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis dataKey="date" className="text-xs" />
                                        <YAxis className="text-xs" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="hours"
                                            stroke="hsl(var(--primary))"
                                            strokeWidth={2}
                                            dot={{ fill: 'hsl(var(--primary))' }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="projects">
                        <Card>
                            <CardHeader>
                                <CardTitle>Horas por Proyecto</CardTitle>
                                <CardDescription>Distribución de tiempo por proyecto</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={350}>
                                    <BarChart data={hoursByProject} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis type="number" className="text-xs" />
                                        <YAxis dataKey="name" type="category" width={150} className="text-xs" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                                        />
                                        <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="services">
                        <Card>
                            <CardHeader>
                                <CardTitle>Distribución por Servicio</CardTitle>
                                <CardDescription>Porcentaje de tiempo por tipo de servicio</CardDescription>
                            </CardHeader>
                            <CardContent className="flex justify-center">
                                <ResponsiveContainer width="100%" height={350}>
                                    <PieChart>
                                        <Pie
                                            data={hoursByService}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                            outerRadius={120}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {hoursByService.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
