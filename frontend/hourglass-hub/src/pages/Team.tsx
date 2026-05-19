import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Search,
  MoreVertical,
  Mail,
  Pencil,
  UserX,
  Shield,
  Wrench,
  Users
} from "lucide-react";
import { TeamMemberFormModal } from "@/components/team/TeamMemberFormModal";
import { useTeamMembers, useUpdateTeamMember, TeamMember } from "@/hooks/useTeamMembers";
import { useAuth } from "@/contexts/AuthContext";

export default function Team() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: teamMembers = [], isLoading } = useTeamMembers({ searchQuery });
  const updateMemberMutation = useUpdateTeamMember();
  const { user, refreshProfile } = useAuth();

  const [suspendDialog, setSuspendDialog] = useState<{ open: boolean; member: TeamMember | null }>({
    open: false,
    member: null,
  });
  const [formModal, setFormModal] = useState<{ open: boolean; member: TeamMember | null }>({
    open: false,
    member: null,
  });

  const admins = teamMembers.filter(m => m.role === "Admin" || m.role === "Manager");
  const technicians = teamMembers.filter(m => m.role === "Technician");

  const handleToggleSuspend = (member: TeamMember) => {
    setSuspendDialog({ open: true, member });
  };

  const confirmToggleSuspend = () => {
    if (!suspendDialog.member) return;
    toast.info("La suspensión de usuarios requiere backend logic.");
    setSuspendDialog({ open: false, member: null });
  };

  const handleEdit = (member: TeamMember) => {
    setFormModal({ open: true, member });
  };

  const handleAddMember = () => {
    setFormModal({ open: true, member: null });
  };

  // Manejar envío del formulario (crear/editar)
  const handleFormSubmit = (data: any) => {
    if (data.id) {
      // Es una edición
      updateMemberMutation.mutate({
        id: data.id,
        data: {
          full_name: data.full_name || data.name,
          email: data.email,
          role: data.role === 'admin' ? 'Admin' : data.role === 'technician' ? 'Technician' : data.role,
          avatar_url: data.avatar || undefined,
        }
      }, {
        onSuccess: () => {
          // Si editaste tu propio perfil, refrescar el contexto global
          if (data.id === user?.id) {
            refreshProfile();
          }
        }
      });
    } else {
      // Es creación (requiere backend adicional para crear usuarios)
      toast.info("La creación de usuarios requiere registro por email");
    }
    setFormModal({ open: false, member: null });
  };

  const getInitials = (name: string | null) => {
    return (name || "U").split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
  };

  const getDisplayName = (member: TeamMember) => member.full_name || member.email || "Usuario sin nombre";

  const MemberCard = ({ member }: { member: TeamMember }) => (
    <Card className={`relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/5`}>
      <CardContent className={`p-6`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-border/50">
              <AvatarImage src={member.avatar_url || ""} alt={getDisplayName(member)} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
                {getInitials(member.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground truncate max-w-[150px]" title={getDisplayName(member)}>
                {getDisplayName(member)}
              </h3>
              <Badge
                variant={member.role === "Manager" || member.role === "Admin" ? "default" : "secondary"}
                className="gap-1"
              >
                {member.role === "Manager" || member.role === "Admin" ? (
                  <Shield className="h-3 w-3" />
                ) : (
                  <Wrench className="h-3 w-3" />
                )}
                {member.role}
              </Badge>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleEdit(member)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleToggleSuspend(member)}
                className="text-destructive"
              >
                <UserX className="mr-2 h-4 w-4" />
                Suspend User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <a href={`mailto:${member.email}`} className="hover:text-primary transition-colors truncate">
              {member.email}
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Team</h1>
            <p className="text-muted-foreground">Gestiona los miembros de tu equipo y sus roles</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{teamMembers.length}</p>
                <p className="text-sm text-muted-foreground">Total Miembros</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
                <Shield className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{admins.length}</p>
                <p className="text-sm text-muted-foreground">Admin/Manager</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <Wrench className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{technicians.length}</p>
                <p className="text-sm text-muted-foreground">Técnicos</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-10">Cargando equipo...</div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">Líderes</h2>
                <Badge variant="outline" className="ml-2">{admins.length}</Badge>
              </div>

              {admins.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {admins.map(member => (
                    <MemberCard key={member.id} member={member} />
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Shield className="h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">No se encontraron líderes</p>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold text-foreground">Técnicos</h2>
                <Badge variant="outline" className="ml-2">{technicians.length}</Badge>
              </div>

              {technicians.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {technicians.map(member => (
                    <MemberCard key={member.id} member={member} />
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Wrench className="h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">No se encontraron técnicos</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>

      <AlertDialog open={suspendDialog.open} onOpenChange={(open) => setSuspendDialog({ open, member: suspendDialog.member })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend User</AlertDialogTitle>
            <AlertDialogDescription>
              Esta función requiere integración administrativa avanzada no disponible en esta demo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {formModal.open && (
        <TeamMemberFormModal
          open={formModal.open}
          onOpenChange={(open) => setFormModal({ open, member: open ? formModal.member : null })}
          member={formModal.member}
          onSubmit={handleFormSubmit}
        />
      )}
    </DashboardLayout>
  );
}