import { Wind, Thermometer, Droplet, Users, Gauge, Waves } from 'lucide-react';
import SensorCard from '@/components/dashboard/SensorCard';

const sensors = [
  {
    name: 'Air Quality Index',
    value: 42,
    unit: 'AQI',
    status: 'good' as const,
    statusLabel: 'Good',
    icon: Wind,
    lastUpdated: '2 sec ago',
  },
  {
    name: 'Odour Level',
    value: 'Low',
    status: 'good' as const,
    statusLabel: 'Normal',
    icon: Gauge,
    lastUpdated: '5 sec ago',
  },
  {
    name: 'Occupancy Sensor',
    value: '3',
    unit: 'persons',
    status: 'warning' as const,
    statusLabel: 'Occupied',
    icon: Users,
    lastUpdated: 'Live',
  },
  {
    name: 'Temperature',
    value: 24,
    unit: '°C',
    status: 'good' as const,
    statusLabel: 'Normal',
    icon: Thermometer,
    lastUpdated: '10 sec ago',
  },
  {
    name: 'Humidity Level',
    value: 58,
    unit: '%',
    status: 'good' as const,
    statusLabel: 'Optimal',
    icon: Droplet,
    lastUpdated: '8 sec ago',
  },
  {
    name: 'Water Quality',
    value: 'Safe',
    status: 'good' as const,
    statusLabel: 'Potable',
    icon: Waves,
    lastUpdated: '1 min ago',
  },
];

const LiveSensors = () => {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-header mb-0">Live Sensor Monitoring</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="status-dot status-dot-good animate-pulse" />
          <span>Live Data</span>
        </div>
      </div>

      {/* Location Selector */}
      <div className="metric-card mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Currently Viewing</p>
            <p className="text-lg font-medium text-foreground">Washroom A - Ground Floor</p>
          </div>
          <select className="px-4 py-2 bg-secondary border border-border rounded-md text-sm font-medium text-foreground">
            <option>Washroom A - Ground Floor</option>
            <option>Washroom B - First Floor</option>
            <option>Washroom C - Second Floor</option>
            <option>Washroom D - Third Floor</option>
          </select>
        </div>
      </div>

      {/* Sensor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sensors.map((sensor) => (
          <SensorCard
            key={sensor.name}
            name={sensor.name}
            value={sensor.value}
            unit={sensor.unit}
            status={sensor.status}
            statusLabel={sensor.statusLabel}
            icon={sensor.icon}
            lastUpdated={sensor.lastUpdated}
          />
        ))}
      </div>
    </div>
  );
};

export default LiveSensors;
