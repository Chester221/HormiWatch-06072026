import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
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

export function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  className,
  delay = 0 
}: MetricCardProps) {
  return (
    <div 
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5",
        "opacity-0 animate-fade-in",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Background decoration */}
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/5 transition-transform duration-300 group-hover:scale-150" />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              trend.positive 
                ? "bg-success/10 text-success" 
                : "bg-destructive/10 text-destructive"
            )}>
              <span>{trend.positive ? "+" : ""}{trend.value}%</span>
              <span>vs semana pasada</span>
            </div>
          )}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}