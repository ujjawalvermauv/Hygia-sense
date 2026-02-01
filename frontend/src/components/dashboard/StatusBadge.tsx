interface StatusBadgeProps {
  status: 'good' | 'warning' | 'danger' | 'info';
  label: string;
}

const StatusBadge = ({ status, label }: StatusBadgeProps) => {
  const statusStyles = {
    good: 'bg-status-good text-status-good-foreground',
    warning: 'bg-status-warning text-status-warning-foreground',
    danger: 'bg-status-danger text-status-danger-foreground',
    info: 'bg-status-info text-status-info-foreground',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${statusStyles[status]}`}>
      {label}
    </span>
  );
};

export default StatusBadge;
