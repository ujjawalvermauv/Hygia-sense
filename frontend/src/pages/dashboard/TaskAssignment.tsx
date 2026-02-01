import { useState } from 'react';
import { Check, X, Eye, Clock, CheckCircle2, XCircle, Image } from 'lucide-react';
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

type ReviewStatus = 'pending_review' | 'approved' | 'rejected';

interface TaskSubmission {
  id: string;
  washroom: string;
  floor: string;
  cleaner: string;
  submittedAt: string;
  status: ReviewStatus;
  beforePhoto: string;
  afterPhoto: string;
  cleanlinessScore?: number;
}

const mockSubmissions: TaskSubmission[] = [
  { 
    id: '1', 
    washroom: 'Washroom A', 
    floor: 'Ground Floor', 
    cleaner: 'Rajesh Kumar',
    submittedAt: '2025-01-26 09:45 AM',
    status: 'pending_review',
    beforePhoto: '/placeholder.svg',
    afterPhoto: '/placeholder.svg',
  },
  { 
    id: '2', 
    washroom: 'Washroom B', 
    floor: 'First Floor', 
    cleaner: 'Priya Sharma',
    submittedAt: '2025-01-26 10:15 AM',
    status: 'pending_review',
    beforePhoto: '/placeholder.svg',
    afterPhoto: '/placeholder.svg',
  },
  { 
    id: '3', 
    washroom: 'Washroom C', 
    floor: 'Second Floor', 
    cleaner: 'Amit Patel',
    submittedAt: '2025-01-26 08:30 AM',
    status: 'approved',
    beforePhoto: '/placeholder.svg',
    afterPhoto: '/placeholder.svg',
    cleanlinessScore: 92,
  },
  { 
    id: '4', 
    washroom: 'Washroom D', 
    floor: 'Third Floor', 
    cleaner: 'Sunita Devi',
    submittedAt: '2025-01-26 07:45 AM',
    status: 'rejected',
    beforePhoto: '/placeholder.svg',
    afterPhoto: '/placeholder.svg',
    cleanlinessScore: 65,
  },
];

const TaskAssignment = () => {
  const [submissions, setSubmissions] = useState<TaskSubmission[]>(mockSubmissions);
  const [selectedSubmission, setSelectedSubmission] = useState<TaskSubmission | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending_review' | 'approved' | 'rejected'>('all');

  const filteredSubmissions = submissions.filter(s => {
    if (filter === 'all') return true;
    return s.status === filter;
  });

  const pendingCount = submissions.filter(s => s.status === 'pending_review').length;
  const approvedCount = submissions.filter(s => s.status === 'approved').length;
  const rejectedCount = submissions.filter(s => s.status === 'rejected').length;

  const handleViewSubmission = (submission: TaskSubmission) => {
    setSelectedSubmission(submission);
    setIsViewDialogOpen(true);
  };

  const handleApprove = (id: string) => {
    setSubmissions(prev => prev.map(s => 
      s.id === id 
        ? { ...s, status: 'approved' as ReviewStatus, cleanlinessScore: Math.floor(Math.random() * 15) + 85 }
        : s
    ));
    setIsViewDialogOpen(false);
  };

  const handleReject = (id: string) => {
    setSubmissions(prev => prev.map(s => 
      s.id === id 
        ? { ...s, status: 'rejected' as ReviewStatus, cleanlinessScore: Math.floor(Math.random() * 20) + 50 }
        : s
    ));
    setIsViewDialogOpen(false);
  };

  const getStatusBadge = (status: ReviewStatus) => {
    switch (status) {
      case 'pending_review':
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="metric-card">
          <p className="text-sm text-muted-foreground">Total Submissions</p>
          <p className="text-2xl font-semibold mt-1">{submissions.length}</p>
        </div>
        <div className="metric-card cursor-pointer hover:border-status-warning" onClick={() => setFilter('pending_review')}>
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
        {(['all', 'pending_review', 'approved', 'rejected'] as const).map((f) => (
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
             f === 'pending_review' ? 'Pending' : 
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 pr-4 text-left">Washroom</th>
                  <th className="pb-3 pr-4 text-left">Cleaner</th>
                  <th className="pb-3 pr-4 text-left">Submitted At</th>
                  <th className="pb-3 pr-4 text-left">Status</th>
                  <th className="pb-3 pr-4 text-left">Score</th>
                  <th className="pb-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((submission) => (
                  <tr key={submission.id} className="table-row-hover border-b border-border last:border-b-0">
                    <td className="py-4 pr-4">
                      <p className="font-medium text-sm">{submission.washroom}</p>
                      <p className="text-xs text-muted-foreground">{submission.floor}</p>
                    </td>
                    <td className="py-4 pr-4">
                      <p className="text-sm">{submission.cleaner}</p>
                    </td>
                    <td className="py-4 pr-4">
                      <p className="text-sm text-muted-foreground">{submission.submittedAt}</p>
                    </td>
                    <td className="py-4 pr-4">
                      {getStatusBadge(submission.status)}
                    </td>
                    <td className="py-4 pr-4">
                      {submission.cleanlinessScore ? (
                        <span className={`text-sm font-medium ${
                          submission.cleanlinessScore >= 80 ? 'text-status-good' : 'text-status-danger'
                        }`}>
                          {submission.cleanlinessScore}%
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewSubmission(submission)}
                          className="h-8"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        {submission.status === 'pending_review' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApprove(submission.id)}
                              className="h-8 text-status-good hover:text-status-good hover:bg-status-good/10"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReject(submission.id)}
                              className="h-8 text-status-danger hover:text-status-danger hover:bg-status-danger/10"
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
        </CardContent>
      </Card>

      {/* View Submission Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Cleaning Submission</DialogTitle>
            <DialogDescription>
              {selectedSubmission?.washroom} - {selectedSubmission?.floor}
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6 mt-4">
              {/* Submission Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Cleaner</p>
                  <p className="font-medium">{selectedSubmission.cleaner}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Submitted At</p>
                  <p className="font-medium">{selectedSubmission.submittedAt}</p>
                </div>
              </div>

              {/* Photo Comparison */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">Before Cleaning</p>
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border">
                    <Image className="w-12 h-12 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">After Cleaning</p>
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border">
                    <Image className="w-12 h-12 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {/* Status and Score */}
              {selectedSubmission.cleanlinessScore && (
                <div className="flex items-center justify-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    selectedSubmission.cleanlinessScore >= 80 ? 'bg-status-good' : 'bg-status-danger'
                  }`}>
                    <span className="text-xl font-bold text-white">{selectedSubmission.cleanlinessScore}%</span>
                  </div>
                  <div>
                    <p className="font-medium">
                      {selectedSubmission.cleanlinessScore >= 80 ? 'Cleaning Approved' : 'Reclean Required'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedSubmission.cleanlinessScore >= 80 
                        ? 'Meets cleanliness standards' 
                        : 'Below 80% threshold'}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons for Pending */}
              {selectedSubmission.status === 'pending_review' && (
                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => handleReject(selectedSubmission.id)}
                    className="text-status-danger hover:text-status-danger hover:bg-status-danger/10"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject & Reclean
                  </Button>
                  <Button
                    onClick={() => handleApprove(selectedSubmission.id)}
                    className="bg-status-good hover:bg-status-good/90 text-white"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve
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
