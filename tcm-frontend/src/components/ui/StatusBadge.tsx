export function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    // test case item status
    'Pass': '#16a34a',
    'Fail': '#dc2626',
    'Blocked': '#d97706',
    'On Hold': '#6b7280',
    'Not Executed': '#9ca3af',
    // bug status
    'Open': '#dc2626',
    'On Progress Dev': '#7c3aed',
    'Ready to Test': '#2563eb',
    'On Progress QA': '#0891b2',
    'Reopen': '#d97706',
    'Close': '#16a34a',
    'Take Out': '#6b7280',
    'Hold': '#78716c',
    // legacy status labels (dijaga supaya data lama tidak pecah tampilannya)
    'Closed': '#16a34a',
    'Rejected': '#6b7280',
    // monitoring category
    'Complete': '#16a34a',
    'On Progress': '#2563eb',
    // severity
    'Critical': '#7f1d1d',
    'Major': '#dc2626',
    // priority (Medium/Low dipakai bersama di atas)
    'High': '#ea580c',
    'Medium': '#d97706',
    'Low': '#65a30d',
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
