import { AuditLogCard } from "./audit-log-card";
import type { AuditLogEntry } from "./audit-log-card";

interface AuditLogListProps {
  logs: AuditLogEntry[];
}

export function AuditLogList({ logs }: AuditLogListProps) {
  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <AuditLogCard key={log.id} log={log} />
      ))}
    </div>
  );
}
