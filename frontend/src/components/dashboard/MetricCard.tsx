import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  status?: 'good' | 'warning' | 'danger' | 'info';
  subtitle?: string;
}

const MetricCard = ({ title, value, icon: Icon, status, subtitle }: MetricCardProps) => {
  const statusColors = {
    good: 'text-status-good',
    warning: 'text-status-warning',
    danger: 'text-status-danger',
    info: 'text-status-info',
  };

  const statusDotColors = {
    good: 'status-dot-good',
    warning: 'status-dot-warning',
    danger: 'status-dot-danger',
    info: 'status-dot-info',
  };

  return (
    <div className="metric-card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <div className="flex items-center gap-2 mt-2">
            {status && <span className={`status-dot ${statusDotColors[status]}`} />}
            <p className={`text-2xl font-semibold ${status ? statusColors[status] : 'text-foreground'}`}>
              {value}
            </p>
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
