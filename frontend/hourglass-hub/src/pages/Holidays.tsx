import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar as CalendarIcon, Trash2, RefreshCw, Plus } from "lucide-react";
import { useHolidays, Holiday } from "@/hooks/useHolidays";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Holidays() {
    const { holidays, addHoliday, deleteHoliday, syncHolidays } = useHolidays();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newHoliday, setNewHoliday] = useState<Partial<Holiday>>({
        date: new Date().toISOString().split('T')[0],
        name: "",
        is_working_day: false
    });

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newHoliday.date && newHoliday.name) {
            await addHoliday.mutateAsync(newHoliday as Omit<Holiday, 'id'>);
            setIsAddDialogOpen(false);
            setNewHoliday({
                date: new Date().toISOString().split('T')[0],
                name: "",
                is_working_day: false
            });
        }
    };

    const handleSync = async () => {
        const currentYear = new Date().getFullYear();
        await syncHolidays.mutateAsync(currentYear);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Feriados</h1>
                        <p className="text-muted-foreground">Gestiona los días feriados y no laborables (pago doble)</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={handleSync}
                            disabled={syncHolidays.isPending}
                        >
                            <RefreshCw className={`mr-2 h-4 w-4 ${syncHolidays.isPending ? 'animate-spin' : ''}`} />
                            Sincronizar {new Date().getFullYear()}
                        </Button>
                        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2 shadow-glow">
                                    <Plus className="h-4 w-4" />
                                    Agregar Feriado
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Agregar Nuevo Feriado</DialogTitle>
                                    <DialogDescription>
                                        Define un nuevo día feriado manualmente.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleAddSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Nombre de la festividad</Label>
                                        <Input
                                            id="name"
                                            value={newHoliday.name}
                                            onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                                            placeholder="Ej: Año Nuevo"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="date">Fecha</Label>
                                        <Input
                                            id="date"
                                            type="date"
                                            value={newHoliday.date}
                                            onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="working-day"
                                            checked={newHoliday.is_working_day}
                                            onCheckedChange={(checked) => setNewHoliday({ ...newHoliday, is_working_day: checked })}
                                        />
                                        <Label htmlFor="working-day">¿Es día laborable?</Label>
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" disabled={addHoliday.isPending}>Guardar</Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Festividad</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {holidays.isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8">Cargando feriados...</TableCell>
                                    </TableRow>
                                ) : holidays.data?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            No hay feriados registrados. Intenta sincronizar con la API.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    holidays.data?.map((holiday) => (
                                        <TableRow key={holiday.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                                    {format(new Date(holiday.date + 'T12:00:00'), "d 'de' MMMM, yyyy", { locale: es })}
                                                </div>
                                            </TableCell>
                                            <TableCell>{holiday.name}</TableCell>
                                            <TableCell>
                                                <Badge variant={holiday.is_working_day ? "outline" : "secondary"}>
                                                    {holiday.is_working_day ? "Laborable" : "Feriado Pago Doble"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                                    onClick={() => deleteHoliday.mutate(holiday.id)}
                                                    disabled={deleteHoliday.isPending}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
