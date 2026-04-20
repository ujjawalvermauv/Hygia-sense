import { useEffect, useState } from 'react';
import { AlertCircle, Wind, Clock, CloudRain } from 'lucide-react';
import { getAiOverview, type AiToiletInsight } from '@/services/aiService';

type ToiletStatus = 'available' | 'occupied' | 'alert' | 'dirty';

interface ToiletUnit {
  id: string;
  name: string;
  type: 'Male' | 'Female';
  status: ToiletStatus;
  users: number;
  since: string;
  hasAlert: boolean;
  aqi: number;
  odour: number;
  lastCleaned: string;
  needsCleaning: boolean;
}

const TVDisplay = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastUpdate, setLastUpdate] = useState('syncing...');
  const [toilets, setToilets] = useState<ToiletUnit[]>([
    { id: 'T1', name: 'Toilet 1', type: 'Male', status: 'available', users: 10, since: 'last hour', hasAlert: false, aqi: 32, odour: 20, lastCleaned: '10:15 AM', needsCleaning: false },
    { id: 'T2', name: 'Toilet 2', type: 'Male', status: 'available', users: 10, since: 'last hour', hasAlert: false, aqi: 35, odour: 22, lastCleaned: '10:20 AM', needsCleaning: false },
    { id: 'T3', name: 'Toilet 3', type: 'Female', status: 'available', users: 10, since: 'last hour', hasAlert: false, aqi: 40, odour: 28, lastCleaned: '10:05 AM', needsCleaning: false },
    { id: 'T4', name: 'Toilet 4', type: 'Female', status: 'available', users: 10, since: 'last hour', hasAlert: false, aqi: 37, odour: 24, lastCleaned: '10:10 AM', needsCleaning: false },
  ]);

  const inferType = (name: string, index: number): 'Male' | 'Female' => {
    const lower = name.toLowerCase();
    if (lower.includes('female') || lower.includes('girls') || lower.includes('women')) return 'Female';
    if (lower.includes('male') || lower.includes('boys') || lower.includes('men')) return 'Male';
    return index % 2 === 0 ? 'Male' : 'Female';
  };

  const getLastUpdateLabel = (isoTime?: string) => {
    if (!isoTime) return 'syncing...';
    const mins = Math.max(0, Math.round((Date.now() - new Date(isoTime).getTime()) / 60000));
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} minutes ago`;
    const hours = Math.round(mins / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  };

  const mapInsightToUnit = (insight: AiToiletInsight, index: number): ToiletUnit => {
    const isDirty = insight.riskScore >= 60 || insight.metrics.latestWaterQuality === 'poor';
    const isOccupied = insight.metrics.latestOccupancy;

    const status: ToiletStatus = isDirty
      ? 'dirty'
      : isOccupied
        ? 'occupied'
        : 'available';

    const sensorTimestamp = insight.latestSensorAt || insight.nextCleaningAt;

    return {
      id: insight.toiletId,
      name: insight.toiletName,
      type: inferType(insight.toiletName, index),
      status,
      users: Math.max(1, insight.metrics.avgUsagePerHour),
      since: 'last hour',
      hasAlert: insight.riskScore >= 80,
      aqi: insight.metrics.avgAqi,
      odour: Math.min(100, Math.max(10, Math.round((insight.metrics.avgAqi / 150) * 100))),
      lastCleaned: new Date(sensorTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      needsCleaning: isDirty,
    };
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchLiveDisplayData = async () => {
      try {
        const data = await getAiOverview();
        const mapped = data.insights.slice(0, 4).map(mapInsightToUnit);

        if (mapped.length > 0) {
          setToilets(mapped);
        }

        setLastUpdate(getLastUpdateLabel(data.summary.generatedAt));
      } catch (error) {
        console.error('Failed to fetch live TV display data:', error);
      }
    };

    fetchLiveDisplayData();
    const intervalId = setInterval(fetchLiveDisplayData, 8000);

    return () => clearInterval(intervalId);
  }, []);

  const getStatusColor = (status: ToiletStatus, needsCleaning: boolean) => {
    if (needsCleaning) return 'bg-rose-400';
    switch (status) {
      case 'available': return 'bg-teal-400';
      case 'occupied': return 'bg-amber-400';
      case 'alert': return 'bg-rose-400';
      case 'dirty': return 'bg-rose-400';
    }
  };

  const getAqiColor = (aqi: number) => {
    if (aqi <= 50) return 'text-teal-600 bg-teal-50';
    if (aqi <= 100) return 'text-amber-600 bg-amber-50';
    return 'text-rose-600 bg-rose-50';
  };

  const getOdourColor = (odour: number) => {
    if (odour <= 40) return 'text-teal-600 bg-teal-50';
    if (odour <= 70) return 'text-amber-600 bg-amber-50';
    return 'text-rose-600 bg-rose-50';
  };

  // Toilet cubicle with door - architectural top-down view
  const ToiletCubicle = ({ toilet, position }: { toilet: ToiletUnit; position: 'left' | 'right' }) => {
    const statusColor = getStatusColor(toilet.status, toilet.needsCleaning);
    const aqiColor = getAqiColor(toilet.aqi);
    const odourColor = getOdourColor(toilet.odour);
    
    return (
      <div className="relative flex flex-col items-center">
        {/* Cubicle container */}
        <div className={`relative w-44 h-56 ${statusColor} rounded-sm`}>
          {/* Wall borders */}
          <div className="absolute inset-0 border-4 border-slate-500 rounded-sm" />
          
          {/* Door opening at bottom */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-white" />
          
          {/* Door swing arc (curved line) */}
          <div className={`absolute bottom-4 ${position === 'left' ? 'left-14' : 'right-14'} w-12 h-12`}>
            <svg viewBox="0 0 50 50" className="w-full h-full">
              <path 
                d={position === 'left' 
                  ? "M 25 50 A 25 25 0 0 1 0 25" 
                  : "M 25 50 A 25 25 0 0 0 50 25"
                }
                fill="none" 
                stroke="#64748b" 
                strokeWidth="1.5"
                strokeDasharray="3 2"
              />
            </svg>
          </div>
          
          {/* Door */}
          <div 
            className={`absolute bottom-0 w-16 h-1.5 bg-slate-600 origin-bottom ${
              position === 'left' ? 'left-14 rotate-[-45deg]' : 'right-14 rotate-[45deg]'
            }`} 
            style={{ transformOrigin: position === 'left' ? 'left bottom' : 'right bottom' }}
          />
          
          {/* Toilet fixture - top down view */}
          <div className="absolute left-1/2 top-6 -translate-x-1/2">
            <div className="relative">
              {/* Toilet bowl */}
              <div className="w-12 h-16 bg-white rounded-t-full rounded-b-3xl border-2 border-slate-300 shadow-inner" />
              {/* Seat */}
              <div className="absolute top-1 left-1 right-1 h-6 bg-slate-100 rounded-t-full border border-slate-200" />
            </div>
          </div>
          
          {/* Alert indicator for needs cleaning */}
          {toilet.needsCleaning && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2">
              <div className="px-3 py-1 bg-rose-600 text-white text-xs font-bold rounded-full shadow-md animate-pulse">
                NEEDS CLEANING
              </div>
            </div>
          )}
          
          {/* Alert indicator */}
          {toilet.hasAlert && !toilet.needsCleaning && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md animate-pulse">
                <AlertCircle className="w-6 h-6 text-rose-500" />
              </div>
            </div>
          )}
          
          {/* Occupied indicator */}
          {toilet.status === 'occupied' && !toilet.hasAlert && !toilet.needsCleaning && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2">
              <div className="px-3 py-1 bg-amber-600 text-white text-xs font-bold rounded-full shadow-md">
                OCCUPIED
              </div>
            </div>
          )}
          
          {/* Status dot for available */}
          {toilet.status === 'available' && !toilet.hasAlert && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2">
              <div className="w-4 h-4 bg-slate-700 rounded-full" />
            </div>
          )}
          
          {/* Toilet name */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center">
            <p className="text-sm font-semibold text-slate-800">{toilet.name}</p>
            <p className="text-xs text-slate-600">({toilet.type})</p>
          </div>
        </div>
        
        {/* Info panel below cubicle */}
        <div className={`mt-3 w-44 rounded-lg shadow-sm border p-2.5 space-y-1.5 ${toilet.needsCleaning ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-200'}`}>
          {/* AQI */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Wind className="w-3 h-3" /> AQI
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${aqiColor}`}>
              {toilet.aqi}
            </span>
          </div>
          
          {/* Odour Level */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <CloudRain className="w-3 h-3" /> Odour
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${odourColor}`}>
              {toilet.odour}
            </span>
          </div>
          
          {/* Last Cleaned */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Cleaned
            </span>
            <span className={`text-xs font-semibold ${toilet.needsCleaning ? 'text-rose-600' : 'text-slate-700'}`}>
              {toilet.lastCleaned}
            </span>
          </div>
          
          {/* Usage stats */}
          <div className="pt-1 border-t border-slate-100">
            <div className="text-center">
              <span className="text-xs font-bold text-slate-700">{toilet.users} users</span>
              <span className="text-xs text-slate-400 ml-1">since {toilet.since}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Side amenity icon (soap dispenser, hand dryer, etc.)
  const SideAmenity = ({ type, hasAlert }: { type: 'dispenser' | 'dryer'; hasAlert?: boolean }) => (
    <div className="relative flex flex-col items-center gap-2">
      <div className="w-8 h-12 bg-slate-300 rounded border border-slate-400 flex items-center justify-center">
        <div className="w-4 h-6 bg-slate-400 rounded-sm" />
      </div>
      {hasAlert && (
        <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center shadow border border-rose-200 animate-pulse">
          <AlertCircle className="w-4 h-4 text-rose-500" />
        </div>
      )}
      {!hasAlert && type === 'dryer' && (
        <div className="w-3 h-3 bg-teal-500 rounded-full" />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-slate-800">Smart Toilet Monitoring - Corporate Office</h1>
          <p className="text-sm text-slate-500 mt-1">Data last update {lastUpdate}</p>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-8 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-teal-400 rounded" />
              <span className="text-sm text-slate-600">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-amber-400 rounded" />
              <span className="text-sm text-slate-600">Occupied</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-rose-400 rounded" />
              <span className="text-sm text-slate-600">Needs Cleaning</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              <span className="text-sm text-slate-600">Attention Required</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Floor Plan */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="relative">
          {/* Outer building frame */}
          <div className="relative bg-slate-200 p-4 rounded-lg">
            {/* Top corridor/roof */}
            <div className="h-8 bg-slate-400 rounded-t-lg mb-1 flex items-center justify-center">
              <div className="flex gap-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="w-8 h-3 bg-slate-300 rounded-sm" />
                ))}
              </div>
            </div>
            
            {/* Service room */}
            <div className="bg-slate-300 py-4 px-8 text-center border-y-4 border-slate-500">
              <span className="text-slate-600 font-medium tracking-wide">Service &amp; Maintenance Room</span>
            </div>
            
            {/* Main toilet area */}
            <div className="bg-slate-200 pt-4 pb-2 px-2">
              <div className="flex items-start justify-center gap-2">
                {/* Left side amenities */}
                <div className="flex flex-col gap-4 pt-8">
                  <SideAmenity type="dispenser" hasAlert />
                  <SideAmenity type="dryer" />
                </div>
                
                {/* Left wall */}
                <div className="w-3 bg-slate-500 self-stretch rounded-sm" />
                
                {/* Toilet cubicles */}
                <div className="flex gap-1 bg-slate-400 p-2 rounded-b-lg">
                  {toilets.map((toilet, index) => (
                    <div key={toilet.id} className="flex">
                      <ToiletCubicle 
                        toilet={toilet} 
                        position={index % 2 === 0 ? 'left' : 'right'} 
                      />
                      {index < toilets.length - 1 && (
                        <div className="w-1 bg-slate-500 mx-1" />
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Right wall */}
                <div className="w-3 bg-slate-500 self-stretch rounded-sm" />
                
                {/* Right side amenities */}
                <div className="flex flex-col gap-4 pt-8">
                  <SideAmenity type="dispenser" />
                  <SideAmenity type="dryer" hasAlert={false} />
                </div>
              </div>
            </div>
            
            {/* Bottom frame */}
            <div className="h-4 bg-slate-400 rounded-b-lg mt-1" />
          </div>
          
          {/* Corner indicators */}
          <div className="absolute -bottom-2 -left-2 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow border border-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-teal-500 rounded-full shadow" />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              <span className="text-sm text-slate-600">Requires Attention</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-slate-700 rounded-full" />
              <span className="text-sm text-slate-600">Sensor Active</span>
            </div>
          </div>
          
          <div className="text-slate-400 text-sm">
            Powered by <span className="font-semibold text-slate-600">Hygia Sense</span> • Auto-refreshing
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TVDisplay;
