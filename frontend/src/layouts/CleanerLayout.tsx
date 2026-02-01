import { Outlet, useNavigate } from 'react-router-dom';
import { Droplets, LogOut, User } from 'lucide-react';

const CleanerLayout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile-optimized Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
            <Droplets className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">Hygia Sense</h1>
            <p className="text-xs text-muted-foreground">Cleaner Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content - Full width for mobile */}
      <main className="flex-1 p-4">
        <Outlet />
      </main>

      {/* Mobile Bottom Safe Area */}
      <div className="h-4 bg-background" />
    </div>
  );
};

export default CleanerLayout;
