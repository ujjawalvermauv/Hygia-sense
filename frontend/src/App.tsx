import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import AdminLayout from "./layouts/AdminLayout";
import CleanerLayout from "./layouts/CleanerLayout";
import DashboardOverview from "./pages/dashboard/DashboardOverview";
import LiveSensors from "./pages/dashboard/LiveSensors";
import TaskAssignment from "./pages/dashboard/TaskAssignment";
import CleanerManagement from "./pages/dashboard/CleanerManagement";
import Feedback from "./pages/dashboard/Feedback";
import Reports from "./pages/dashboard/Reports";
import CleanerDashboard from "./pages/cleaner/CleanerDashboard";
import CleanerTaskDetail from "./pages/cleaner/CleanerTaskDetail";
import TVDisplay from "./pages/TVDisplay";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Auth */}
          <Route path="/" element={<Login />} />
          
          {/* Admin Dashboard */}
          <Route path="/dashboard" element={<AdminLayout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="sensors" element={<LiveSensors />} />
            <Route path="tasks" element={<TaskAssignment />} />
            <Route path="cleaners" element={<CleanerManagement />} />
            <Route path="feedback" element={<Feedback />} />
            <Route path="reports" element={<Reports />} />
          </Route>
          
          {/* Cleaner Portal */}
          <Route path="/cleaner" element={<CleanerLayout />}>
            <Route index element={<CleanerDashboard />} />
            <Route path="task/:taskId" element={<CleanerTaskDetail />} />
          </Route>
          
          {/* TV Display Mode */}
          <Route path="/display" element={<TVDisplay />} />
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
