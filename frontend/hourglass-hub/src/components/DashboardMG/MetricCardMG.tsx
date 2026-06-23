import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardMGProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    positive: boolean;
  };
  className?: string;
  delay?: number;
}

export function MetricCardMG({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  className,
  delay = 0 
}: MetricCardMGProps) {
  const effectiveTrend = trend || (title.includes("Clientes") ? { value: 0, positive: true } : undefined);

  return (
    <div 
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5",
        "opacity-0 animate-fade-in",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Background decoration más grande */}
      <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-primary/5 transition-transform duration-300 group-hover:scale-150" />
      
      {/* Ícono más grande en esquina */}
      <div className="absolute right-5 top-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
          <Icon className="h-7 w-7" />
        </div>
      </div>

      {/* Contenido principal con más espacio y texto más grande */}
      <div className="space-y-3 pr-20 p-6 pb-4">
        <p className="text-base font-semibold text-muted-foreground">{title}</p>
        <p className="text-4xl font-bold tracking-tight text-foreground">{value}</p>
        {subtitle && (
          <p className="text-sm text-muted-foreground/80">{subtitle}</p>
        )}
      </div>

      {/* Tendencia con más espacio arriba */}
      {effectiveTrend && (
        <div className="px-6 pb-6 pt-0">
          <div className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
            effectiveTrend.positive 
              ? "bg-success/10 text-success" 
              : "bg-destructive/10 text-destructive"
          )}>
            <span className="font-semibold">{effectiveTrend.positive ? "+" : ""}{effectiveTrend.value}%</span>
            <span>vs semana pasada</span>
          </div>
        </div>
      )}
    </div>
  );
}