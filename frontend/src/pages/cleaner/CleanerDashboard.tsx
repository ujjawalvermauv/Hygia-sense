import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, ChevronRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'under_review';

interface CleaningTask {
  id: string;
  washroom: string;
  floor: string;
  assignedTime: string;
  status: TaskStatus;
  priority: 'normal' | 'urgent';
}

const mockTasks: CleaningTask[] = [
  { id: '1', washroom: 'Washroom A', floor: 'Ground Floor', assignedTime: '09:00 AM', status: 'pending', priority: 'urgent' },
  { id: '2', washroom: 'Washroom B', floor: 'First Floor', assignedTime: '10:30 AM', status: 'in_progress', priority: 'normal' },
  { id: '3', washroom: 'Washroom C', floor: 'Second Floor', assignedTime: '12:00 PM', status: 'pending', priority: 'normal' },
  { id: '4', washroom: 'Washroom D', floor: 'Third Floor', assignedTime: '02:00 PM', status: 'completed', priority: 'normal' },
  { id: '5', washroom: 'Washroom A', floor: 'Ground Floor', assignedTime: '03:30 PM', status: 'under_review', priority: 'normal' },
];

const CleanerDashboard = () => {
  const navigate = useNavigate();
  const [tasks] = useState<CleaningTask[]>(mockTasks);

  const getStatusConfig = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return { 
          label: 'Pending', 
          color: 'bg-status-warning/10 text-status-warning',
          icon: AlertCircle,
          dotColor: 'bg-status-warning'
        };
      case 'in_progress':
        return { 
          label: 'In Progress', 
          color: 'bg-status-info/10 text-status-info',
          icon: Loader2,
          dotColor: 'bg-status-info'
        };
      case 'completed':
        return { 
          label: 'Completed', 
          color: 'bg-status-good/10 text-status-good',
          icon: CheckCircle2,
          dotColor: 'bg-status-good'
        };
      case 'under_review':
        return { 
          label: 'Under Review', 
          color: 'bg-accent/10 text-accent',
          icon: Clock,
          dotColor: 'bg-accent'
        };
    }
  };

  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const completedCount = tasks.filter(t => t.status === 'completed' || t.status === 'under_review').length;

  const handleTaskClick = (taskId: string) => {
    navigate(`/cleaner/task/${taskId}`);
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Good Morning, Rajesh</h1>
        <p className="text-sm text-muted-foreground mt-1">Here are your assigned tasks for today</p>
      </div>

      {/* Summary Cards - Horizontal scroll on mobile */}
      <div className="flex gap-3 overflow-x-auto pb-2 mb-6 -mx-4 px-4">
        <div className="flex-shrink-0 bg-status-warning/10 rounded-xl p-4 min-w-[110px]">
          <p className="text-2xl font-bold text-status-warning">{pendingCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Pending</p>
        </div>
        <div className="flex-shrink-0 bg-status-info/10 rounded-xl p-4 min-w-[110px]">
          <p className="text-2xl font-bold text-status-info">{inProgressCount}</p>
          <p className="text-xs text-muted-foreground mt-1">In Progress</p>
        </div>
        <div className="flex-shrink-0 bg-status-good/10 rounded-xl p-4 min-w-[110px]">
          <p className="text-2xl font-bold text-status-good">{completedCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Done Today</p>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Assigned Tasks
        </h2>

        {tasks.map((task) => {
          const statusConfig = getStatusConfig(task.status);
          const StatusIcon = statusConfig.icon;
          const isActionable = task.status === 'pending' || task.status === 'in_progress';

          return (
            <button
              key={task.id}
              onClick={() => handleTaskClick(task.id)}
              disabled={!isActionable}
              className={`w-full bg-card border border-border rounded-xl p-4 text-left transition-all ${
                isActionable 
                  ? 'hover:border-accent hover:shadow-card active:scale-[0.99]' 
                  : 'opacity-75'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {task.priority === 'urgent' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-status-danger text-status-danger-foreground">
                        Urgent
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

                  <div className="mt-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
                      {statusConfig.label}
                    </span>
                  </div>
                </div>

                {isActionable && (
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CleanerDashboard;
