import { Button } from "@/components/ui/button";
import { Clock, Plus, FolderPlus, UserPlus } from "lucide-react";

interface QuickActionsProps {
  onLogTime: () => void;
  onNewTask: () => void;
  onNewProject: () => void;
  onAddMember: () => void;
}

export function QuickActions({ onLogTime, onNewTask, onNewProject, onAddMember }: QuickActionsProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        <Button onClick={onLogTime} className="gap-2 h-auto py-3">
          <Clock className="h-4 w-4" />
          Log Time
        </Button>
        <Button onClick={onNewTask} variant="outline" className="gap-2 h-auto py-3">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
        <Button onClick={onNewProject} variant="outline" className="gap-2 h-auto py-3">
          <FolderPlus className="h-4 w-4" />
          New Project
        </Button>
        <Button onClick={onAddMember} variant="outline" className="gap-2 h-auto py-3">
          <UserPlus className="h-4 w-4" />
          Add Member
        </Button>
      </div>
    </div>
  );
}