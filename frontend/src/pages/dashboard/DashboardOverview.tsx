import { 
  Wind, 
  Users, 
  Sparkles, 
  TrendingUp, 
  ClipboardList,
  AlertCircle
} from 'lucide-react';
import MetricCard from '@/components/dashboard/MetricCard';
import StatusBadge from '@/components/dashboard/StatusBadge';

const recentAlerts = [
  { id: 1, message: 'Washroom B - AQI level exceeded threshold', time: '5 min ago', severity: 'warning' as const },
  { id: 2, message: 'Washroom A - Cleaning completed successfully', time: '12 min ago', severity: 'good' as const },
  { id: 3, message: 'Washroom C - High occupancy detected', time: '18 min ago', severity: 'info' as const },
];

const DashboardOverview = () => {
  return (
    <div>
      <h1 className="page-header">Dashboard Overview</h1>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <MetricCard
          title="Air Quality Index"
          value="Good"
          icon={Wind}
          status="good"
          subtitle="AQI: 42"
        />
        <MetricCard
          title="Current Occupancy"
          value="3 / 8"
          icon={Users}
          status="warning"
          subtitle="37.5% capacity"
        />
        <MetricCard
          title="Cleanliness Status"
          value="Clean"
          icon={Sparkles}
          status="good"
          subtitle="Last cleaned: 45 min ago"
        />
        <MetricCard
          title="Today's Usage"
          value="247"
          icon={TrendingUp}
          subtitle="Total entries"
        />
        <MetricCard
          title="Pending Tasks"
          value="2"
          icon={ClipboardList}
          status="warning"
          subtitle="Awaiting assignment"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Washroom Status Summary */}
        <div className="metric-card">
          <h2 className="text-base font-semibold text-foreground mb-4">Washroom Status Summary</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 pr-4">Location</th>
                  <th className="pb-3 pr-4">AQI</th>
                  <th className="pb-3 pr-4">Occupancy</th>
                  <th className="pb-3">Cleanliness</th>
                </tr>
              </thead>
              <tbody>
                <tr className="table-row-hover border-b border-border">
                  <td className="py-3 pr-4 font-medium text-sm">Washroom A - Ground Floor</td>
                  <td className="py-3 pr-4"><StatusBadge status="good" label="Good" /></td>
                  <td className="py-3 pr-4"><StatusBadge status="info" label="Vacant" /></td>
                  <td className="py-3"><StatusBadge status="good" label="Clean" /></td>
                </tr>
                <tr className="table-row-hover border-b border-border">
                  <td className="py-3 pr-4 font-medium text-sm">Washroom B - First Floor</td>
                  <td className="py-3 pr-4"><StatusBadge status="warning" label="Moderate" /></td>
                  <td className="py-3 pr-4"><StatusBadge status="warning" label="Occupied" /></td>
                  <td className="py-3"><StatusBadge status="good" label="Clean" /></td>
                </tr>
                <tr className="table-row-hover border-b border-border">
                  <td className="py-3 pr-4 font-medium text-sm">Washroom C - Second Floor</td>
                  <td className="py-3 pr-4"><StatusBadge status="good" label="Good" /></td>
                  <td className="py-3 pr-4"><StatusBadge status="warning" label="Occupied" /></td>
                  <td className="py-3"><StatusBadge status="danger" label="Needs Cleaning" /></td>
                </tr>
                <tr className="table-row-hover">
                  <td className="py-3 pr-4 font-medium text-sm">Washroom D - Third Floor</td>
                  <td className="py-3 pr-4"><StatusBadge status="good" label="Good" /></td>
                  <td className="py-3 pr-4"><StatusBadge status="info" label="Vacant" /></td>
                  <td className="py-3"><StatusBadge status="good" label="Clean" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="metric-card">
          <h2 className="text-base font-semibold text-foreground mb-4">Recent Alerts</h2>
          <div className="space-y-3">
            {recentAlerts.map((alert) => (
              <div 
                key={alert.id} 
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
              >
                <AlertCircle className={`w-4 h-4 mt-0.5 ${
                  alert.severity === 'good' ? 'text-status-good' :
                  alert.severity === 'warning' ? 'text-status-warning' :
                  'text-status-info'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
