import { Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Reports = () => {
  const reports = [
    { id: 1, name: 'Daily Usage Report', description: 'Washroom usage statistics for today', date: '2025-01-26' },
    { id: 2, name: 'Weekly Cleaning Summary', description: 'Cleaning tasks completed this week', date: '2025-01-20 - 2025-01-26' },
    { id: 3, name: 'Monthly Performance Report', description: 'Cleaner efficiency and task metrics', date: 'January 2025' },
    { id: 4, name: 'Sensor Health Report', description: 'Status and calibration data for all sensors', date: '2025-01-26' },
    { id: 5, name: 'Feedback Analysis', description: 'User satisfaction trends and insights', date: 'January 2025' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-header mb-0">Reports</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Select Date Range
          </Button>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((report) => (
          <Card key={report.id} className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">{report.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{report.date}</span>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="mt-8">
        <h2 className="text-base font-semibold mb-4">Quick Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="metric-card">
            <p className="text-sm text-muted-foreground">Total Usage (Today)</p>
            <p className="text-2xl font-semibold mt-1">247</p>
            <p className="text-xs text-status-good mt-1">↑ 12% from yesterday</p>
          </div>
          <div className="metric-card">
            <p className="text-sm text-muted-foreground">Tasks Completed (Today)</p>
            <p className="text-2xl font-semibold mt-1">18</p>
            <p className="text-xs text-status-good mt-1">100% completion rate</p>
          </div>
          <div className="metric-card">
            <p className="text-sm text-muted-foreground">Avg Response Time</p>
            <p className="text-2xl font-semibold mt-1">8 min</p>
            <p className="text-xs text-muted-foreground mt-1">From alert to action</p>
          </div>
          <div className="metric-card">
            <p className="text-sm text-muted-foreground">User Satisfaction</p>
            <p className="text-2xl font-semibold mt-1">4.2 / 5</p>
            <p className="text-xs text-status-warning mt-1">Based on 156 reviews</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
