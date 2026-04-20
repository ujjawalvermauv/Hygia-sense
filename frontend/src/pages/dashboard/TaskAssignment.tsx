import { useState, useEffect } from 'react';
import { Check, X, Eye, Clock, CheckCircle2, XCircle, Image, Loader, Brain, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/dashboard/StatusBadge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  getAllTasks,
  approveTask, 
  rejectTask 
} from '@/services/taskService';
import { autoAssignAiTasks } from '@/services/aiService';

type ReviewStatus = 'pending' | 'approved' | 'rejected';

interface Photo {
  _id: string;
  filename: string;
  url: string;
  uploadedAt: string;
}

interface TaskSubmission {
  _id: string;
  toilet: {
    _id: string;
    name: string;
  } | null;
  cleaner: {
    _id: string;
    name: string;
  } | null;
  photos: Photo[];
  approvalStatus?: ReviewStatus;
  status: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  slaDeadline?: string;
  startedAt?: string;
  qrVerified?: boolean;
  completionEfficiency?: number;
  timeEfficiency?: number;
  photoImprovementScore?: number;
  aiRecommendation?: {
    riskScore?: number;
    recommendation?: string;
    confidence?: number;
    generatedAt?: string;
  };
  reviewHistory?: Array<{
    type: string;
    message: string;
    efficiency?: number;
    createdAt: string;
    actor?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const backendBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

const getPhotoUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${backendBaseUrl}${url.startsWith('/') ? url : `/${url}`}`;
};

const TaskAssignment = () => {
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<TaskSubmission | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isAutoAssignLoading, setIsAutoAssignLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Fetch tasks on mount and set up interval
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        const tasks = await getAllTasks();
        setSubmissions(tasks);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();

    // Poll for new tasks every 10 seconds
    const interval = setInterval(fetchTasks, 10000);

    return () => clearInterval(interval);
  }, []);

  const filteredSubmissions = submissions.filter(s => {
    const status = s.approvalStatus || 'pending';
    if (filter === 'all') return true;
    return status === filter;
  });

  const pendingCount = submissions.filter(s => (s.approvalStatus || 'pending') === 'pending').length;
  const approvedCount = submissions.filter(s => s.approvalStatus === 'approved').length;
  const rejectedCount = submissions.filter(s => s.approvalStatus === 'rejected').length;

  const handleViewSubmission = (submission: TaskSubmission) => {
    setSelectedSubmission(submission);
    setIsViewDialogOpen(true);
  };

  const handleApprove = async (id: string) => {
    try {
      setIsActionLoading(true);
      await approveTask(id, 'admin123', 'Approved - looks great!');
      setSubmissions(prev => prev.map(s => 
        s._id === id 
          ? { ...s, approvalStatus: 'approved' as ReviewStatus }
          : s
      ));
      setIsViewDialogOpen(false);
    } catch (error) {
      console.error('Error approving task:', error);
      alert('Failed to approve task');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setIsActionLoading(true);
      await rejectTask(id, 'admin123', 'Please redo the cleaning');
      setSubmissions(prev => prev.map(s => 
        s._id === id 
          ? { ...s, approvalStatus: 'rejected' as ReviewStatus }
          : s
      ));
      setIsViewDialogOpen(false);
    } catch (error) {
      console.error('Error rejecting task:', error);
      alert('Failed to reject task');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAutoAssign = async () => {
    try {
      setIsAutoAssignLoading(true);
      const response = await autoAssignAiTasks(60, 6);

      const tasks = await getAllTasks();
      setSubmissions(tasks);

      alert(`AI created ${response.assignmentsCreated || 0} high-priority task(s).`);
    } catch (error) {
      console.error('AI auto-assignment failed:', error);
      alert('AI auto-assignment failed');
    } finally {
      setIsAutoAssignLoading(false);
    }
  };

  const getPriorityBadge = (priority: TaskSubmission['priority']) => {
    if (priority === 'critical') return <StatusBadge status="danger" label="Critical" />;
    if (priority === 'high') return <StatusBadge status="warning" label="High" />;
    if (priority === 'medium') return <StatusBadge status="info" label="Medium" />;
    return <StatusBadge status="good" label="Low" />;
  };

  const getSlaStatus = (deadline?: string) => {
    if (!deadline) return <StatusBadge status="info" label="No SLA" />;

    const diffMins = Math.round((new Date(deadline).getTime() - Date.now()) / 60000);
    if (diffMins <= 0) return <StatusBadge status="danger" label="Overdue" />;
    if (diffMins <= 15) return <StatusBadge status="warning" label={`${diffMins}m left`} />;
    return <StatusBadge status="good" label={`${diffMins}m left`} />;
  };

  const getStatusBadge = (status: ReviewStatus) => {
    switch (status) {
      case 'pending':
        return <StatusBadge status="warning" label="Pending Review" />;
      case 'approved':
        return <StatusBadge status="good" label="Approved" />;
      case 'rejected':
        return <StatusBadge status="danger" label="Rejected" />;
    }
  };

  return (
    <div>
      <h1 className="page-header">Task Review</h1>

      <div className="mb-4 flex justify-end">
        <Button onClick={handleAutoAssign} disabled={isAutoAssignLoading}>
          {isAutoAssignLoading ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Running AI...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4 mr-2" />
              Auto-Assign High Risk
            </>
          )}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="metric-card">
          <p className="text-sm text-muted-foreground">Total Submissions</p>
          <p className="text-2xl font-semibold mt-1">{submissions.length}</p>
        </div>
        <div className="metric-card cursor-pointer hover:border-status-warning" onClick={() => setFilter('pending')}>
          <p className="text-sm text-muted-foreground">Pending Review</p>
          <p className="text-2xl font-semibold mt-1 text-status-warning">{pendingCount}</p>
        </div>
        <div className="metric-card cursor-pointer hover:border-status-good" onClick={() => setFilter('approved')}>
          <p className="text-sm text-muted-foreground">Approved</p>
          <p className="text-2xl font-semibold mt-1 text-status-good">{approvedCount}</p>
        </div>
        <div className="metric-card cursor-pointer hover:border-status-danger" onClick={() => setFilter('rejected')}>
          <p className="text-sm text-muted-foreground">Rejected</p>
          <p className="text-2xl font-semibold mt-1 text-status-danger">{rejectedCount}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {f === 'all' ? 'All' : 
             f === 'pending' ? 'Pending' : 
             f === 'approved' ? 'Approved' : 'Rejected'}
          </button>
        ))}
      </div>

      {/* Submissions Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Cleaning Task Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading tasks...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 pr-4 text-left">Washroom</th>
                    <th className="pb-3 pr-4 text-left">Cleaner</th>
                    <th className="pb-3 pr-4 text-left">Priority</th>
                    <th className="pb-3 pr-4 text-left">SLA</th>
                    <th className="pb-3 pr-4 text-left">Photos</th>
                    <th className="pb-3 pr-4 text-left">Submitted At</th>
                    <th className="pb-3 pr-4 text-left">Status</th>
                    <th className="pb-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.map((submission) => (
                    <tr key={submission._id} className="table-row-hover border-b border-border last:border-b-0">
                      <td className="py-4 pr-4">
                        <p className="font-medium text-sm">{submission.toilet?.name || 'Unknown washroom'}</p>
                      </td>
                      <td className="py-4 pr-4">
                        <p className="text-sm">{submission.cleaner?.name || 'Unknown cleaner'}</p>
                      </td>
                      <td className="py-4 pr-4">
                        {getPriorityBadge(submission.priority || 'low')}
                      </td>
                      <td className="py-4 pr-4">
                        {getSlaStatus(submission.slaDeadline)}
                      </td>
                      <td className="py-4 pr-4">
                        <span className="text-sm font-medium text-muted-foreground">
                          {submission.photos.length} photo(s)
                        </span>
                      </td>
                      <td className="py-4 pr-4">
                        <p className="text-sm text-muted-foreground">
                          {new Date(submission.createdAt).toLocaleString()}
                        </p>
                      </td>
                      <td className="py-4 pr-4">
                        {getStatusBadge((submission.approvalStatus || 'pending') as ReviewStatus)}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewSubmission(submission)}
                            className="h-8"
                            disabled={isActionLoading}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          {(submission.approvalStatus || 'pending') === 'pending' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApprove(submission._id)}
                                className="h-8 text-status-good hover:text-status-good hover:bg-status-good/10"
                                disabled={isActionLoading}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReject(submission._id)}
                                className="h-8 text-status-danger hover:text-status-danger hover:bg-status-danger/10"
                                disabled={isActionLoading}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredSubmissions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No submissions found for this filter.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Submission Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Cleaning Submission</DialogTitle>
            <DialogDescription>
              {selectedSubmission?.toilet?.name || 'Unknown washroom'}
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6 mt-4">
              {/* Submission Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Cleaner</p>
                  <p className="font-medium">{selectedSubmission.cleaner?.name || 'Unknown cleaner'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Submitted At</p>
                  <p className="font-medium">
                    {new Date(selectedSubmission.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Priority</p>
                  <div className="mt-1">{getPriorityBadge(selectedSubmission.priority || 'low')}</div>
                </div>
                <div>
                  <p className="text-muted-foreground">SLA</p>
                  <div className="mt-1">{getSlaStatus(selectedSubmission.slaDeadline)}</div>
                </div>
                <div>
                  <p className="text-muted-foreground">QR Verified</p>
                  <p className={`font-medium mt-1 ${selectedSubmission.qrVerified ? 'text-status-good' : 'text-status-warning'}`}>
                    {selectedSubmission.qrVerified ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Final Efficiency</p>
                  <p className="font-medium mt-1">{selectedSubmission.completionEfficiency !== undefined ? `${selectedSubmission.completionEfficiency}%` : '--'}</p>
                </div>
              </div>

              {(selectedSubmission.startedAt || selectedSubmission.timeEfficiency !== undefined || selectedSubmission.photoImprovementScore !== undefined) && (
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-muted-foreground text-xs uppercase">Start Time</p>
                    <p className="font-medium mt-1">
                      {selectedSubmission.startedAt ? new Date(selectedSubmission.startedAt).toLocaleString() : 'Not started'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-muted-foreground text-xs uppercase">Time Efficiency</p>
                    <p className="font-medium mt-1">{selectedSubmission.timeEfficiency !== undefined ? `${selectedSubmission.timeEfficiency}%` : '--'}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-muted-foreground text-xs uppercase">Photo Score</p>
                    <p className="font-medium mt-1">{selectedSubmission.photoImprovementScore !== undefined ? `${selectedSubmission.photoImprovementScore}%` : '--'}</p>
                  </div>
                </div>
              )}

              {selectedSubmission.aiRecommendation?.riskScore !== undefined && (
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-status-info" />
                        AI Recommendation
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedSubmission.aiRecommendation.recommendation || 'No recommendation text available.'}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>Risk: {selectedSubmission.aiRecommendation.riskScore}/100</p>
                      <p>Confidence: {selectedSubmission.aiRecommendation.confidence || 0}%</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedSubmission.reviewHistory && selectedSubmission.reviewHistory.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-3">Review History</p>
                  <div className="space-y-2">
                    {selectedSubmission.reviewHistory.map((entry, index) => (
                      <div key={`${entry.type}-${index}`} className="rounded-lg border border-border bg-background p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium capitalize">{entry.type.replace(/-/g, ' ')}</p>
                            <p className="text-xs text-muted-foreground mt-1">{entry.message}</p>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            {entry.efficiency !== undefined && <p>Efficiency: {entry.efficiency}%</p>}
                            <p>{new Date(entry.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Photos Gallery */}
              <div>
                <p className="text-sm font-medium mb-3">Uploaded Photos ({selectedSubmission.photos.length})</p>
                {selectedSubmission.photos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedSubmission.photos.map((photo) => (
                      <div key={photo._id} className="space-y-2">
                        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border overflow-hidden">
                          <img 
                            src={getPhotoUrl(photo.url)} 
                            alt={photo.filename}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(photo.uploadedAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border">
                    <Image className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Action Buttons for Pending */}
              {selectedSubmission.approvalStatus === 'pending' && (
                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => handleReject(selectedSubmission._id)}
                    className="text-status-danger hover:text-status-danger hover:bg-status-danger/10"
                    disabled={isActionLoading}
                  >
                    {isActionLoading ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject & Reclean
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleApprove(selectedSubmission._id)}
                    className="bg-status-good hover:bg-status-good/90 text-white"
                    disabled={isActionLoading}
                  >
                    {isActionLoading ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Approve
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskAssignment;

