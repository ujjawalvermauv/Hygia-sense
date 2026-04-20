import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  AudioLines,
  Camera,
  CheckCircle2,
  Clock,
  Image,
  Loader2,
  MapPin,
  Mic,
  ScanLine,
  Send,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { completeTask, getTaskById, reportTaskIssue, startTask } from '@/services/taskService';
import { Html5Qrcode } from 'html5-qrcode';

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'under_review';
type IssueSeverity = 'low' | 'medium' | 'high';

interface TaskPhoto {
  filename?: string;
  url?: string;
  uploadedAt?: string;
}

interface TaskIssueReport {
  note: string;
  severity: IssueSeverity;
  reportedVia: 'text' | 'voice';
  createdAt: string;
}

interface TaskReviewHistory {
  type: string;
  message: string;
  createdAt: string;
  actor?: string;
}

interface TaskDetail {
  id: string;
  washroom: string;
  floor: string;
  building: string;
  assignedTime: string;
  status: TaskStatus;
  priority: 'normal' | 'urgent';
  notes: string;
  startedAt?: string;
  completedAt?: string;
  qrVerified?: boolean;
  startedLocation?: { latitude?: number; longitude?: number; accuracy?: number };
  completionEfficiency?: number;
  timeEfficiency?: number;
  photoImprovementScore?: number;
  photos: TaskPhoto[];
  reviewHistory: TaskReviewHistory[];
  issueReports: TaskIssueReport[];
}

const mapBackendStatusToCleanerStatus = (status?: string): TaskStatus => {
  if (status === 'assigned') return 'pending';
  if (status === 'in-progress') return 'in_progress';
  if (status === 'pending-approval') return 'under_review';
  return 'completed';
};

const mapTaskFromApi = (data: any): TaskDetail => ({
  id: data._id,
  washroom: data.toilet?.name || 'Unknown washroom',
  floor: data.toilet?.location || 'Unknown floor',
  building: 'Main Building',
  assignedTime: new Date(data.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  }),
  status: mapBackendStatusToCleanerStatus(data.status),
  priority: data.priority === 'critical' || data.priority === 'high' ? 'urgent' : 'normal',
  notes: data.completionNotes || 'No notes provided.',
  startedAt: data.startedAt,
  completedAt: data.completedAt,
  qrVerified: data.qrVerified,
  startedLocation: data.startedLocation,
  completionEfficiency: data.completionEfficiency,
  timeEfficiency: data.timeEfficiency,
  photoImprovementScore: data.photoImprovementScore,
  photos: data.photos || [],
  reviewHistory: data.reviewHistory || [],
  issueReports: data.issueReports || [],
});

const uploadsBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

const resolvePhotoUrl = (photo?: TaskPhoto) => {
  const value = photo?.url || '';
  if (!value) return '';
  if (value.startsWith('http')) return value;
  return `${uploadsBaseUrl}${value.startsWith('/') ? value : `/${value}`}`;
};

const formatDateTime = (value?: string) => {
  if (!value) return '--';
  return new Date(value).toLocaleString();
};

const CleanerTaskDetail = () => {
  const navigate = useNavigate();
  const { taskId } = useParams<{ taskId: string }>();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [beforePhoto, setBeforePhoto] = useState<File | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<File | null>(null);
  const [beforePreviewUrl, setBeforePreviewUrl] = useState<string>('');
  const [afterPreviewUrl, setAfterPreviewUrl] = useState<string>('');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('pending');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [submissionFeedback, setSubmissionFeedback] = useState('');
  const [startVerification, setStartVerification] = useState('');

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [manualQrValue, setManualQrValue] = useState('');

  const [issueNote, setIssueNote] = useState('');
  const [issueSeverity, setIssueSeverity] = useState<IssueSeverity>('medium');
  const [issueFeedback, setIssueFeedback] = useState('');
  const [isReportingIssue, setIsReportingIssue] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [reportedVia, setReportedVia] = useState<'text' | 'voice'>('text');

  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const speechRef = useRef<any>(null);

  useEffect(() => {
    const fetchTask = async () => {
      if (!taskId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await getTaskById(taskId);
        const mappedTask = mapTaskFromApi(data);
        setTask(mappedTask);
        setTaskStatus(mappedTask.status);
      } catch (error) {
        console.error('Failed to fetch task details:', error);
        setTask(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTask();
  }, [taskId]);

  useEffect(() => {
    return () => {
      if (beforePreviewUrl) URL.revokeObjectURL(beforePreviewUrl);
      if (afterPreviewUrl) URL.revokeObjectURL(afterPreviewUrl);

      if (qrScannerRef.current) {
        qrScannerRef.current.stop().catch(() => undefined);
        qrScannerRef.current.clear().catch(() => undefined);
        qrScannerRef.current = null;
      }

      if (speechRef.current) {
        try {
          speechRef.current.stop();
        } catch {
          // ignore stop errors
        }
      }
    };
  }, [beforePreviewUrl, afterPreviewUrl]);

  useEffect(() => {
    const stopScanner = async () => {
      if (!qrScannerRef.current) return;

      try {
        await qrScannerRef.current.stop();
      } catch {
        // ignore stop errors
      }

      try {
        await qrScannerRef.current.clear();
      } catch {
        // ignore clear errors
      }

      qrScannerRef.current = null;
    };

    if (!isScannerOpen) {
      void stopScanner();
      return;
    }

    const startScannerDevice = async () => {
      setScannerError('');
      setIsScanning(true);

      try {
        const qrScanner = new Html5Qrcode('qr-reader');
        qrScannerRef.current = qrScanner;

        await qrScanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          async (decodedText) => {
            setManualQrValue(decodedText);
            setIsScannerOpen(false);
            await stopScanner();
            await handleStartTask(decodedText);
          },
          () => {
            // ignore decoding attempts while scanning
          }
        );
      } catch (error) {
        console.error('Failed to start QR scanner:', error);
        setScannerError('Camera could not start. You can type the QR code manually below.');
      } finally {
        setIsScanning(false);
      }
    };

    void startScannerDevice();

    return () => {
      void stopScanner();
    };
  }, [isScannerOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileSizeLimit = 5 * 1024 * 1024;
    if (file.size > fileSizeLimit) {
      alert('File is too large. Please upload an image under 5MB.');
      return;
    }

    if (type === 'before') {
      setBeforePhoto(file);
      if (beforePreviewUrl) URL.revokeObjectURL(beforePreviewUrl);
      setBeforePreviewUrl(URL.createObjectURL(file));
      setTaskStatus('in_progress');
      return;
    }

    setAfterPhoto(file);
    if (afterPreviewUrl) URL.revokeObjectURL(afterPreviewUrl);
    setAfterPreviewUrl(URL.createObjectURL(file));
  };

  const handleStartTask = async (qrOverride?: string) => {
    if (!taskId) return;

    const qrValue = qrOverride || manualQrValue || window.prompt('Enter the QR code shown inside the toilet (use 1234 for now)');
    if (!qrValue) return;

    try {
      let location: { latitude: number; longitude: number; accuracy?: number } | undefined;

      if (navigator.geolocation) {
        location = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
              });
            },
            () => resolve(undefined),
            { enableHighAccuracy: true, timeout: 10000 }
          );
        });
      }

      const response = await startTask(taskId, qrValue, location);
      const mappedTask = mapTaskFromApi(response.task || task);
      setTask(mappedTask);
      setTaskStatus(mappedTask.status);
      setStartVerification(response?.message || 'QR verified. Task started.');
      setSubmissionFeedback('');
      setIssueFeedback('');
      setIsScannerOpen(false);
    } catch (error) {
      console.error('Failed to start task:', error);
      alert(error instanceof Error ? error.message : 'Failed to start task. Please scan the correct QR code.');
    }
  };

  const handleSubmitForReview = async () => {
    if (!beforePhoto || !afterPhoto || !taskId) return;

    try {
      setIsSubmitting(true);
      const response = await completeTask(taskId, [beforePhoto, afterPhoto]);
      const mappedTask = mapTaskFromApi(response.task || task);
      setTask(mappedTask);
      setTaskStatus(mappedTask.status);
      setSubmissionFeedback(response?.message || 'Task submitted successfully.');
    } catch (error) {
      console.error('Failed to upload photos:', error);
      alert(error instanceof Error ? error.message : 'Failed to submit photos. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoiceCapture = () => {
    const SpeechRecognitionApi = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      alert('Voice notes are not supported in this browser. Please type the issue details.');
      return;
    }

    const recognition = new SpeechRecognitionApi();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    speechRef.current = recognition;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || '';
      if (!transcript) return;
      setIssueNote((prev) => `${prev ? `${prev} ` : ''}${transcript}`.trim());
      setReportedVia('voice');
    };

    recognition.start();
  };

  const handleReportIssue = async () => {
    if (!taskId || !issueNote.trim()) return;

    try {
      setIsReportingIssue(true);
      const response = await reportTaskIssue(taskId, issueNote.trim(), issueSeverity, reportedVia);
      const mappedTask = mapTaskFromApi(response.task || task);
      setTask(mappedTask);
      setTaskStatus(mappedTask.status);
      setIssueFeedback(response?.message || 'Issue reported successfully.');
      setIssueNote('');
      setReportedVia('text');
    } catch (error) {
      console.error('Failed to report issue:', error);
      alert(error instanceof Error ? error.message : 'Failed to report issue. Please try again.');
    } finally {
      setIsReportingIssue(false);
    }
  };

  const canUploadPhotos = taskStatus === 'in_progress';
  const canSubmit = beforePhoto && afterPhoto && taskStatus === 'in_progress';

  const evidenceEvents = useMemo(() => {
    if (!task) return [] as TaskReviewHistory[];
    return task.reviewHistory
      .filter((entry) => ['started', 'completed', 'issue-reported', 'manual-review', 'auto-approved'].includes(entry.type))
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }, [task]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <p className="text-muted-foreground">Loading task...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <p className="text-muted-foreground">Task not found</p>
        <Button variant="outline" onClick={() => navigate('/cleaner')} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-6 space-y-4">
      <button
        onClick={() => navigate('/cleaner')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Back to Tasks</span>
      </button>

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-start justify-between mb-3 gap-3">
          <div>
            {task.priority === 'urgent' && (
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-status-danger text-status-danger-foreground mb-2">
                Urgent
              </span>
            )}
            <h1 className="text-lg font-semibold text-foreground">{task.washroom}</h1>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              taskStatus === 'pending'
                ? 'bg-status-warning/10 text-status-warning'
                : taskStatus === 'in_progress'
                  ? 'bg-status-info/10 text-status-info'
                  : taskStatus === 'under_review'
                    ? 'bg-accent/10 text-accent'
                    : 'bg-status-good/10 text-status-good'
            }`}
          >
            {taskStatus === 'pending'
              ? 'Pending'
              : taskStatus === 'in_progress'
                ? 'In Progress'
                : taskStatus === 'under_review'
                  ? 'Under Review'
                  : 'Completed'}
          </span>
        </div>

        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{task.floor}, {task.building}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Assigned: {task.assignedTime}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-[10px] uppercase text-muted-foreground">Start Time</p>
            <p className="text-sm font-semibold text-foreground">{formatDateTime(task.startedAt)}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-[10px] uppercase text-muted-foreground">QR Verified</p>
            <p className={`text-sm font-semibold ${task.qrVerified ? 'text-status-good' : 'text-status-warning'}`}>
              {task.qrVerified ? 'Yes' : 'No'}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-[10px] uppercase text-muted-foreground">Final Efficiency</p>
            <p className="text-sm font-semibold text-foreground">
              {task.completionEfficiency !== undefined ? `${task.completionEfficiency}%` : '--'}
            </p>
          </div>
        </div>

        {startVerification && (
          <div className="mt-4 p-3 bg-status-info/10 rounded-lg">
            <p className="text-sm text-status-info font-medium">{startVerification}</p>
          </div>
        )}

        {submissionFeedback && (
          <div className="mt-3 p-3 bg-accent/10 rounded-lg">
            <p className="text-sm text-foreground font-medium">{submissionFeedback}</p>
          </div>
        )}
      </div>

      {taskStatus !== 'under_review' && taskStatus !== 'completed' && (
        <div className="space-y-4">
          {taskStatus === 'pending' && (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              Scan the toilet QR code first. Photo uploads unlock after verification.
            </div>
          )}

          <Button onClick={() => setIsScannerOpen(true)} className="w-full h-12 text-base" variant={taskStatus === 'pending' ? 'default' : 'outline'}>
            <ScanLine className="w-4 h-4 mr-2" />
            {taskStatus === 'pending' ? 'Open QR Scanner' : 'Re-scan QR to Verify Location'}
          </Button>

          {isScannerOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Scan Toilet QR</h3>
                    <p className="text-xs text-muted-foreground">Point your camera at the printed QR code</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(false)}
                    aria-label="Close QR scanner"
                    title="Close QR scanner"
                    className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  <div className="rounded-xl overflow-hidden border border-border bg-black">
                    <div id="qr-reader" className="w-full min-h-[280px]" />
                  </div>

                  {isScanning && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Starting camera...
                    </div>
                  )}

                  {scannerError && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      {scannerError}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Manual QR fallback</label>
                    <input
                      value={manualQrValue}
                      onChange={(e) => setManualQrValue(e.target.value)}
                      placeholder="Enter QR value"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground">Use 1234 for testing.</p>
                  </div>

                  <Button className="w-full" onClick={() => handleStartTask(manualQrValue)} disabled={!manualQrValue}>
                    Start Task with QR
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className={`bg-card border border-border rounded-xl p-4 ${!canUploadPhotos ? 'opacity-75' : ''}`}>
            <div className="flex items-center gap-2 mb-3">
              <Camera className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-medium text-foreground">Before Cleaning Photo</h3>
              {beforePhoto && <CheckCircle2 className="w-4 h-4 text-status-good ml-auto" />}
            </div>

            {beforePhoto ? (
              <div className="relative">
                <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                  {beforePreviewUrl ? (
                    <img src={beforePreviewUrl} alt="Before cleaning preview" className="w-full h-full object-cover" />
                  ) : (
                    <Image className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2 truncate">{beforePhoto.name}</p>
                <label className={`absolute inset-0 ${canUploadPhotos ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                  <input
                    type="file"
                    accept="image/*"
                    aria-label="Before cleaning photo"
                    title="Before cleaning photo"
                    disabled={!canUploadPhotos}
                    onChange={(e) => handleFileChange(e, 'before')}
                    className="sr-only"
                  />
                </label>
              </div>
            ) : (
              <label className={`block ${canUploadPhotos ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                <div className="aspect-video border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-accent transition-colors">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{canUploadPhotos ? 'Tap to take photo' : 'Locked until QR is verified'}</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  aria-label="Before cleaning photo"
                  title="Before cleaning photo"
                  disabled={!canUploadPhotos}
                  onChange={(e) => handleFileChange(e, 'before')}
                  className="sr-only"
                />
              </label>
            )}
          </div>

          <div className={`bg-card border border-border rounded-xl p-4 ${!canUploadPhotos ? 'opacity-75' : ''}`}>
            <div className="flex items-center gap-2 mb-3">
              <Camera className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-medium text-foreground">After Cleaning Photo</h3>
              {afterPhoto && <CheckCircle2 className="w-4 h-4 text-status-good ml-auto" />}
            </div>

            {!beforePhoto ? (
              <div className="aspect-video bg-muted/50 rounded-lg flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Upload before photo first</p>
              </div>
            ) : afterPhoto ? (
              <div className="relative">
                <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                  {afterPreviewUrl ? (
                    <img src={afterPreviewUrl} alt="After cleaning preview" className="w-full h-full object-cover" />
                  ) : (
                    <Image className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2 truncate">{afterPhoto.name}</p>
                <label className={`absolute inset-0 ${canUploadPhotos ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                  <input
                    type="file"
                    accept="image/*"
                    aria-label="After cleaning photo"
                    title="After cleaning photo"
                    disabled={!canUploadPhotos}
                    onChange={(e) => handleFileChange(e, 'after')}
                    className="sr-only"
                  />
                </label>
              </div>
            ) : (
              <label className={`block ${canUploadPhotos ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                <div className="aspect-video border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-accent transition-colors">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{canUploadPhotos ? 'Tap to take photo' : 'Locked until QR is verified'}</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  aria-label="After cleaning photo"
                  title="After cleaning photo"
                  disabled={!canUploadPhotos}
                  onChange={(e) => handleFileChange(e, 'after')}
                  className="sr-only"
                />
              </label>
            )}
          </div>

          {!canUploadPhotos && (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              QR verification is required before the upload controls can be used.
            </div>
          )}

          <Button onClick={handleSubmitForReview} disabled={!canSubmit || isSubmitting} className="w-full h-12 text-base">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit for Review
              </>
            )}
          </Button>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Workflow Issue Reporting</h2>
          <span className="text-xs text-muted-foreground">Saved in task history</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr,140px]">
          <textarea
            value={issueNote}
            onChange={(e) => {
              setIssueNote(e.target.value);
              if (reportedVia !== 'voice') setReportedVia('text');
            }}
            placeholder="Describe blocker, shortage, broken fixture, or safety issue"
            className="min-h-[90px] rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="space-y-2">
            <select
              value={issueSeverity}
              onChange={(e) => setIssueSeverity(e.target.value as IssueSeverity)}
              aria-label="Issue severity"
              title="Issue severity"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <Button type="button" variant="outline" className="w-full" onClick={handleVoiceCapture}>
              {isListening ? <AudioLines className="w-4 h-4 mr-2 animate-pulse" /> : <Mic className="w-4 h-4 mr-2" />}
              {isListening ? 'Listening...' : 'Voice Note'}
            </Button>
          </div>
        </div>

        <Button onClick={handleReportIssue} disabled={!issueNote.trim() || isReportingIssue} className="w-full sm:w-auto">
          {isReportingIssue ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Reporting...
            </>
          ) : (
            <>
              <TriangleAlert className="w-4 h-4 mr-2" />
              Report Issue to Admin
            </>
          )}
        </Button>

        {issueFeedback && (
          <div className="rounded-lg border border-status-warning/30 bg-status-warning/10 p-3 text-sm text-foreground">
            {issueFeedback}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Evidence and Reporting Log</h2>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs uppercase text-muted-foreground">QR Scan Time</p>
            <p className="mt-1 text-sm font-medium text-foreground">{formatDateTime(task.startedAt)}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs uppercase text-muted-foreground">Location</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {task.startedLocation?.latitude !== undefined && task.startedLocation?.longitude !== undefined
                ? `${task.startedLocation.latitude.toFixed(5)}, ${task.startedLocation.longitude.toFixed(5)}`
                : '--'}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs uppercase text-muted-foreground">Completion Time</p>
            <p className="mt-1 text-sm font-medium text-foreground">{formatDateTime(task.completedAt)}</p>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Photo Evidence Gallery</p>
          {task.photos.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Photos will appear here after submission.</p>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-3">
              {task.photos.map((photo, index) => (
                <a
                  key={`${photo.filename || index}`}
                  href={resolvePhotoUrl(photo)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-border bg-background overflow-hidden hover:border-accent transition-colors"
                >
                  {resolvePhotoUrl(photo) ? (
                    <img src={resolvePhotoUrl(photo)} alt={`Task evidence ${index + 1}`} className="h-28 w-full object-cover" />
                  ) : (
                    <div className="h-28 w-full flex items-center justify-center">
                      <Image className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <p className="px-2 py-1 text-[11px] text-muted-foreground truncate">{photo.filename || `photo-${index + 1}`}</p>
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Issue Report History</p>
          {task.issueReports.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No issue reports submitted for this task.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {task.issueReports
                .slice()
                .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
                .map((issue, index) => (
                  <div key={`${issue.createdAt}-${index}`} className="rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase text-status-warning">{issue.severity}</span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(issue.createdAt)} via {issue.reportedVia}</span>
                    </div>
                    <p className="text-sm text-foreground mt-2">{issue.note}</p>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Task Event Timeline</p>
          {evidenceEvents.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No timeline events yet.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {evidenceEvents.map((entry, index) => (
                <div key={`${entry.type}-${entry.createdAt}-${index}`} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">{entry.type.replace(/-/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
                  </div>
                  <p className="text-sm text-foreground mt-2">{entry.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CleanerTaskDetail;
