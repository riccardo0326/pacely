import {
  PROGRAM_STATUS_CLASS,
  PROGRAM_STATUS_LABEL,
  WORKOUT_STATUS_CLASS,
  WORKOUT_STATUS_LABEL,
  isProgramStatus,
} from "@/lib/ui/theme";
import { cn } from "@/lib/utils";

export function ProgramStatusBadge({ status }: { status: string }) {
  const label = isProgramStatus(status) ? PROGRAM_STATUS_LABEL[status] : status;
  const className = isProgramStatus(status)
    ? PROGRAM_STATUS_CLASS[status]
    : "bg-muted text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function WorkoutStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
        WORKOUT_STATUS_CLASS[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {WORKOUT_STATUS_LABEL[status] ?? status}
    </span>
  );
}
