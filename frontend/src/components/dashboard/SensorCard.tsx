import { LucideIcon } from 'lucide-react';

interface SensorCardProps {
  name: string;
  value: string | number;
  unit?: string;
  status: 'good' | 'warning' | 'danger';
  statusLabel: string;
  icon: LucideIcon;
  lastUpdated?: string;
}

const SensorCard = ({ name, value, unit, status, statusLabel, icon: Icon, lastUpdated }: SensorCardProps) => {
  const statusDotColors = {
    good: 'status-dot-good',
    warning: 'status-dot-warning',
    danger: 'status-dot-danger',
  };

  const statusTextColors = {
    good: 'text-status-good',
    warning: 'text-status-warning',
    danger: 'text-status-danger',
  };

  return (
    <div className="metric-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium text-foreground">{name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`status-dot ${statusDotColors[status]}`} />
          <span className={`text-xs font-medium ${statusTextColors[status]}`}>{statusLabel}</span>
        </div>
      </div>
      
      <div className="text-center py-3">
        <p className="text-3xl font-semibold text-foreground">
          {value}
          {unit && <span className="text-lg text-muted-foreground ml-1">{unit}</span>}
        </p>
      </div>

      {lastUpdated && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Last updated: {lastUpdated}
        </p>
      )}
    </div>
  );
};

export default SensorCard;
