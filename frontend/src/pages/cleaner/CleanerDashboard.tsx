import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  Route,
  Sparkles,
  TimerReset,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';
import { getAllTasks } from '@/services/taskService';
import {
  getAllCleaners,
  updateCleanerSelfShift,
  type CleanerAccount,
} from '@/services/cleanerService';

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'under_review';
type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

interface CleaningTask {
  id: string;
  washroom: string;
  floor: string;
  assignedTime: string;
  status: TaskStatus;
  priority: TaskPriority;
  cleanerId?: string;
  cleanerName?: string;
  cleanerEmail?: string;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
  completionEfficiency?: number;
  autoApproved?: boolean;
  issueCount: number;
}

const mapBackendStatusToCleanerStatus = (status?: string): TaskStatus => {
  if (status === 'assigned') return 'pending';
  if (status === 'in-progress') return 'in_progress';
  if (status === 'pending-approval') return 'under_review';
  return 'completed';
};

const toTaskPriority = (task: any): TaskPriority => {
  if (task.priority && ['low', 'medium', 'high', 'critical'].includes(task.priority)) {
    return task.priority;
  }

  if (task.toilet?.cleanlinessStatus === 'red') return 'high';
  if (task.toilet?.cleanlinessStatus === 'orange') return 'medium';
  return 'low';
};

const priorityWeight = (priority: TaskPriority) => {
  if (priority === 'critical') return 4;
  if (priority === 'high') return 3;
  if (priority === 'medium') return 2;
  return 1;
};

const isSameDay = (value?: string) => {
  if (!value) return false;

  const date = new Date(value);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const isSameMonth = (value?: string) => {
  if (!value) return false;

  const date = new Date(value);
  const now = new Date();

  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
};

const formatTime = (value?: string) => {
  if (!value) return '--';

  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDuration = (start?: string, end?: string) => {
  if (!start) return '--';

  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();
  const elapsedMinutes = Math.max(1, Math.round((endTime - startTime) / 60000));
  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

const formatMinutesAsDuration = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
};

const getElapsedMinutes = (createdAt?: string) => {
  if (!createdAt) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / 60000));
};

const getStatusConfig = (status: TaskStatus) => {
  switch (status) {
    case 'pending':
      return {
        label: 'Pending',
        color: 'bg-status-warning/10 text-status-warning',
        dotColor: 'bg-status-warning',
      };
    case 'in_progress':
      return {
        label: 'In Progress',
        color: 'bg-status-info/10 text-status-info',
        dotColor: 'bg-status-info',
      };
    case 'completed':
      return {
        label: 'Completed',
        color: 'bg-status-good/10 text-status-good',
        dotColor: 'bg-status-good',
      };
    default:
      return {
        label: 'Under Review',
        color: 'bg-accent/10 text-accent',
        dotColor: 'bg-accent',
      };
  }
};

const CleanerDashboard = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cleanerProfile, setCleanerProfile] = useState<CleanerAccount | null>(null);
  const [isShiftActionBusy, setIsShiftActionBusy] = useState(false);
  const [shiftFeedback, setShiftFeedback] = useState('');
  const sessionRaw = localStorage.getItem('hygia_session');
  const session = sessionRaw ? JSON.parse(sessionRaw) : null;
  const sessionCleanerId = session?.cleanerId as string | undefined;
  const signedInCleanerName = session?.name;
  const signedInCleanerEmail = session?.email?.toLowerCase?.() || '';

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [backendTasks, cleaners] = await Promise.all([
        getAllTasks(),
        getAllCleaners(),
      ]);

      const mappedTasks: CleaningTask[] = (backendTasks || []).map((task: any) => ({
        id: task._id,
        washroom: task.toilet?.name || 'Unknown washroom',
        floor: task.toilet?.location || 'Unknown floor',
        assignedTime: new Date(task.createdAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        status: mapBackendStatusToCleanerStatus(task.status),
        priority: toTaskPriority(task),
        cleanerId: task.cleaner?._id,
        cleanerName: task.cleaner?.name,
        cleanerEmail: task.cleaner?.email,
        createdAt: task.createdAt,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        completionEfficiency: task.completionEfficiency,
        autoApproved: task.autoApproved,
        issueCount: (task.issueReports || []).length,
      }));

      setTasks(mappedTasks);

      const matchedCleaner = (cleaners || []).find((row) => {
        if (sessionCleanerId && row._id === sessionCleanerId) return true;
        if (signedInCleanerEmail && (row.email || '').toLowerCase() === signedInCleanerEmail) return true;
        return !!(signedInCleanerName && row.name === signedInCleanerName);
      }) || null;

      setCleanerProfile(matchedCleaner);
    } catch (error) {
      console.error('Failed to load cleaner tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboardData();
  }, []);

  const cleanerName = useMemo(() => {
    if (signedInCleanerName) return signedInCleanerName;
    const names = tasks.map((task) => task.cleanerName).filter(Boolean) as string[];
    return names[0] || 'Cleaner';
  }, [signedInCleanerName, tasks]);

  const cleanerTasks = useMemo(() => {
    if (cleanerProfile?._id) {
      return tasks.filter((task) => task.cleanerId === cleanerProfile._id);
    }

    if (sessionCleanerId) {
      return tasks.filter((task) => task.cleanerId === sessionCleanerId);
    }

    if (signedInCleanerEmail) {
      const byEmail = tasks.filter((task) => (task.cleanerEmail || '').toLowerCase() === signedInCleanerEmail);
      return byEmail;
    }

    if (!cleanerName || cleanerName === 'Cleaner') return [];
    return tasks.filter((task) => task.cleanerName === cleanerName);
  }, [cleanerName, cleanerProfile?._id, sessionCleanerId, signedInCleanerEmail, tasks]);

  const todayTasks = useMemo(
    () =>
      cleanerTasks.filter(
        (task) => isSameDay(task.createdAt) || isSameDay(task.startedAt) || isSameDay(task.completedAt)
      ),
    [cleanerTasks]
  );

  const activeTasks = todayTasks.length > 0 ? todayTasks : cleanerTasks;

  const monthTasks = useMemo(
    () =>
      cleanerTasks.filter(
        (task) => isSameMonth(task.createdAt) || isSameMonth(task.startedAt) || isSameMonth(task.completedAt)
      ),
    [cleanerTasks]
  );

  const pendingCount = activeTasks.filter((task) => task.status === 'pending').length;
  const inProgressCount = activeTasks.filter((task) => task.status === 'in_progress').length;
  const completedCount = activeTasks.filter((task) => task.status === 'completed' || task.status === 'under_review').length;
  const assignedCount = activeTasks.length;
  const averageEfficiency = activeTasks.length
    ? Math.round(activeTasks.reduce((sum, task) => sum + (task.completionEfficiency || 0), 0) / activeTasks.length)
    : 0;

  const avgCycleTime = useMemo(() => {
    const withDuration = activeTasks.filter((task) => task.startedAt && task.completedAt);
    if (withDuration.length === 0) return '--';

    const avgMinutes = Math.round(
      withDuration.reduce((sum, task) => {
        const start = new Date(task.startedAt as string).getTime();
        const end = new Date(task.completedAt as string).getTime();
        return sum + Math.max(1, Math.round((end - start) / 60000));
      }, 0) / withDuration.length
    );

    return `${avgMinutes} min`;
  }, [activeTasks]);

  const autoApprovedCount = activeTasks.filter((task) => task.autoApproved).length;
  const totalIssueReports = activeTasks.reduce((sum, task) => sum + task.issueCount, 0);

  const firstCheckIn = useMemo(() => {
    const candidates = activeTasks
      .map((task) => task.startedAt || task.createdAt)
      .filter(Boolean) as string[];
    return candidates.sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0];
  }, [activeTasks]);

  const lastCheckOut = useMemo(() => {
    const candidates = activeTasks.map((task) => task.completedAt).filter(Boolean) as string[];
    return candidates.sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
  }, [activeTasks]);

  const activeShift = activeTasks.some((task) => task.status === 'in_progress' || task.status === 'pending');
  const isOffShift = cleanerProfile?.status === 'off-shift';
  const offShiftAt = isOffShift ? (cleanerProfile?.lastShiftEndedAt || cleanerProfile?.updatedAt) : undefined;

  const monthlyShiftMinutes = useMemo(() => {
    return monthTasks.reduce((sum, task) => {
      if (!task.startedAt) return sum;

      const start = new Date(task.startedAt).getTime();
      const end = task.completedAt ? new Date(task.completedAt).getTime() : Date.now();
      if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return sum;

      return sum + Math.max(1, Math.round((end - start) / 60000));
    }, 0);
  }, [monthTasks]);

  const shiftStatusLabel = isOffShift
    ? 'Off shift (no new assignments)'
    : !firstCheckIn
    ? 'Not checked in yet'
    : activeShift
      ? 'On duty'
      : 'Shift completed';
  const shiftStatusTone = isOffShift
    ? 'bg-status-warning/10 text-status-warning'
    : !firstCheckIn
    ? 'bg-muted text-muted-foreground'
    : activeShift && !lastCheckOut
      ? 'bg-status-info/10 text-status-info'
      : 'bg-status-good/10 text-status-good';

  const leftTimeValue = isOffShift
    ? formatTime(offShiftAt)
    : activeShift
      ? 'On duty'
      : formatTime(lastCheckOut);

  const leftTimeHint = isOffShift
    ? 'Marked inactive at'
    : 'Auto-closed after last completed task';

  const handleShiftToggle = async () => {
    if (!cleanerProfile?._id) {
      setShiftFeedback('Cleaner session not found. Please re-login.');
      return;
    }

    try {
      setIsShiftActionBusy(true);
      setShiftFeedback('');

      const nextOnShift = isOffShift;
      const response = await updateCleanerSelfShift(cleanerProfile._id, {
        onShift: nextOnShift,
        actor: String(session?.name || session?.email || '').trim(),
        email: String(session?.email || '').trim(),
        note: nextOnShift
          ? 'Cleaner started next shift from dashboard.'
          : 'Cleaner completed shift from dashboard.',
      });

      if (response?.cleaner) {
        setCleanerProfile(response.cleaner);
      }

      setShiftFeedback(response?.message || 'Shift status updated.');
      await loadDashboardData();
    } catch (error) {
      setShiftFeedback(error instanceof Error ? error.message : 'Failed to update shift status.');
    } finally {
      setIsShiftActionBusy(false);
    }
  };

  const nextRecommendedTask = useMemo(() => {
    const candidates = cleanerTasks.filter((task) => task.status === 'pending' || task.status === 'in_progress');
    return candidates.sort((left, right) => {
      const priorityDiff = priorityWeight(right.priority) - priorityWeight(left.priority);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime();
    })[0];
  }, [cleanerTasks]);

  const urgentAlerts = useMemo(
    () =>
      cleanerTasks
        .filter((task) => task.status === 'pending' && priorityWeight(task.priority) >= 3)
        .sort((left, right) => new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime())
        .slice(0, 4),
    [cleanerTasks]
  );

  const missedReminders = useMemo(
    () =>
      cleanerTasks
        .filter((task) => task.status === 'pending' && getElapsedMinutes(task.createdAt) >= 45)
        .sort((left, right) => getElapsedMinutes(right.createdAt) - getElapsedMinutes(left.createdAt))
        .slice(0, 4),
    [cleanerTasks]
  );

  const smartRoute = useMemo(() => {
    const actionable = cleanerTasks.filter((task) => task.status === 'pending' || task.status === 'in_progress');
    return actionable
      .sort((left, right) => {
        const priorityDiff = priorityWeight(right.priority) - priorityWeight(left.priority);
        if (priorityDiff !== 0) return priorityDiff;
        if ((left.floor || '') !== (right.floor || '')) {
          return String(left.floor || '').localeCompare(String(right.floor || ''));
        }
        return new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime();
      })
      .slice(0, 5);
  }, [cleanerTasks]);

  const recentEfficiencyTrend = useMemo(
    () =>
      cleanerTasks
        .filter((task) => task.completionEfficiency !== undefined)
        .sort((left, right) => new Date(right.completedAt || right.createdAt || 0).getTime() - new Date(left.completedAt || left.createdAt || 0).getTime())
        .slice(0, 5),
    [cleanerTasks]
  );

  const handleTaskClick = (taskId: string) => {
    navigate(`/cleaner/task/${taskId}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-accent/5 p-5 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              <Sparkles className="w-3.5 h-3.5" />
              Smart cleaner command center
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-foreground">Good Morning, {cleanerName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Productivity, guidance, and reporting are now auto-generated from your task flow.
            </p>
          </div>
          <div className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-xs font-medium ${shiftStatusTone}`}>
            <CalendarClock className="w-3.5 h-3.5" />
            {shiftStatusLabel}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-background/80 p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <LogIn className="w-3.5 h-3.5" />
              Came In
            </div>
            <p className="mt-2 text-xl font-semibold text-foreground">{formatTime(firstCheckIn)}</p>
            <p className="mt-1 text-xs text-muted-foreground">First QR scan or task start</p>
          </div>
          <div className="rounded-xl border border-border bg-background/80 p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <LogOut className="w-3.5 h-3.5" />
              Left
            </div>
            <p className="mt-2 text-xl font-semibold text-foreground">{leftTimeValue}</p>
            <p className="mt-1 text-xs text-muted-foreground">{leftTimeHint}</p>
          </div>
          <div className="rounded-xl border border-border bg-background/80 p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <TimerReset className="w-3.5 h-3.5" />
              Shift Duration (This Month)
            </div>
            <p className="mt-2 text-xl font-semibold text-foreground">{formatMinutesAsDuration(monthlyShiftMinutes)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Summed only from current month task activity</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">
            Assignment Availability: <span className="font-medium text-foreground">{isOffShift ? 'Off Shift' : 'On Shift'}</span>
          </div>
          <button
            type="button"
            onClick={() => void handleShiftToggle()}
            disabled={isShiftActionBusy || !cleanerProfile?._id}
            className="inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isShiftActionBusy
              ? 'Updating...'
              : isOffShift
                ? 'Start Next Shift (Receive Tasks)'
                : 'Complete Shift (Go Inactive)'}
          </button>
        </div>

        {shiftFeedback && (
          <div className="mt-3 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-foreground">
            {shiftFeedback}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-status-warning/10 p-4">
          <p className="text-2xl font-bold text-status-warning">{pendingCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Pending</p>
        </div>
        <div className="rounded-xl bg-status-info/10 p-4">
          <p className="text-2xl font-bold text-status-info">{inProgressCount}</p>
          <p className="text-xs text-muted-foreground mt-1">In Progress</p>
        </div>
        <div className="rounded-xl bg-status-good/10 p-4">
          <p className="text-2xl font-bold text-status-good">{completedCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Done Today</p>
        </div>
        <div className="rounded-xl bg-accent/10 p-4">
          <p className="text-2xl font-bold text-accent">{averageEfficiency || '--'}%</p>
          <p className="text-xs text-muted-foreground mt-1">Avg Efficiency</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Productivity Snapshot</h2>
            <TrendingUp className="w-4 h-4 text-accent" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Avg Cycle Time</p>
              <p className="mt-2 text-base font-semibold text-foreground">{avgCycleTime}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Auto Approved</p>
              <p className="mt-2 text-base font-semibold text-foreground">{autoApprovedCount}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Issue Reports</p>
              <p className="mt-2 text-base font-semibold text-foreground">{totalIssueReports}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Completed</p>
              <p className="mt-2 text-base font-semibold text-foreground">{completedCount}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Assigned Tasks</p>
              <p className="mt-2 text-base font-semibold text-foreground">{assignedCount}</p>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Recent Efficiency Trend</p>
            <div className="mt-2 space-y-2">
              {recentEfficiencyTrend.length === 0 && (
                <p className="text-sm text-muted-foreground">No completed tasks yet.</p>
              )}
              {recentEfficiencyTrend.map((task) => (
                <div key={task.id} className="rounded-lg border border-border bg-background p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{task.washroom}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(task.completedAt || task.createdAt)}</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{task.completionEfficiency}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Smart Guidance</h2>
            <Route className="w-4 h-4 text-accent" />
          </div>

          <div className="rounded-xl border border-border bg-accent/5 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Next Recommended Task</p>
            {nextRecommendedTask ? (
              <button
                onClick={() => handleTaskClick(nextRecommendedTask.id)}
                className="mt-2 w-full text-left rounded-lg border border-border bg-background p-3 hover:border-accent transition-colors"
              >
                <p className="text-sm font-semibold text-foreground">{nextRecommendedTask.washroom}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {nextRecommendedTask.floor} | {nextRecommendedTask.priority.toUpperCase()} priority
                </p>
              </button>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No actionable task right now.</p>
            )}
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Suggested Route Order</p>
            <div className="mt-2 space-y-2">
              {smartRoute.length === 0 && (
                <p className="text-sm text-muted-foreground">Route will appear once tasks are assigned.</p>
              )}
              {smartRoute.map((task, index) => (
                <button
                  key={task.id}
                  onClick={() => handleTaskClick(task.id)}
                  className="w-full rounded-lg border border-border bg-background p-3 text-left hover:border-accent transition-colors"
                >
                  <p className="text-sm font-medium text-foreground">{index + 1}. {task.washroom}</p>
                  <p className="text-xs text-muted-foreground mt-1">{task.floor} | assigned {task.assignedTime}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <TriangleAlert className="w-4 h-4 text-status-danger" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Priority Alerts</h2>
          </div>
          <div className="mt-3 space-y-2">
            {urgentAlerts.length === 0 && (
              <p className="text-sm text-muted-foreground">No urgent pending alerts.</p>
            )}
            {urgentAlerts.map((task) => (
              <button
                key={task.id}
                onClick={() => handleTaskClick(task.id)}
                className="w-full rounded-lg border border-status-danger/30 bg-status-danger/5 p-3 text-left hover:bg-status-danger/10 transition-colors"
              >
                <p className="text-sm font-medium text-foreground">{task.washroom}</p>
                <p className="text-xs text-muted-foreground mt-1">{task.floor} | {task.priority.toUpperCase()} priority</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-status-warning" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Missed Task Reminders</h2>
          </div>
          <div className="mt-3 space-y-2">
            {missedReminders.length === 0 && (
              <p className="text-sm text-muted-foreground">No delayed tasks right now.</p>
            )}
            {missedReminders.map((task) => (
              <button
                key={task.id}
                onClick={() => handleTaskClick(task.id)}
                className="w-full rounded-lg border border-status-warning/30 bg-status-warning/5 p-3 text-left hover:bg-status-warning/10 transition-colors"
              >
                <p className="text-sm font-medium text-foreground">{task.washroom}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Waiting {getElapsedMinutes(task.createdAt)} min | {task.floor}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Assigned Tasks</h2>

        {isLoading && (
          <div className="bg-card border border-border rounded-xl p-4 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading tasks...
          </div>
        )}

        {!isLoading && cleanerTasks.map((task) => {
          const statusConfig = getStatusConfig(task.status);
          const isActionable = task.status === 'pending' || task.status === 'in_progress';
          const isRecommended = nextRecommendedTask?.id === task.id;

          return (
            <button
              key={task.id}
              onClick={() => handleTaskClick(task.id)}
              disabled={!isActionable}
              className={`w-full bg-card border rounded-xl p-4 text-left transition-all ${
                isActionable ? 'hover:border-accent hover:shadow-card active:scale-[0.99]' : 'opacity-80 border-border'
              } ${isRecommended ? 'border-accent' : 'border-border'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {priorityWeight(task.priority) >= 3 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-status-danger text-status-danger-foreground">
                        {task.priority}
                      </span>
                    )}
                    {isRecommended && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-accent text-accent-foreground">
                        Next Best
                      </span>
                    )}
                    <h3 className="font-medium text-foreground truncate">{task.washroom}</h3>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {task.floor}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {task.assignedTime}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
                      {statusConfig.label}
                    </span>
                    {task.issueCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-status-warning/10 text-status-warning">
                        <AlertCircle className="w-3 h-3" />
                        {task.issueCount} issue report{task.issueCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {isActionable && <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />}
              </div>
            </button>
          );
        })}

        {!isLoading && cleanerTasks.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-4 text-sm text-muted-foreground">
            No tasks found.
          </div>
        )}
      </div>
    </div>
  );
};

export default CleanerDashboard;
