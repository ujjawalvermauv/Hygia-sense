import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Camera, Upload, CheckCircle2, Send, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTaskById, uploadPhotos } from '@/services/taskService';

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'under_review';

interface TaskDetail {
  id: string;
  washroom: string;
  floor: string;
  building: string;
  assignedTime: string;
  status: TaskStatus;
  priority: 'normal' | 'urgent';
  notes: string;
}

const mapBackendStatusToCleanerStatus = (status?: string): TaskStatus => {
  if (status === 'assigned') return 'pending';
  if (status === 'in-progress') return 'in_progress';
  if (status === 'pending-approval') return 'under_review';
  return 'completed';
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

  useEffect(() => {
    const fetchTask = async () => {
      if (!taskId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await getTaskById(taskId);
        const mappedTask: TaskDetail = {
          id: data._id,
          washroom: data.toilet?.name || 'Unknown washroom',
          floor: data.toilet?.location || 'Unknown floor',
          building: 'Main Building',
          assignedTime: new Date(data.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          status: mapBackendStatusToCleanerStatus(data.status),
          priority: data.toilet?.cleanlinessStatus === 'red' ? 'urgent' : 'normal',
          notes: data.completionNotes || 'No notes provided.',
        };

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
      if (beforePreviewUrl) {
        URL.revokeObjectURL(beforePreviewUrl);
      }
      if (afterPreviewUrl) {
        URL.revokeObjectURL(afterPreviewUrl);
      }
    };
  }, [beforePreviewUrl, afterPreviewUrl]);

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <p className="text-muted-foreground">Loading task...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <p className="text-muted-foreground">Task not found</p>
        <Button variant="outline" onClick={() => navigate('/cleaner')} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (file) {
      const fileSizeLimit = 5 * 1024 * 1024;
      if (file.size > fileSizeLimit) {
        alert('File is too large. Please upload an image under 5MB.');
        return;
      }

      if (type === 'before') {
        setBeforePhoto(file);
        if (beforePreviewUrl) {
          URL.revokeObjectURL(beforePreviewUrl);
        }
        setBeforePreviewUrl(URL.createObjectURL(file));
        setTaskStatus('in_progress');
      } else {
        setAfterPhoto(file);
        if (afterPreviewUrl) {
          URL.revokeObjectURL(afterPreviewUrl);
        }
        setAfterPreviewUrl(URL.createObjectURL(file));
      }
    }
  };

  const handleStartTask = () => {
    setTaskStatus('in_progress');
  };

  const handleSubmitForReview = async () => {
    if (!beforePhoto || !afterPhoto || !taskId) return;

    try {
      setIsSubmitting(true);
      await uploadPhotos(taskId, [beforePhoto, afterPhoto]);
      setTaskStatus('under_review');
    } catch (error) {
      console.error('Failed to upload photos:', error);
      alert(error instanceof Error ? error.message : 'Failed to submit photos. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = beforePhoto && afterPhoto && taskStatus === 'in_progress';

  return (
    <div className="max-w-lg mx-auto pb-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/cleaner')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Back to Tasks</span>
      </button>

      {/* Task Header */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            {task.priority === 'urgent' && (
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-status-danger text-status-danger-foreground mb-2">
                Urgent
              </span>
            )}
            <h1 className="text-lg font-semibold text-foreground">{task.washroom}</h1>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
            taskStatus === 'pending' ? 'bg-status-warning/10 text-status-warning' :
            taskStatus === 'in_progress' ? 'bg-status-info/10 text-status-info' :
            taskStatus === 'under_review' ? 'bg-accent/10 text-accent' :
            'bg-status-good/10 text-status-good'
          }`}>
            {taskStatus === 'pending' ? 'Pending' :
             taskStatus === 'in_progress' ? 'In Progress' :
             taskStatus === 'under_review' ? 'Under Review' : 'Completed'}
          </span>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{task.floor}, {task.building}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Assigned: {task.assignedTime}</span>
          </div>
        </div>

        {task.notes && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Notes</p>
            <p className="text-sm text-foreground">{task.notes}</p>
          </div>
        )}
      </div>

      {/* Task Submitted State */}
      {taskStatus === 'under_review' && (
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-accent mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-foreground mb-1">Task Submitted</h2>
          <p className="text-sm text-muted-foreground">
            Your cleaning photos have been submitted for admin review.
          </p>
          <Button 
            variant="outline" 
            onClick={() => navigate('/cleaner')}
            className="mt-4"
          >
            Back to Dashboard
          </Button>
        </div>
      )}

      {/* Photo Upload Section */}
      {taskStatus !== 'under_review' && (
        <div className="space-y-4">
          {/* Start Task Button */}
          {taskStatus === 'pending' && (
            <Button 
              onClick={handleStartTask}
              className="w-full h-12 text-base"
            >
              Start Cleaning Task
            </Button>
          )}

          {/* Before Photo */}
          {taskStatus === 'in_progress' && (
            <>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Camera className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-medium text-foreground">Before Cleaning Photo</h3>
                  {beforePhoto && <CheckCircle2 className="w-4 h-4 text-status-good ml-auto" />}
                </div>

                {beforePhoto ? (
                  <div className="relative">
                    <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                      {beforePreviewUrl ? (
                        <img
                          src={beforePreviewUrl}
                          alt="Before cleaning preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Image className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 truncate">{beforePhoto.name}</p>
                    <label className="absolute inset-0 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        required
                        onChange={(e) => handleFileChange(e, 'before')}
                        className="sr-only"
                      />
                    </label>
                  </div>
                ) : (
                  <label className="block">
                    <div className="aspect-video border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-accent transition-colors">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Tap to take photo</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      required
                      onChange={(e) => handleFileChange(e, 'before')}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>

              {/* After Photo */}
              <div className="bg-card border border-border rounded-xl p-4">
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
                        <img
                          src={afterPreviewUrl}
                          alt="After cleaning preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Image className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 truncate">{afterPhoto.name}</p>
                    <label className="absolute inset-0 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        required
                        onChange={(e) => handleFileChange(e, 'after')}
                        className="sr-only"
                      />
                    </label>
                  </div>
                ) : (
                  <label className="block">
                    <div className="aspect-video border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-accent transition-colors">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Tap to take photo</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      required
                      onChange={(e) => handleFileChange(e, 'after')}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>

              {/* Submit Button */}
              <Button 
                onClick={handleSubmitForReview}
                disabled={!canSubmit || isSubmitting}
                className="w-full h-12 text-base"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit for Review
                  </>
                )}
              </Button>

              {!canSubmit && taskStatus === 'in_progress' && (
                <p className="text-xs text-center text-muted-foreground">
                  Upload both before and after photos to submit
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CleanerTaskDetail;
