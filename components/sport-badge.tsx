import { sportBadgeClass, sportLabel } from "@/lib/ui/theme";
import { cn } from "@/lib/utils";

export function SportBadge({
  sport,
  className,
}: {
  sport: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium",
        sportBadgeClass(sport),
        className,
      )}
    >
      {sportLabel(sport)}
    </span>
  );
}
