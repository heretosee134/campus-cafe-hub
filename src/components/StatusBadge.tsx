import { Badge } from "@/components/ui/badge";

const styles: Record<string, string> = {
  pending: "bg-status-pending/15 text-status-pending border-status-pending/30",
  preparing: "bg-status-preparing/15 text-status-preparing border-status-preparing/30",
  ready: "bg-status-ready/15 text-status-ready border-status-ready/30",
  collected: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-status-cancelled/15 text-status-cancelled border-status-cancelled/30",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={`capitalize font-medium ${styles[status] ?? ""}`}>
      {status.replace("_", " ")}
    </Badge>
  );
}
