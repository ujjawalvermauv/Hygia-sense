import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Filter, Plus, RefreshCw, Save, ShieldAlert, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { API_ENDPOINTS, apiCall } from '@/lib/api';

type AlertStatusFilter = 'all' | 'sent' | 'failed' | 'suppressed';
type AlertDeliveryMode = 'sms' | 'whatsapp' | 'auto';

type AlertEvent = {
  _id: string;
  eventType: 'cleaning-update' | 'signup-request' | 'system-failure' | 'cleaner-alert';
  source?: string | null;
  channel: string;
  message: string;
  recipients: string[];
  delivered: boolean;
  suppressed: boolean;
  reason?: string | null;
  fallbackLinks?: string[];
  createdAt: string;
};

type AdminRecipient = {
  name: string;
  phoneNumber: string;
  enabled: boolean;
};

const formatEventType = (value: AlertEvent['eventType']) => {
  if (value === 'signup-request') return 'Signup Request';
  if (value === 'system-failure') return 'System Failure';
  if (value === 'cleaner-alert') return 'Cleaner Alert';
  return 'Cleaning Update';
};

const getStatusLabel = (alert: AlertEvent) => {
  if (alert.suppressed) return 'Suppressed';
  if (alert.delivered) return 'Sent';
  return 'Failed';
};

const getStatusClasses = (alert: AlertEvent) => {
  if (alert.suppressed) return 'text-status-warning bg-status-warning/10 border-status-warning/30';
  if (alert.delivered) return 'text-status-good bg-status-good/10 border-status-good/30';
  return 'text-status-critical bg-status-critical/10 border-status-critical/30';
};

const AdminAlerts = () => {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [status, setStatus] = useState<AlertStatusFilter>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [adminRecipients, setAdminRecipients] = useState<AdminRecipient[]>([]);
  const [cleanerAlertsEnabled, setCleanerAlertsEnabled] = useState(true);
  const [alertDeliveryMode, setAlertDeliveryMode] = useState<AlertDeliveryMode>('sms');
  const openedAlertIdsRef = useRef(new Set<string>());

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: '200' });
      if (status !== 'all') {
        params.set('status', status);
      }

      const data = await apiCall(`${API_ENDPOINTS.ADMIN.ALERTS}?${params.toString()}`, {
        method: 'GET',
      });

      setAlerts(Array.isArray(data?.alerts) ? data.alerts : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load admin alerts.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const data = await apiCall(API_ENDPOINTS.ADMIN.ALERT_SETTINGS, { method: 'GET' });
      setAdminRecipients(Array.isArray(data?.adminRecipients) ? data.adminRecipients : []);
      setCleanerAlertsEnabled(data?.cleanerAlertsEnabled !== false);
      setAlertDeliveryMode((data?.alertDeliveryMode as AlertDeliveryMode) || 'sms');
    } catch (err: any) {
      setSettingsMessage(err?.message || 'Failed to load alert settings.');
    }
  };

  const saveSettings = async () => {
    setSettingsLoading(true);
    setSettingsMessage('');
    try {
      const payload = {
        adminRecipients: adminRecipients
          .map((row) => ({
            name: row.name.trim(),
            phoneNumber: row.phoneNumber.trim(),
            enabled: row.enabled,
          }))
          .filter((row) => row.name && row.phoneNumber),
        cleanerAlertsEnabled,
        alertDeliveryMode,
      };

      const response = await apiCall(API_ENDPOINTS.ADMIN.ALERT_SETTINGS, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setAdminRecipients(Array.isArray(response?.adminRecipients) ? response.adminRecipients : []);
      setCleanerAlertsEnabled(response?.cleanerAlertsEnabled !== false);
      setAlertDeliveryMode((response?.alertDeliveryMode as AlertDeliveryMode) || 'sms');
      setSettingsMessage(response?.message || 'Alert settings updated.');
    } catch (err: any) {
      setSettingsMessage(err?.message || 'Failed to update alert settings.');
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    void fetchAlerts();
    void fetchSettings();
    const id = setInterval(fetchAlerts, 15000);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    const criticalFailure = alerts.find((alert) => {
      return (
        alert.eventType === 'system-failure' &&
        !alert.delivered &&
        !alert.suppressed &&
        Array.isArray(alert.fallbackLinks) &&
        alert.fallbackLinks.length > 0 &&
        !openedAlertIdsRef.current.has(alert._id)
      );
    });

    if (!criticalFailure) return;

    openedAlertIdsRef.current.add(criticalFailure._id);
    window.open(criticalFailure.fallbackLinks?.[0], '_blank', 'noopener,noreferrer');
  }, [alerts]);

  const metrics = useMemo(() => {
    const sent = alerts.filter((row) => row.delivered && !row.suppressed).length;
    const failed = alerts.filter((row) => !row.delivered && !row.suppressed).length;
    const suppressed = alerts.filter((row) => row.suppressed).length;
    return { sent, failed, suppressed, total: alerts.length };
  }, [alerts]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="page-header mb-0">Admin Alerts</h1>
          <p className="text-sm text-muted-foreground">Manage alert recipients and monitor SMS/WhatsApp delivery history.</p>
        </div>
        <Button variant="outline" onClick={() => void fetchAlerts()} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card className="shadow-card mb-6">
        <CardHeader>
          <CardTitle className="text-base">Alert Recipient Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <input
              id="cleanerAlertToggle"
              type="checkbox"
              checked={cleanerAlertsEnabled}
              onChange={(e) => setCleanerAlertsEnabled(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="cleanerAlertToggle" className="text-sm">
              Send SMS alerts to cleaners (approval/rejection/task assignment)
            </label>
          </div>

          <div className="mb-4">
            <label htmlFor="alertDeliveryMode" className="text-sm font-medium block mb-1">
              Alert delivery mode
            </label>
            <select
              id="alertDeliveryMode"
              value={alertDeliveryMode}
              onChange={(e) => setAlertDeliveryMode(e.target.value as AlertDeliveryMode)}
              className="w-full md:w-72 px-3 py-2 rounded-md border border-input bg-background text-sm"
            >
              <option value="sms">SMS only</option>
              <option value="whatsapp">WhatsApp only</option>
              <option value="auto">Auto (SMS if configured, else WhatsApp)</option>
            </select>
          </div>

          <div className="space-y-3 mb-4">
            {adminRecipients.map((row, index) => (
              <div key={`${row.phoneNumber}-${index}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <input
                  value={row.name}
                  onChange={(e) => {
                    const next = [...adminRecipients];
                    next[index] = { ...next[index], name: e.target.value };
                    setAdminRecipients(next);
                  }}
                  placeholder="Admin name"
                  className="md:col-span-4 px-3 py-2 rounded-md border border-input bg-background text-sm"
                />
                <input
                  value={row.phoneNumber}
                  onChange={(e) => {
                    const next = [...adminRecipients];
                    next[index] = { ...next[index], phoneNumber: e.target.value };
                    setAdminRecipients(next);
                  }}
                  placeholder="+91XXXXXXXXXX"
                  className="md:col-span-4 px-3 py-2 rounded-md border border-input bg-background text-sm"
                />
                <label className="md:col-span-2 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(e) => {
                      const next = [...adminRecipients];
                      next[index] = { ...next[index], enabled: e.target.checked };
                      setAdminRecipients(next);
                    }}
                  />
                  Enabled
                </label>
                <div className="md:col-span-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAdminRecipients((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAdminRecipients((prev) => [...prev, { name: '', phoneNumber: '', enabled: true }])}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Admin Alert Recipient (Not Cleaner)
            </Button>
            <Button type="button" onClick={() => void saveSettings()} disabled={settingsLoading}>
              <Save className="w-4 h-4 mr-1" /> {settingsLoading ? 'Saving...' : 'Save Settings'}
            </Button>
            <Button type="button" variant="outline" onClick={() => void fetchSettings()}>
              Reload
            </Button>
          </div>

          {settingsMessage ? (
            <p className="text-xs mt-3 text-muted-foreground">{settingsMessage}</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{metrics.total}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-status-good">Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{metrics.sent}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-status-critical">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{metrics.failed}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-status-warning">Suppressed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{metrics.suppressed}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="inline-flex items-center text-xs text-muted-foreground mr-2">
          <Filter className="w-3 h-3 mr-1" />
          Status filter:
        </span>
        {(['all', 'sent', 'failed', 'suppressed'] as AlertStatusFilter[]).map((item) => (
          <Button
            key={item}
            size="sm"
            variant={status === item ? 'default' : 'outline'}
            onClick={() => setStatus(item)}
          >
            {item[0].toUpperCase() + item.slice(1)}
          </Button>
        ))}
      </div>

      {error ? (
        <Card className="shadow-card border-status-critical/40">
          <CardContent className="py-6 text-status-critical text-sm">{error}</CardContent>
        </Card>
      ) : null}

      <div className="space-y-3">
        {alerts.map((alert) => (
          <Card key={alert._id} className="shadow-card">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-1 rounded border ${getStatusClasses(alert)}`}>
                      {getStatusLabel(alert)}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatEventType(alert.eventType)}</span>
                    {alert.source ? <span className="text-xs text-muted-foreground">• {alert.source}</span> : null}
                  </div>
                  <p className="text-sm font-medium mb-1">{alert.message}</p>
                  <p className="text-xs text-muted-foreground">
                    Channel: {alert.channel} | Recipients: {alert.recipients?.length || 0} | {new Date(alert.createdAt).toLocaleString()}
                  </p>
                  {alert.reason ? <p className="text-xs mt-1 text-muted-foreground">Reason: {alert.reason}</p> : null}
                  {alert.fallbackLinks && alert.fallbackLinks.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {alert.fallbackLinks.slice(0, 3).map((link, index) => (
                        <Button key={`${alert._id}-fallback-${index}`} size="sm" variant="outline" asChild>
                          <a href={link} target="_blank" rel="noreferrer">
                            Open in WhatsApp
                          </a>
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="shrink-0">
                  {alert.suppressed ? (
                    <ShieldAlert className="w-5 h-5 text-status-warning" />
                  ) : alert.delivered ? (
                    <CheckCircle2 className="w-5 h-5 text-status-good" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-status-critical" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {!loading && alerts.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No alert events found for the selected filter.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

export default AdminAlerts;
