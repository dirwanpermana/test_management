export function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    'Pass': '#16a34a',
    'Fail': '#dc2626',
    'Blocked': '#d97706',
    'On Hold': '#6b7280',
    'Not Executed': '#9ca3af',
    'Open': '#dc2626',
    'Ready to Test': '#2563eb',
    'Reopen': '#d97706',
    'Closed': '#16a34a',
    'Rejected': '#6b7280',
    'Complete': '#16a34a',
    'On Progress': '#2563eb',
    'Hold': '#6b7280',
  };
  const color = colorMap[status] ?? '#374151';
  return (
    <span
      style={{
        background: `${color}1a`,
        color,
        border: `1px solid ${color}55`,
        borderRadius: 999,
        padding: '2px 10px',
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  );
}
