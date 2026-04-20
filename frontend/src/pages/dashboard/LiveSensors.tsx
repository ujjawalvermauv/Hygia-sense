import { useState, useEffect } from 'react';
import { Wind, Thermometer, Droplet, Users, Gauge, Waves, Loader, AlertCircle } from 'lucide-react';
import SensorCard from '@/components/dashboard/SensorCard';
import { getAllToilets } from '@/services/toiletService';
import { getSensorDataByToilet } from '@/services/sensorService';

interface Toilet {
  _id: string;
  name: string;
}

interface SensorData {
  toilet: string;
  aqi: number;
  humidity: number;
  temperature: number;
  waterLevel: number;
  waterQuality: string;
  occupancy: boolean;
  pir_motion: boolean;
  cleanliness: string;
  createdAt: string;
}

const getStatusFromValue = (value: number, type: 'aqi' | 'temp' | 'humidity') => {
  if (type === 'aqi') {
    if (value < 50) return 'good';
    if (value < 100) return 'warning';
    return 'danger';
  }
  if (type === 'temp') {
    if (value >= 20 && value <= 26) return 'good';
    return 'warning';
  }
  if (type === 'humidity') {
    if (value >= 40 && value <= 60) return 'good';
    if (value >= 30 && value <= 70) return 'warning';
    return 'danger';
  }
  return 'good';
};

const LiveSensors = () => {
  const [toilets, setToilets] = useState<Toilet[]>([]);
  const [selectedToiletId, setSelectedToiletId] = useState<string>('');
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Fetch toilets on mount
  useEffect(() => {
    const fetchToilets = async () => {
      try {
        setIsLoading(true);
        setError('');
        console.log('Fetching toilets...');
        const data = await getAllToilets();
        console.log('Toilets received:', data);
        
        if (data && data.length > 0) {
          setToilets(data);
          setSelectedToiletId(data[0]._id);
          console.log('Selected toilet:', data[0]._id);
        } else {
          setError('No toilets found. Please add toilets to the database.');
        }
      } catch (error) {
        console.error('Error fetching toilets:', error);
        setError(`Failed to fetch toilets: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchToilets();
  }, []);

  // Fetch sensor data when toilet changes
  useEffect(() => {
    if (!selectedToiletId) return;

    const fetchSensorData = async () => {
      try {
        console.log('Fetching sensor data for:', selectedToiletId);
        const data = await getSensorDataByToilet(selectedToiletId);
        console.log('Sensor data received:', data);
        
        if (!data) {
          console.warn('No sensor data returned');
          setError('No sensor data available yet. Please wait for sensor updates.');
        } else {
          setSensorData(data);
          setError('');
        }
      } catch (error) {
        console.error('Error fetching sensor data:', error);
        setError(`Failed to fetch sensor data: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    // Initial fetch
    fetchSensorData();

    // Poll every 5 seconds
    const interval = setInterval(fetchSensorData, 5000);

    return () => clearInterval(interval);
  }, [selectedToiletId]);

  const currentToilet = toilets.find(t => t._id === selectedToiletId);

  const sensorCards = sensorData ? [
    {
      name: 'Air Quality Index',
      value: Math.round(sensorData.aqi),
      unit: 'AQI',
      status: getStatusFromValue(sensorData.aqi, 'aqi') as 'good' | 'warning' | 'danger',
      statusLabel: sensorData.aqi < 50 ? 'Good' : sensorData.aqi < 100 ? 'Fair' : 'Poor',
      icon: Wind,
      lastUpdated: 'Live',
    },
    {
      name: 'Temperature',
      value: Math.round(sensorData.temperature * 10) / 10,
      unit: '°C',
      status: getStatusFromValue(sensorData.temperature, 'temp') as 'good' | 'warning' | 'danger',
      statusLabel: sensorData.temperature >= 20 && sensorData.temperature <= 26 ? 'Optimal' : 'Off-range',
      icon: Thermometer,
      lastUpdated: 'Live',
    },
    {
      name: 'Humidity Level',
      value: Math.round(sensorData.humidity),
      unit: '%',
      status: getStatusFromValue(sensorData.humidity, 'humidity') as 'good' | 'warning' | 'danger',
      statusLabel: sensorData.humidity >= 40 && sensorData.humidity <= 60 ? 'Optimal' : 'High',
      icon: Droplet,
      lastUpdated: 'Live',
    },
    {
      name: 'Water Levels',
      value: Math.round(sensorData.waterLevel),
      unit: '%',
      status: sensorData.waterLevel > 30 ? 'good' : 'danger',
      statusLabel: sensorData.waterLevel > 30 ? 'Adequate' : 'Low',
      icon: Waves,
      lastUpdated: 'Live',
    },
    {
      name: 'Occupancy',
      value: sensorData.occupancy ? 1 : 0,
      unit: sensorData.occupancy ? 'Occupied' : 'Empty',
      status: sensorData.occupancy ? 'warning' : 'good',
      statusLabel: sensorData.occupancy ? 'Occupied' : 'Vacant',
      icon: Users,
      lastUpdated: 'Live',
    },
    {
      name: 'Water Quality',
      value: sensorData.waterQuality === 'good' ? 'Safe' : 'Check',
      unit: '',
      status: sensorData.waterQuality === 'good' ? 'good' : sensorData.waterQuality === 'fair' ? 'warning' : 'danger',
      statusLabel: sensorData.waterQuality === 'good' ? 'Potable' : 'Needs Attention',
      icon: Gauge,
      lastUpdated: 'Live',
    },
  ] : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-header mb-0">Live Sensor Monitoring</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-block w-2 h-2 bg-status-good rounded-full animate-pulse" />
          <span>Live Data - Updates every 5 seconds</span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Location Selector */}
      <div className="metric-card mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Currently Viewing</p>
            <p className="text-lg font-medium text-foreground">
              {currentToilet?.name || 'Select a washroom'}
            </p>
          </div>
          {!isLoading && toilets.length > 0 && (
            <select 
              value={selectedToiletId}
              onChange={(e) => setSelectedToiletId(e.target.value)}
              className="px-4 py-2 bg-secondary border border-border rounded-md text-sm font-medium text-foreground"
            >
              {toilets.map((toilet) => (
                <option key={toilet._id} value={toilet._id}>
                  {toilet.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Sensor Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading sensor data...</span>
        </div>
      ) : sensorCards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sensorCards.map((sensor) => (
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
      ) : (
        <div className="flex items-center justify-center py-12 bg-muted/30 rounded-lg border border-border">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No sensor data available</p>
            <p className="text-sm text-muted-foreground mt-2">Please wait for sensor updates or check the backend connection</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveSensors;


