import { useEffect, useMemo, useState } from 'react';
import { Calendar, Download, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAllTasks } from '@/services/taskService';
import { getAllToilets } from '@/services/toiletService';
import { getAllSensorData } from '@/services/sensorService';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type DateRange = 'today' | 'week' | 'month' | 'all';

interface TaskRow {
  _id: string;
  status?: string;
  priority?: string;
  createdAt?: string;
  completedAt?: string;
  approvalStatus?: string;
  completionEfficiency?: number;
  issueReports?: { severity?: string }[];
  toilet?: {
    name?: string;
    toiletNumber?: string;
    floor?: string;
  };
  cleaner?: {
    name?: string;
  };
}

interface ToiletRow {
  _id: string;
  name?: string;
  toiletNumber?: string;
  floor?: string;
  cleanlinessStatus?: string;
}

interface SensorRow {
  toilet?: string;
  aqi?: number;
  waterCondition?: string;
  occupancy?: boolean;
  createdAt?: string;
}

interface CleanerSummary {
  cleanerName: string;
  taskCount: number;
  completedCount: number;
  pendingCount: number;
  avgEfficiency: number;
  issueCount: number;
}

const formatDateTime = (value?: string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString();
};

const getRangeStart = (range: DateRange) => {
  const now = new Date();
  if (range === 'all') return null;

  const start = new Date(now);
  if (range === 'today') {
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (range === 'week') {
    start.setDate(now.getDate() - 7);
    return start;
  }

  start.setMonth(now.getMonth() - 1);
  return start;
};

const escapeCsv = (value: string | number | boolean | null | undefined) => {
  const safe = value === null || value === undefined ? '' : String(value);
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
};

const downloadCsv = (filename: string, headers: string[], rows: Array<Array<string | number | boolean | null | undefined>>) => {
  const csv = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const downloadPdf = (filename: string, title: string, headers: string[], rows: Array<Array<string | number | boolean | null | undefined>>) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  const generatedAt = new Date().toLocaleString();

  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(10);
  doc.text(`Generated: ${generatedAt}`, 14, 22);

  autoTable(doc, {
    head: [headers],
    body: rows.map((row) => row.map((cell) => (cell === null || cell === undefined ? '' : String(cell)))),
    startY: 28,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [31, 41, 55] },
  });

  doc.save(filename);
};

const Reports = () => {
  const [range, setRange] = useState<DateRange>('week');
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [toilets, setToilets] = useState<ToiletRow[]>([]);
  const [sensors, setSensors] = useState<SensorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReports = async () => {
    try {
      setLoading(true);
      const [taskData, toiletData, sensorData] = await Promise.all([
        getAllTasks(),
        getAllToilets(),
        getAllSensorData(),
      ]);

      setTasks(Array.isArray(taskData) ? taskData : []);
      setToilets(Array.isArray(toiletData) ? toiletData : []);
      setSensors(Array.isArray(sensorData) ? sensorData : []);
      setError('');
    } catch (err) {
      console.error('Failed to load reports:', err);
      setError('Unable to load reports right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const filteredTasks = useMemo(() => {
    const start = getRangeStart(range);
    if (!start) return tasks;

    return tasks.filter((task) => {
      if (!task.createdAt) return false;
      return new Date(task.createdAt) >= start;
    });
  }, [tasks, range]);

  const completedTasks = filteredTasks.filter((task) => task.status === 'completed').length;
  const pendingTasks = filteredTasks.filter((task) => task.status === 'assigned' || task.status === 'in-progress' || task.status === 'pending-approval').length;
  const avgEfficiency = filteredTasks.length
    ? Math.round(filteredTasks.reduce((acc, task) => acc + (task.completionEfficiency || 0), 0) / filteredTasks.length)
    : 0;
  const issueCount = filteredTasks.reduce((acc, task) => acc + (task.issueReports?.length || 0), 0);

  const sensorByToiletId = useMemo(() => {
    const map = new Map<string, SensorRow>();
    for (const row of sensors) {
      if (row.toilet) {
        map.set(String(row.toilet), row);
      }
    }
    return map;
  }, [sensors]);

  const latestTasksForView = filteredTasks.slice(0, 12);

  const cleanerSummaries = useMemo<CleanerSummary[]>(() => {
    const map = new Map<string, CleanerSummary>();

    for (const task of filteredTasks) {
      const cleanerName = task.cleaner?.name || 'Unassigned';
      const existing = map.get(cleanerName) || {
        cleanerName,
        taskCount: 0,
        completedCount: 0,
        pendingCount: 0,
        avgEfficiency: 0,
        issueCount: 0,
      };

      existing.taskCount += 1;
      if (task.status === 'completed') {
        existing.completedCount += 1;
      } else {
        existing.pendingCount += 1;
      }
      existing.avgEfficiency += task.completionEfficiency || 0;
      existing.issueCount += task.issueReports?.length || 0;
      map.set(cleanerName, existing);
    }

    return Array.from(map.values())
      .map((row) => ({
        ...row,
        avgEfficiency: row.taskCount ? Math.round(row.avgEfficiency / row.taskCount) : 0,
      }))
      .sort((a, b) => b.taskCount - a.taskCount);
  }, [filteredTasks]);

  const monthlySummary = useMemo(() => {
    const now = new Date();
    const monthLabels: string[] = [];
    const lookup = new Map<string, { month: string; assigned: number; completed: number; issues: number }>();

    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleString(undefined, { month: 'short', year: '2-digit' });
      monthLabels.push(key);
      lookup.set(key, { month: label, assigned: 0, completed: 0, issues: 0 });
    }

    for (const task of tasks) {
      if (!task.createdAt) continue;
      const created = new Date(task.createdAt);
      const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
      const row = lookup.get(key);
      if (!row) continue;

      row.assigned += 1;
      if (task.status === 'completed') {
        row.completed += 1;
      }
      row.issues += task.issueReports?.length || 0;
    }

    return monthLabels.map((key) => lookup.get(key)).filter(Boolean) as Array<{
      month: string;
      assigned: number;
      completed: number;
      issues: number;
    }>;
  }, [tasks]);

  const taskReportHeaders = [
    'Task ID',
    'Created At',
    'Completed At',
    'Status',
    'Approval Status',
    'Priority',
    'Cleaner',
    'Washroom',
    'Floor',
    'Efficiency',
    'Issue Reports',
  ];

  const taskReportRows = filteredTasks.map((task) => [
    task._id,
    formatDateTime(task.createdAt),
    formatDateTime(task.completedAt),
    task.status || 'N/A',
    task.approvalStatus || 'N/A',
    task.priority || 'N/A',
    task.cleaner?.name || 'N/A',
    task.toilet?.toiletNumber || task.toilet?.name || 'N/A',
    task.toilet?.floor || 'N/A',
    task.completionEfficiency ?? 'N/A',
    task.issueReports?.length || 0,
  ]);

  const toiletHealthHeaders = [
    'Toilet ID',
    'Washroom',
    'Floor',
    'Cleanliness Status',
    'AQI',
    'Water Condition',
    'Occupancy',
    'Latest Sensor Time',
  ];

  const toiletHealthRows = toilets.map((toilet) => {
    const latestSensor = sensorByToiletId.get(String(toilet._id));
    return [
      toilet._id,
      toilet.toiletNumber || toilet.name || 'N/A',
      toilet.floor || 'N/A',
      toilet.cleanlinessStatus || 'N/A',
      latestSensor?.aqi ?? 'N/A',
      latestSensor?.waterCondition || 'N/A',
      typeof latestSensor?.occupancy === 'boolean' ? (latestSensor.occupancy ? 'Occupied' : 'Free') : 'N/A',
      formatDateTime(latestSensor?.createdAt),
    ];
  });

  const handleDownloadTaskReport = () => {
    downloadCsv(`task-report-${range}-${new Date().toISOString().slice(0, 10)}.csv`, taskReportHeaders, taskReportRows);
  };

  const handleDownloadTaskReportPdf = () => {
    downloadPdf(
      `task-report-${range}-${new Date().toISOString().slice(0, 10)}.pdf`,
      'Cleaning Task Report',
      taskReportHeaders,
      taskReportRows
    );
  };

  const handleDownloadToiletHealth = () => {
    downloadCsv(`toilet-health-${new Date().toISOString().slice(0, 10)}.csv`, toiletHealthHeaders, toiletHealthRows);
  };

  const handleDownloadToiletHealthPdf = () => {
    downloadPdf(
      `toilet-health-${new Date().toISOString().slice(0, 10)}.pdf`,
      'Toilet Health Report',
      toiletHealthHeaders,
      toiletHealthRows
    );
  };

  const handleDownloadCleanerCsv = (cleanerName: string) => {
    const cleanerTasks = filteredTasks.filter((task) => (task.cleaner?.name || 'Unassigned') === cleanerName);
    const cleanerRows = cleanerTasks.map((task) => [
      task._id,
      formatDateTime(task.createdAt),
      task.toilet?.toiletNumber || task.toilet?.name || 'N/A',
      task.toilet?.floor || 'N/A',
      task.status || 'N/A',
      task.completionEfficiency ?? 'N/A',
      task.issueReports?.length || 0,
    ]);

    downloadCsv(
      `cleaner-${cleanerName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Task ID', 'Created At', 'Washroom', 'Floor', 'Status', 'Efficiency', 'Issue Reports'],
      cleanerRows
    );
  };

  const handleDownloadCleanerPdf = (cleanerName: string) => {
    const cleanerTasks = filteredTasks.filter((task) => (task.cleaner?.name || 'Unassigned') === cleanerName);
    const cleanerRows = cleanerTasks.map((task) => [
      task._id,
      formatDateTime(task.createdAt),
      task.toilet?.toiletNumber || task.toilet?.name || 'N/A',
      task.toilet?.floor || 'N/A',
      task.status || 'N/A',
      task.completionEfficiency ?? 'N/A',
      task.issueReports?.length || 0,
    ]);

    downloadPdf(
      `cleaner-${cleanerName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`,
      `Cleaner Report: ${cleanerName}`,
      ['Task ID', 'Created At', 'Washroom', 'Floor', 'Status', 'Efficiency', 'Issue Reports'],
      cleanerRows
    );
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-header mb-0">Reports</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as DateRange)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
          <Button variant="outline" onClick={loadReports} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Cleaning Task Report</CardTitle>
            <p className="text-sm text-muted-foreground">Includes task status, assigned cleaner, efficiency, and issue counts.</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Range: {range === 'today' ? 'Today' : range === 'week' ? 'Last 7 Days' : range === 'month' ? 'Last 30 Days' : 'All Time'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadTaskReport} disabled={loading || filteredTasks.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadTaskReportPdf} disabled={loading || filteredTasks.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Toilet Health Report</CardTitle>
            <p className="text-sm text-muted-foreground">Latest cleanliness and sensor snapshot per washroom.</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{toilets.length} washrooms in report</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadToiletHealth} disabled={loading || toilets.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadToiletHealthPdf} disabled={loading || toilets.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6 shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Monthly Summary (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySummary} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="assigned" name="Assigned" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="issues" name="Issues" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="metric-card">
          <p className="text-sm text-muted-foreground">Tasks In Range</p>
          <p className="mt-1 text-2xl font-semibold">{filteredTasks.length}</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="mt-1 text-2xl font-semibold text-status-good">{completedTasks}</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-muted-foreground">Pending / Active</p>
          <p className="mt-1 text-2xl font-semibold text-status-warning">{pendingTasks}</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-muted-foreground">Avg Efficiency</p>
          <p className="mt-1 text-2xl font-semibold">{avgEfficiency}%</p>
          <p className="mt-1 text-xs text-muted-foreground">Issues reported: {issueCount}</p>
        </div>
      </div>

      <Card className="mb-6 shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Per-Cleaner Report Downloads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 pr-4 text-left">Cleaner</th>
                  <th className="pb-3 pr-4 text-left">Tasks</th>
                  <th className="pb-3 pr-4 text-left">Completed</th>
                  <th className="pb-3 pr-4 text-left">Pending</th>
                  <th className="pb-3 pr-4 text-left">Avg Efficiency</th>
                  <th className="pb-3 pr-4 text-left">Issues</th>
                  <th className="pb-3 text-left">Download</th>
                </tr>
              </thead>
              <tbody>
                {cleanerSummaries.map((cleaner) => (
                  <tr key={cleaner.cleanerName} className="table-row-hover border-b border-border last:border-b-0">
                    <td className="py-3 pr-4 text-sm font-medium">{cleaner.cleanerName}</td>
                    <td className="py-3 pr-4 text-sm">{cleaner.taskCount}</td>
                    <td className="py-3 pr-4 text-sm text-status-good">{cleaner.completedCount}</td>
                    <td className="py-3 pr-4 text-sm text-status-warning">{cleaner.pendingCount}</td>
                    <td className="py-3 pr-4 text-sm">{cleaner.avgEfficiency}%</td>
                    <td className="py-3 pr-4 text-sm">{cleaner.issueCount}</td>
                    <td className="py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadCleanerCsv(cleaner.cleanerName)}
                          disabled={loading || cleaner.taskCount === 0}
                        >
                          CSV
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadCleanerPdf(cleaner.cleanerName)}
                          disabled={loading || cleaner.taskCount === 0}
                        >
                          PDF
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && cleanerSummaries.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No cleaner tasks found for this date range.</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Latest Tasks (View Report)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 pr-4 text-left">Task ID</th>
                  <th className="pb-3 pr-4 text-left">Washroom</th>
                  <th className="pb-3 pr-4 text-left">Cleaner</th>
                  <th className="pb-3 pr-4 text-left">Status</th>
                  <th className="pb-3 pr-4 text-left">Efficiency</th>
                  <th className="pb-3 text-left">Created At</th>
                </tr>
              </thead>
              <tbody>
                {latestTasksForView.map((task) => (
                  <tr key={task._id} className="table-row-hover border-b border-border last:border-b-0">
                    <td className="py-3 pr-4 text-sm font-medium">{String(task._id).slice(-6).toUpperCase()}</td>
                    <td className="py-3 pr-4 text-sm">{task.toilet?.toiletNumber || task.toilet?.name || 'N/A'}</td>
                    <td className="py-3 pr-4 text-sm">{task.cleaner?.name || 'N/A'}</td>
                    <td className="py-3 pr-4 text-sm capitalize">{task.status || 'N/A'}</td>
                    <td className="py-3 pr-4 text-sm">{task.completionEfficiency ?? 'N/A'}</td>
                    <td className="py-3 text-xs text-muted-foreground">{formatDateTime(task.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && latestTasksForView.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No tasks found for this date range.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
