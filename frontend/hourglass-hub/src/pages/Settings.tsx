import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Bell, Moon, Sun, Shield, Trash2, Info, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Settings() {
    const { user, profile, updatePreferences } = useAuth();
    const [loading, setLoading] = useState(false);

    const [darkMode, setDarkMode] = useState(false);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [taskReminders, setTaskReminders] = useState(true);
    const [weeklySummary, setWeeklySummary] = useState(false);

    // Cargar preferencias desde el perfil
    useEffect(() => {
        if (profile) {
            setEmailNotifications(profile.email_notifications ?? true);
            setTaskReminders(profile.task_reminders ?? false);
            setWeeklySummary(profile.weekly_summary ?? false);
        }
        const savedDark = localStorage.getItem("darkMode") === "true";
        setDarkMode(savedDark);
        if (savedDark) document.documentElement.classList.add("dark");
    }, [profile]);

    const handleDarkModeToggle = (checked: boolean) => {
        setDarkMode(checked);
        localStorage.setItem("darkMode", String(checked));
        if (checked) {
            document.documentElement.classList.add("dark");
            toast.success("Modo oscuro activado");
        } else {
            document.documentElement.classList.remove("dark");
            toast.success("Modo claro activado");
        }
    };

    const handlePreferenceToggle = async (key: string, checked: boolean) => {
        try {
            await updatePreferences({ [key]: checked });
            toast.success("Preferencia actualizada");
        } catch (err: any) {
            toast.error("Error al guardar preferencia");
        }
    };

    const handleDeleteAccount = () => {
        if (confirm("¿Estás seguro? Esta acción no se puede deshacer.")) {
            toast.error("Eliminación de cuenta no implementada aún");
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="opacity-0 animate-fade-in">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Configuración</h1>
                    <p className="mt-1 text-muted-foreground">Personaliza tu experiencia en Hormiwatch</p>
                </div>

                {/* Apariencia */}
                <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "100ms" }}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Sun className="h-5 w-5" />Apariencia</CardTitle>
                        <CardDescription>Personaliza cómo se ve la aplicación</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Moon className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="font-medium text-foreground">Modo Oscuro</p>
                                    <p className="text-sm text-muted-foreground">Activa el tema oscuro para reducir fatiga visual</p>
                                </div>
                            </div>
                            <Switch checked={darkMode} onCheckedChange={handleDarkModeToggle} />
                        </div>
                    </CardContent>
                </Card>

                {/* Notificaciones */}
                <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "150ms" }}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />Notificaciones</CardTitle>
                        <CardDescription>Controla qué notificaciones recibes</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-foreground">Notificaciones por Email</p>
                                <p className="text-sm text-muted-foreground">Recibe actualizaciones de proyectos y tareas</p>
                            </div>
                            <Switch 
                                checked={emailNotifications} 
                                onCheckedChange={(v) => { setEmailNotifications(v); handlePreferenceToggle('email_notifications', v); }} 
                            />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-foreground">Recordatorios de Tareas</p>
                                <p className="text-sm text-muted-foreground">Notificaciones para tareas próximas a vencer</p>
                            </div>
                            <Switch 
                                checked={taskReminders} 
                                onCheckedChange={(v) => { setTaskReminders(v); handlePreferenceToggle('task_reminders', v); }} 
                            />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-foreground">Resumen Semanal</p>
                                <p className="text-sm text-muted-foreground">Recibe un resumen de tu productividad cada semana</p>
                            </div>
                            <Switch 
                                checked={weeklySummary} 
                                onCheckedChange={(v) => { setWeeklySummary(v); handlePreferenceToggle('weekly_summary', v); }} 
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Información */}
                <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "200ms" }}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Info className="h-5 w-5" />Información de la Cuenta</CardTitle>
                        <CardDescription>Detalles de tu cuenta</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><p className="text-sm text-muted-foreground">Email</p><p className="font-medium">{user?.email}</p></div>
                            <div><p className="text-sm text-muted-foreground">Rol</p><p className="font-medium">{profile?.role || 'Técnico'}</p></div>
                            <div><p className="text-sm text-muted-foreground">Nombre</p><p className="font-medium">{profile?.full_name || 'No configurado'}</p></div>
                            <div><p className="text-sm text-muted-foreground">Miembro desde</p><p className="font-medium">{user?.created_at ? new Date(user.created_at).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" }) : "N/A"}</p></div>
                        </div>
                    </CardContent>
                </Card>

                {/* Zona de Peligro */}
                <Card className="border-destructive/50 opacity-0 animate-fade-in" style={{ animationDelay: "250ms" }}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive"><Shield className="h-5 w-5" />Zona de Peligro</CardTitle>
                        <CardDescription>Acciones irreversibles</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div><p className="font-medium">Eliminar Cuenta</p><p className="text-sm text-muted-foreground">Elimina permanentemente tu cuenta y todos sus datos</p></div>
                            <Button variant="destructive" size="sm" className="gap-2" onClick={handleDeleteAccount}><Trash2 className="h-4 w-4" />Eliminar</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}