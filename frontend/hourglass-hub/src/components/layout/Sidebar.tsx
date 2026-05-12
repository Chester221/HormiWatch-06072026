import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  UserCircle,
  Briefcase,
  Settings,
  Clock,
  User,
  Calendar,
  FileBarChart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

// Definición de navegación con roles
interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  managerOnly?: boolean; // Solo visible para líderes
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Proyectos", href: "/projects", icon: FolderKanban, managerOnly: true },
  { name: "Mis Tareas", href: "/tasks", icon: CheckSquare },
  { name: "Clientes", href: "/clients", icon: Briefcase, managerOnly: true },
  { name: "Equipo", href: "/team", icon: Users, managerOnly: true },
  { name: "Servicios", href: "/services", icon: UserCircle, managerOnly: true },
  { name: "Feriados", href: "/holidays", icon: Calendar, managerOnly: true },
  { name: "Reportes", href: "/reports", icon: FileBarChart, managerOnly: true },
];

const bottomNavigation: NavItem[] = [
  { name: "Mi Perfil", href: "/profile", icon: User },
  { name: "Configuración", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const { isManager, profile } = useAuth();

  // Filtrar navegación según rol
  const filteredNavigation = navigation.filter(item => {
    if (item.managerOnly && !isManager) return false;
    return true;
  });

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <Clock className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-sidebar-accent-foreground">
            Hormiwatch
          </span>
        </div>

        {/* Indicador de Rol */}
        <div className="px-3 py-3">
          <div className={cn(
            "rounded-lg px-3 py-2 text-xs font-medium",
            isManager
              ? "bg-primary/10 text-primary border border-primary/20"
              : "bg-muted text-muted-foreground"
          )}>
            {isManager ? "🎯 Manager" : "👨‍💻 Técnico"}
          </div>
        </div>

        {/* Navigation Principal */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          <p className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
            Principal
          </p>
          {filteredNavigation.map((item, index) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-all duration-200",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                "opacity-0 animate-slide-in-left"
              )}
              activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-glow"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <item.icon className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
              {item.name}
            </NavLink>
          ))}

          {/* Separador */}
          <div className="my-4" />

          <p className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
            Cuenta
          </p>
          {bottomNavigation.map((item, index) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-all duration-200",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                "opacity-0 animate-slide-in-left"
              )}
              activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-glow"
              style={{ animationDelay: `${(filteredNavigation.length + index) * 50}ms` }}
            >
              <item.icon className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-xl bg-sidebar-accent/50 p-3">
            <p className="text-xs text-sidebar-muted">
              {profile?.full_name || "Usuario"}
            </p>
            <p className="text-xs text-sidebar-muted">© 2024 Hormiwatch</p>
          </div>
        </div>
      </div>
    </aside>
  );
}