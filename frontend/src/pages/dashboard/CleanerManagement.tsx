import { useState } from 'react';
import { Edit, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/dashboard/StatusBadge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Cleaner {
  id: number;
  name: string;
  phone: string;
  shift: string;
  tasksCompleted: number;
  efficiency: number;
  status: 'active' | 'inactive';
}

const initialCleaners: Cleaner[] = [
  { id: 1, name: 'Rajesh Kumar', phone: '+91 98765 43210', shift: 'Morning (6 AM - 2 PM)', tasksCompleted: 45, efficiency: 92, status: 'active' },
  { id: 2, name: 'Priya Sharma', phone: '+91 98765 43211', shift: 'Afternoon (2 PM - 10 PM)', tasksCompleted: 38, efficiency: 88, status: 'active' },
  { id: 3, name: 'Amit Patel', phone: '+91 98765 43212', shift: 'Morning (6 AM - 2 PM)', tasksCompleted: 52, efficiency: 95, status: 'active' },
  { id: 4, name: 'Sunita Devi', phone: '+91 98765 43213', shift: 'Night (10 PM - 6 AM)', tasksCompleted: 28, efficiency: 85, status: 'inactive' },
  { id: 5, name: 'Mohammad Ali', phone: '+91 98765 43214', shift: 'Afternoon (2 PM - 10 PM)', tasksCompleted: 41, efficiency: 90, status: 'active' },
];

const CleanerManagement = () => {
  const [cleaners, setCleaners] = useState<Cleaner[]>(initialCleaners);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCleaner, setNewCleaner] = useState({ name: '', phone: '', shift: '' });

  const handleAddCleaner = () => {
    if (newCleaner.name && newCleaner.phone && newCleaner.shift) {
      const cleaner: Cleaner = {
        id: cleaners.length + 1,
        name: newCleaner.name,
        phone: newCleaner.phone,
        shift: newCleaner.shift,
        tasksCompleted: 0,
        efficiency: 0,
        status: 'active',
      };
      setCleaners([...cleaners, cleaner]);
      setNewCleaner({ name: '', phone: '', shift: '' });
      setIsAddDialogOpen(false);
    }
  };

  const handleDeleteCleaner = (id: number) => {
    setCleaners(cleaners.filter((c) => c.id !== id));
  };

  const handleToggleStatus = (id: number) => {
    setCleaners(
      cleaners.map((c) =>
        c.id === id ? { ...c, status: c.status === 'active' ? 'inactive' : 'active' } : c
      )
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-header mb-0">Cleaner Management</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Cleaner
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Cleaner</DialogTitle>
              <DialogDescription>Enter the details of the new cleaner.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={newCleaner.name}
                  onChange={(e) => setNewCleaner({ ...newCleaner, name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={newCleaner.phone}
                  onChange={(e) => setNewCleaner({ ...newCleaner, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shift">Shift Time</Label>
                <select
                  id="shift"
                  value={newCleaner.shift}
                  onChange={(e) => setNewCleaner({ ...newCleaner, shift: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm"
                >
                  <option value="">Select shift</option>
                  <option value="Morning (6 AM - 2 PM)">Morning (6 AM - 2 PM)</option>
                  <option value="Afternoon (2 PM - 10 PM)">Afternoon (2 PM - 10 PM)</option>
                  <option value="Night (10 PM - 6 AM)">Night (10 PM - 6 AM)</option>
                </select>
              </div>
              <Button onClick={handleAddCleaner} className="w-full">
                Add Cleaner
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="metric-card">
          <p className="text-sm text-muted-foreground">Total Cleaners</p>
          <p className="text-2xl font-semibold mt-1">{cleaners.length}</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-semibold mt-1 text-status-good">
            {cleaners.filter((c) => c.status === 'active').length}
          </p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-muted-foreground">Inactive</p>
          <p className="text-2xl font-semibold mt-1 text-status-danger">
            {cleaners.filter((c) => c.status === 'inactive').length}
          </p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-muted-foreground">Avg Efficiency</p>
          <p className="text-2xl font-semibold mt-1">
            {Math.round(cleaners.reduce((sum, c) => sum + c.efficiency, 0) / cleaners.length)}%
          </p>
        </div>
      </div>

      {/* Cleaners Table */}
      <div className="metric-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 pr-4 text-left">Cleaner Name</th>
                <th className="pb-3 pr-4 text-left">Phone</th>
                <th className="pb-3 pr-4 text-left">Shift Time</th>
                <th className="pb-3 pr-4 text-left">Tasks Completed</th>
                <th className="pb-3 pr-4 text-left">Efficiency</th>
                <th className="pb-3 pr-4 text-left">Status</th>
                <th className="pb-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cleaners.map((cleaner) => (
                <tr key={cleaner.id} className="table-row-hover border-b border-border last:border-b-0">
                  <td className="py-4 pr-4">
                    <p className="font-medium text-sm">{cleaner.name}</p>
                  </td>
                  <td className="py-4 pr-4">
                    <p className="text-sm text-muted-foreground">{cleaner.phone}</p>
                  </td>
                  <td className="py-4 pr-4">
                    <p className="text-sm">{cleaner.shift}</p>
                  </td>
                  <td className="py-4 pr-4">
                    <p className="text-sm font-medium">{cleaner.tasksCompleted}</p>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            cleaner.efficiency >= 90
                              ? 'bg-status-good'
                              : cleaner.efficiency >= 80
                              ? 'bg-status-warning'
                              : 'bg-status-danger'
                          }`}
                          style={{ width: `${cleaner.efficiency}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{cleaner.efficiency}%</span>
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <StatusBadge
                      status={cleaner.status === 'active' ? 'good' : 'danger'}
                      label={cleaner.status === 'active' ? 'Active' : 'Inactive'}
                    />
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(cleaner.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCleaner(cleaner.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CleanerManagement;
