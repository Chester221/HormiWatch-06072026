import { Plus, Clock, FolderPlus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const actions = [
  { label: "Log Time", icon: Clock, primary: true, action: "logTime" },
  { label: "New Task", icon: Plus, primary: false, action: "newTask" },
  { label: "New Project", icon: FolderPlus, primary: false, action: "newProject" },
  { label: "Add Member", icon: UserPlus, primary: false, action: "addMember" },
];

interface QuickActionsProps {
  onLogTime: () => void;
  onNewTask: () => void;
  onNewProject: () => void;
  onAddMember: () => void;
}

export function QuickActions({ onLogTime, onNewTask, onNewProject, onAddMember }: QuickActionsProps) {
  const handleClick = (action: string) => {
    switch (action) {
      case "logTime":
        onLogTime();
        break;
      case "newTask":
        onNewTask();
        break;
      case "newProject":
        onNewProject();
        break;
      case "addMember":
        onAddMember();
        break;
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card opacity-0 animate-fade-in" style={{ animationDelay: "300ms" }}>
      <h3 className="mb-4 text-lg font-semibold text-foreground">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => (
          <Button
            key={action.label}
            variant={action.primary ? "default" : "outline"}
            className={cn(
              "h-auto flex-col gap-2 py-4 transition-all duration-200",
              action.primary 
                ? "bg-primary hover:bg-primary/90 shadow-glow" 
                : "hover:bg-accent hover:border-primary/30",
              "opacity-0 animate-fade-in"
            )}
            style={{ animationDelay: `${350 + index * 50}ms` }}
            onClick={() => handleClick(action.action)}
          >
            <action.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}