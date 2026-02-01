import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Activity, 
  ClipboardCheck, 
  Users, 
  MessageSquare, 
  FileText,
  Droplets,
  LogOut,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/dashboard/sensors', icon: Activity, label: 'Live Sensors' },
  { to: '/dashboard/tasks', icon: ClipboardCheck, label: 'Task Assignment' },
  { to: '/dashboard/cleaners', icon: Users, label: 'Cleaner Management' },
  { to: '/dashboard/feedback', icon: MessageSquare, label: 'Feedback' },
  { to: '/dashboard/reports', icon: FileText, label: 'Reports' },
];

const AdminLayout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-60 bg-sidebar flex flex-col border-r border-sidebar-border">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Droplets className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <span className="font-semibold text-sidebar-foreground">Hygia Sense</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/dashboard'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                        : 'text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-sidebar-border">
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full justify-start text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navbar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div>
            <h1 className="text-sm font-medium text-foreground">Administration Panel</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">Admin User</p>
                <p className="text-xs text-muted-foreground">admin@hygiasense.com</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
