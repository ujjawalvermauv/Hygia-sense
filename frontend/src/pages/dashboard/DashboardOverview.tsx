import { useEffect, useMemo, useState } from 'react';
import {
  Wind,
  Users,
  Sparkles,
  TrendingUp,
  ClipboardList,
  AlertCircle,
  Brain,
  Loader,
} from 'lucide-react';
import MetricCard from '@/components/dashboard/MetricCard';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { getAiOverview, autoAssignAiTasks, type AiOverviewResponse } from '@/services/aiService';

const getPriorityBadge = (priority: string) => {
  if (priority === 'critical') return <StatusBadge status="danger" label="Critical" />;
  if (priority === 'high') return <StatusBadge status="warning" label="High" />;
  if (priority === 'medium') return <StatusBadge status="info" label="Medium" />;
  return <StatusBadge status="good" label="Low" />;
};

const getTimeAgo = (timestamp: string) => {
  const diffMins = Math.max(0, Math.round((Date.now() - new Date(timestamp).getTime()) / 60000));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;

  const hours = Math.round(diffMins / 60);
  return `${hours} hr ago`;
};

const DashboardOverview = () => {
  const [aiOverview, setAiOverview] = useState<AiOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [suggestionStatus, setSuggestionStatus] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [recommendationCreated, setRecommendationCreated] = useState(false);

  const fetchOverview = async () => {
    try {
      const data = await getAiOverview();
      setAiOverview(data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch AI overview:', err);
      setError('Unable to load AI overview right now.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 15000);
    return () => clearInterval(interval);
  }, []);

  const topInsights = useMemo(() => aiOverview?.insights.slice(0, 4) || [], [aiOverview]);
  const topSuggestion = useMemo(() => aiOverview?.insights?.[0] || null, [aiOverview]);

  const handleCreateSuggestedTask = async () => {
    if (!topSuggestion) return;

    setIsAssigning(true);
    setSuggestionStatus('');
    setRecommendationCreated(false);

    try {
      const response = await autoAssignAiTasks(topSuggestion.riskScore, 1);
      const assignments = response?.assignmentsCreated || 0;
      const created = assignments > 0;

      setSuggestionStatus(
        created
          ? `Created ${assignments} recommended cleaning task.`
          : 'No new task created. The highest-risk unit may already have an open assignment.'
      );
      setRecommendationCreated(created);
      await fetchOverview();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create recommended task.';
      setSuggestionStatus(message);
      setRecommendationCreated(false);
    } finally {
      setIsAssigning(false);
    }
  };

  const occupancyCount = useMemo(
    () => aiOverview?.insights.filter((row) => row.metrics.latestOccupancy).length || 0,
    [aiOverview]
  );

  const avgAqi = useMemo(() => {
    if (!aiOverview?.insights.length) return 0;
    const sum = aiOverview.insights.reduce((acc, row) => acc + row.metrics.avgAqi, 0);
    return Math.round(sum / aiOverview.insights.length);
  }, [aiOverview]);

  const avgNextCleaningMins = useMemo(() => {
    if (!aiOverview?.insights.length) return 0;
    const sum = aiOverview.insights.reduce((acc, row) => acc + row.nextCleaningInMins, 0);
    return Math.round(sum / aiOverview.insights.length);
  }, [aiOverview]);

  const pendingTasks = useMemo(
    () => aiOverview?.insights.reduce((acc, row) => acc + row.pendingTasksCount, 0) || 0,
    [aiOverview]
  );

  const cleanlinessLabel = aiOverview?.summary.averageRiskScore
    ? aiOverview.summary.averageRiskScore >= 70
      ? 'Needs Action'
      : aiOverview.summary.averageRiskScore >= 45
        ? 'Monitor'
        : 'Stable'
    : 'Unknown';

  const cleanlinessStatus = aiOverview?.summary.averageRiskScore
    ? aiOverview.summary.averageRiskScore >= 70
      ? 'danger'
      : aiOverview.summary.averageRiskScore >= 45
        ? 'warning'
        : 'good'
    : 'info';

  if (isLoading && !aiOverview) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading AI dashboard...</span>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-header">Dashboard Overview</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <MetricCard
          title="Air Quality Index"
          value={avgAqi}
          icon={Wind}
          status={avgAqi > 100 ? 'danger' : avgAqi > 60 ? 'warning' : 'good'}
          subtitle={avgAqi > 100 ? 'Poor air quality trend' : 'Rolling 40-reading average'}
        />
        <MetricCard
          title="Current Occupancy"
          value={`${occupancyCount} / ${aiOverview?.summary.monitoredToilets || 0}`}
          icon={Users}
          status={occupancyCount > (aiOverview?.summary.monitoredToilets || 0) / 2 ? 'warning' : 'good'}
          subtitle="Live occupancy from latest sensor packets"
        />
        <MetricCard
          title="Cleanliness Risk"
          value={cleanlinessLabel}
          icon={Sparkles}
          status={cleanlinessStatus as 'good' | 'warning' | 'danger' | 'info'}
          subtitle={`Avg risk score: ${aiOverview?.summary.averageRiskScore || 0}`}
        />
        <MetricCard
          title="Predicted Next Clean"
          value={`${avgNextCleaningMins} min`}
          icon={TrendingUp}
          subtitle="AI-estimated average until next action"
        />
        <MetricCard
          title="Pending Tasks"
          value={pendingTasks}
          icon={ClipboardList}
          status={pendingTasks > 3 ? 'warning' : 'good'}
          subtitle="Open tasks across all monitored toilets"
        />
        <MetricCard
          title="AI Critical Alerts"
          value={aiOverview?.summary.critical || 0}
          icon={Brain}
          status={(aiOverview?.summary.critical || 0) > 0 ? 'danger' : 'good'}
          subtitle="Toilets needing immediate intervention"
        />
      </div>

      {topSuggestion && (
        <div className="mb-6 rounded-2xl border border-accent/20 bg-accent/5 p-5 shadow-card">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-foreground/10 px-3 py-1 text-xs font-semibold text-foreground">
                <span>Next Best Cleaning</span>
                {recommendationCreated && (
                  <span className="rounded-full bg-status-good px-2 py-0.5 text-[10px] font-bold uppercase text-status-good-foreground">
                    Task created
                  </span>
                )}
              </div>
              <h2 className="text-xl font-semibold text-foreground">{topSuggestion.toiletName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Risk score {topSuggestion.riskScore}/100 · {topSuggestion.priority.toUpperCase()} priority · next clean in {topSuggestion.nextCleaningInMins} min
              </p>
              <p className="mt-3 text-sm text-foreground max-w-2xl truncate" title={topSuggestion.recommendation[0]}>
                {topSuggestion.recommendation[0]}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleCreateSuggestedTask()}
              disabled={isAssigning}
              className="inline-flex items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAssigning ? 'Assigning...' : 'Create Recommended Task'}
            </button>
          </div>
          {suggestionStatus && (
            <div className="mt-4 rounded-lg border border-border bg-background/80 px-3 py-2 text-sm text-foreground">
              {suggestionStatus}
            </div>
          )}
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Washroom Status Summary */}
        <div className="metric-card">
          <h2 className="text-base font-semibold text-foreground mb-4">AI Washroom Priorities</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 pr-4">Location</th>
                  <th className="pb-3 pr-4">Risk</th>
                  <th className="pb-3 pr-4">Priority</th>
                  <th className="pb-3">Suggested Action</th>
                </tr>
              </thead>
              <tbody>
                {topInsights.map((insight) => (
                  <tr key={insight.toiletId} className="table-row-hover border-b border-border last:border-b-0">
                    <td className="py-3 pr-4 font-medium text-sm">{insight.toiletName}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge
                        status={insight.riskScore >= 70 ? 'danger' : insight.riskScore >= 45 ? 'warning' : 'good'}
                        label={`${insight.riskScore}/100`}
                      />
                    </td>
                    <td className="py-3 pr-4">{getPriorityBadge(insight.priority)}</td>
                    <td className="py-3 text-sm text-muted-foreground max-w-60 truncate" title={insight.recommendation[0]}>
                      {insight.recommendation[0]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="metric-card">
          <h2 className="text-base font-semibold text-foreground mb-4">AI Alerts</h2>
          <div className="space-y-3">
            {(aiOverview?.alerts || []).map((alert) => (
              <div 
                key={alert.toiletId} 
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
              >
                <AlertCircle className={`w-4 h-4 mt-0.5 ${
                  alert.priority === 'critical' ? 'text-status-danger' :
                  alert.priority === 'high' ? 'text-status-warning' :
                  'text-status-info'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    {alert.toiletName}: {alert.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Risk {alert.riskScore}/100 • {getTimeAgo(aiOverview?.summary.generatedAt || new Date().toISOString())}
                  </p>
                </div>
              </div>
            ))}
            {!aiOverview?.alerts.length && (
              <div className="rounded-lg bg-muted/50 px-3 py-4 text-sm text-muted-foreground">
                No critical AI alerts at the moment.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
