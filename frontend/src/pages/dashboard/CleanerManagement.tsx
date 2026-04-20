import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, ShieldAlert, UserCheck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/dashboard/StatusBadge';
import {
  approveCleanerRequest,
  getAllCleaners,
  getPendingCleanerRequests,
  rejectCleanerRequest,
  updateCleanerRoster,
  type CleanerAccount,
} from '@/services/cleanerService';

const shiftLabel = {
  morning: 'Morning (6 AM - 2 PM)',
  afternoon: 'Afternoon (2 PM - 10 PM)',
  night: 'Night (10 PM - 6 AM)',
};

const DEFAULT_ADMIN_ACTOR = 'ujjawalvermauv12@gmail.com';

const getSessionActor = () => {
  try {
    const raw = localStorage.getItem('hygia_session');
    if (!raw) return '';
    const parsed = JSON.parse(raw) as { email?: string; name?: string };
    return String(parsed.email || parsed.name || '').trim();
  } catch {
    return '';
  }
};

type RosterSort =
  | 'workload-asc'
  | 'assigned-asc'
  | 'assigned-desc'
  | 'completed-desc'
  | 'name-asc'
  | 'name-desc';

const CleanerManagement = () => {
  const [cleaners, setCleaners] = useState<CleanerAccount[]>([]);
  const [pendingRequests, setPendingRequests] = useState<CleanerAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyCleanerId, setBusyCleanerId] = useState('');
  const [feedback, setFeedback] = useState('');
  const [decisionBy, setDecisionBy] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [rosterQuery, setRosterQuery] = useState('');
  const [rosterStatusFilter, setRosterStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [rosterShiftFilter, setRosterShiftFilter] = useState<'all' | 'morning' | 'afternoon' | 'night'>('all');
  const [rosterSort, setRosterSort] = useState<RosterSort>('workload-asc');

  const resolveActor = () => {
    const actor = decisionBy.trim() || getSessionActor() || DEFAULT_ADMIN_ACTOR;
    if (!decisionBy.trim()) {
      setDecisionBy(actor);
    }
    return actor;
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [allCleaners, pending] = await Promise.all([getAllCleaners(), getPendingCleanerRequests()]);
      setCleaners(allCleaners || []);
      setPendingRequests(pending || []);
    } catch (error) {
      console.error('Failed to load cleaner management data:', error);
      setFeedback(error instanceof Error ? error.message : 'Failed to load cleaner data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  useEffect(() => {
    if (!decisionBy.trim()) {
      const sessionActor = getSessionActor();
      if (sessionActor) {
        setDecisionBy(sessionActor);
      }
    }
  }, [decisionBy]);

  const handleApprove = async (cleanerId: string) => {
    try {
      const actor = resolveActor();
      setBusyCleanerId(cleanerId);
      setFeedback('');
      const response = await approveCleanerRequest(cleanerId, actor, decisionNote.trim());
      setFeedback(response?.message || 'Cleaner request approved.');
      await fetchData();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Failed to approve cleaner request.');
    } finally {
      setBusyCleanerId('');
    }
  };

  const handleReject = async (cleanerId: string) => {
    try {
      const actor = resolveActor();
      setBusyCleanerId(cleanerId);
      setFeedback('');
      const response = await rejectCleanerRequest(cleanerId, actor, decisionNote.trim());
      setFeedback(response?.message || 'Cleaner request rejected.');
      await fetchData();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Failed to reject cleaner request.');
    } finally {
      setBusyCleanerId('');
    }
  };

  const handleRosterStatusToggle = async (cleaner: CleanerAccount) => {
    const nextStatus = cleaner.accountStatus === 'active' ? 'inactive' : 'active';

    try {
      const actor = resolveActor();
      setBusyCleanerId(cleaner._id);
      setFeedback('');
      const response = await updateCleanerRoster(cleaner._id, {
        actor,
        accountStatus: nextStatus,
        note: decisionNote.trim() || `Cleaner marked as ${nextStatus}.`,
      });
      setFeedback(response?.message || 'Cleaner roster updated.');
      await fetchData();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Failed to update cleaner status.');
    } finally {
      setBusyCleanerId('');
    }
  };

  const handleShiftChange = async (
    cleaner: CleanerAccount,
    shift: 'morning' | 'afternoon' | 'night'
  ) => {
    try {
      const actor = resolveActor();
      setBusyCleanerId(cleaner._id);
      setFeedback('');
      const response = await updateCleanerRoster(cleaner._id, {
        actor,
        shift,
        note: decisionNote.trim() || `Shift updated to ${shiftLabel[shift]}.`,
      });
      setFeedback(response?.message || 'Cleaner shift updated.');
      await fetchData();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Failed to update shift.');
    } finally {
      setBusyCleanerId('');
    }
  };

  const approvedCleaners = useMemo(
    () => cleaners.filter((cleaner) => cleaner.approvalStatus === 'approved'),
    [cleaners]
  );

  const activeCleaners = useMemo(
    () => approvedCleaners.filter((cleaner) => cleaner.accountStatus === 'active'),
    [approvedCleaners]
  );

  const workloadRows = useMemo(() => {
    return approvedCleaners
      .map((cleaner) => {
        const assigned = cleaner.assignedTasks || 0;
        const completed = cleaner.completedTasks || 0;
        const score = assigned * 2 - completed * 0.5;

        let loadStatus: 'Balanced' | 'Busy' | 'Overloaded' = 'Balanced';
        if (assigned >= 5) loadStatus = 'Overloaded';
        else if (assigned >= 3) loadStatus = 'Busy';

        return {
          ...cleaner,
          workloadScore: Number(score.toFixed(1)),
          loadStatus,
        };
      })
      .sort((left, right) => left.workloadScore - right.workloadScore);
  }, [approvedCleaners]);

  const rosterRows = useMemo(() => {
    const query = rosterQuery.trim().toLowerCase();

    const filtered = approvedCleaners.filter((cleaner) => {
      const matchesQuery =
        !query ||
        cleaner.name.toLowerCase().includes(query) ||
        String(cleaner.email || '').toLowerCase().includes(query);

      const matchesStatus =
        rosterStatusFilter === 'all' || cleaner.accountStatus === rosterStatusFilter;

      const cleanerShift = cleaner.shift || 'morning';
      const matchesShift = rosterShiftFilter === 'all' || cleanerShift === rosterShiftFilter;

      return matchesQuery && matchesStatus && matchesShift;
    });

    const getWorkloadScore = (cleaner: CleanerAccount) => {
      const assigned = cleaner.assignedTasks || 0;
      const completed = cleaner.completedTasks || 0;
      return assigned * 2 - completed * 0.5;
    };

    return filtered.sort((left, right) => {
      if (rosterSort === 'assigned-asc') {
        return (left.assignedTasks || 0) - (right.assignedTasks || 0);
      }

      if (rosterSort === 'assigned-desc') {
        return (right.assignedTasks || 0) - (left.assignedTasks || 0);
      }

      if (rosterSort === 'completed-desc') {
        return (right.completedTasks || 0) - (left.completedTasks || 0);
      }

      if (rosterSort === 'name-asc') {
        return left.name.localeCompare(right.name);
      }

      if (rosterSort === 'name-desc') {
        return right.name.localeCompare(left.name);
      }

      return getWorkloadScore(left) - getWorkloadScore(right);
    });
  }, [approvedCleaners, rosterQuery, rosterStatusFilter, rosterShiftFilter, rosterSort]);

  const recentApprovalHistory = useMemo(() => {
    return cleaners
      .flatMap((cleaner) =>
        (cleaner.approvalHistory || []).map((entry) => ({
          cleanerName: cleaner.name,
          action: entry.action,
          actor: entry.actor,
          note: entry.note,
          createdAt: entry.createdAt,
        }))
      )
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 20);
  }, [cleaners]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="page-header mb-0">Cleaner Management</h1>
        <Button variant="outline" onClick={() => void fetchData()}>
          Refresh
        </Button>
      </div>

      <div className="metric-card mb-6">
        <h2 className="text-base font-semibold mb-4">Approval Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Approved/Rejected By</p>
            <input
              value={decisionBy}
              onChange={(e) => setDecisionBy(e.target.value)}
              placeholder="Enter admin name or email"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Note / Reason (optional)</p>
            <input
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              placeholder="Approval note or rejection reason"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
            />
          </div>
        </div>
      </div>

      {feedback && (
        <div className="mb-4 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-foreground">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="metric-card">
          <p className="text-sm text-muted-foreground">Total Cleaners</p>
          <p className="text-2xl font-semibold mt-1">{cleaners.length}</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-muted-foreground">Approved</p>
          <p className="text-2xl font-semibold mt-1 text-status-good">{approvedCleaners.length}</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-muted-foreground">Pending Requests</p>
          <p className="text-2xl font-semibold mt-1 text-status-warning">{pendingRequests.length}</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-muted-foreground">Active Accounts</p>
          <p className="text-2xl font-semibold mt-1 text-status-info">{activeCleaners.length}</p>
        </div>
      </div>

      <div className="metric-card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="w-5 h-5 text-status-warning" />
          <h2 className="text-base font-semibold">Cleaner Signup Requests</h2>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading requests...
          </div>
        ) : pendingRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending cleaner signup requests.</p>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((cleaner) => (
              <div key={cleaner._id} className="rounded-lg border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{cleaner.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{cleaner.email || 'No email available'}</p>
                    <p className="text-xs text-muted-foreground mt-1">{cleaner.mobileNumber || 'No mobile available'}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Requested: {cleaner.createdAt ? new Date(cleaner.createdAt).toLocaleString() : '--'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => void handleApprove(cleaner._id)}
                      disabled={busyCleanerId === cleaner._id}
                    >
                      {busyCleanerId === cleaner._id ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Working...</>
                      ) : (
                        <><CheckCircle2 className="w-4 h-4 mr-2" />Approve</>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => void handleReject(cleaner._id)}
                      disabled={busyCleanerId === cleaner._id}
                    >
                      <XCircle className="w-4 h-4 mr-2" />Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="metric-card mb-6 overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <UserCheck className="w-5 h-5 text-status-good" />
          <h2 className="text-base font-semibold">Cleaner Roster</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <input
            value={rosterQuery}
            onChange={(e) => setRosterQuery(e.target.value)}
            placeholder="Search by cleaner name or email"
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
          />
          <select
            value={rosterStatusFilter}
            onChange={(e) => setRosterStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-3 py-2 rounded-md border border-input bg-background text-sm"
            title="Filter by account status"
            aria-label="Filter by account status"
          >
            <option value="all">All statuses</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
          <select
            value={rosterShiftFilter}
            onChange={(e) => setRosterShiftFilter(e.target.value as 'all' | 'morning' | 'afternoon' | 'night')}
            className="px-3 py-2 rounded-md border border-input bg-background text-sm"
            title="Filter by shift"
            aria-label="Filter by shift"
          >
            <option value="all">All shifts</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="night">Night</option>
          </select>
          <select
            value={rosterSort}
            onChange={(e) => setRosterSort(e.target.value as RosterSort)}
            className="px-3 py-2 rounded-md border border-input bg-background text-sm"
            title="Sort roster"
            aria-label="Sort roster"
          >
            <option value="workload-asc">Sort: Lowest workload</option>
            <option value="assigned-asc">Sort: Assigned (low to high)</option>
            <option value="assigned-desc">Sort: Assigned (high to low)</option>
            <option value="completed-desc">Sort: Completed (high to low)</option>
            <option value="name-asc">Sort: Name (A to Z)</option>
            <option value="name-desc">Sort: Name (Z to A)</option>
          </select>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading cleaners...
          </div>
        ) : rosterRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cleaners match the selected filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 pr-4 text-left">Cleaner</th>
                  <th className="pb-3 pr-4 text-left">Status</th>
                  <th className="pb-3 pr-4 text-left">Shift State</th>
                  <th className="pb-3 pr-4 text-left">Shift</th>
                  <th className="pb-3 pr-4 text-left">Assigned</th>
                  <th className="pb-3 pr-4 text-left">Completed</th>
                  <th className="pb-3 pr-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rosterRows.map((cleaner) => (
                  <tr key={cleaner._id} className="table-row-hover border-b border-border last:border-b-0">
                    <td className="py-4 pr-4">
                      <p className="font-medium text-sm">{cleaner.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{cleaner.email || '--'}</p>
                      <p className="text-xs text-muted-foreground mt-1">{cleaner.mobileNumber || '--'}</p>
                    </td>
                    <td className="py-4 pr-4">
                      <StatusBadge
                        status={cleaner.accountStatus === 'active' ? 'good' : 'danger'}
                        label={cleaner.accountStatus === 'active' ? 'Active' : 'Inactive'}
                      />
                    </td>
                    <td className="py-4 pr-4">
                      <StatusBadge
                        status={cleaner.status === 'off-shift' ? 'warning' : cleaner.status === 'busy' ? 'info' : 'good'}
                        label={cleaner.status === 'off-shift' ? 'Off Shift' : cleaner.status === 'busy' ? 'Busy' : 'On Shift'}
                      />
                    </td>
                    <td className="py-4 pr-4">
                      <select
                        value={cleaner.shift || 'morning'}
                        onChange={(e) => void handleShiftChange(cleaner, e.target.value as 'morning' | 'afternoon' | 'night')}
                        className="px-2 py-1 rounded border border-input bg-background text-sm"
                        title="Shift"
                        aria-label="Shift"
                        disabled={busyCleanerId === cleaner._id}
                      >
                        <option value="morning">Morning</option>
                        <option value="afternoon">Afternoon</option>
                        <option value="night">Night</option>
                      </select>
                    </td>
                    <td className="py-4 pr-4 text-sm">{cleaner.assignedTasks ?? 0}</td>
                    <td className="py-4 pr-4 text-sm">{cleaner.completedTasks ?? 0}</td>
                    <td className="py-4 pr-4">
                      <Button
                        variant="outline"
                        onClick={() => void handleRosterStatusToggle(cleaner)}
                        disabled={busyCleanerId === cleaner._id}
                      >
                        {cleaner.accountStatus === 'active' ? 'Set Inactive' : 'Set Active'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="metric-card mb-6">
        <h2 className="text-base font-semibold mb-4">Workload Balancing View</h2>
        {workloadRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No approved cleaners available for workload balancing.</p>
        ) : (
          <div className="space-y-3">
            {workloadRows.map((row) => (
              <div key={row._id} className="rounded-lg border border-border bg-background p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{row.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Shift: {row.shiftLabel || shiftLabel[row.shift || 'morning']}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">Score: {row.workloadScore}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Assigned {row.assignedTasks || 0} | Completed {row.completedTasks || 0}
                  </p>
                  <p className="text-xs mt-1 font-medium">
                    {row.loadStatus}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="metric-card">
        <h2 className="text-base font-semibold mb-4">Approval Audit History (Who Approved/Rejected and When)</h2>
        {recentApprovalHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">No approval audit events yet.</p>
        ) : (
          <div className="space-y-2">
            {recentApprovalHistory.map((entry, index) => (
              <div key={`${entry.cleanerName}-${entry.createdAt}-${index}`} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium capitalize">{entry.action.replace(/-/g, ' ')} | {entry.cleanerName}</p>
                  <p className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">By: {entry.actor}</p>
                {entry.note && <p className="text-xs text-foreground mt-1">{entry.note}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CleanerManagement;
