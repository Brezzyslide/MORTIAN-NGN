import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/Sidebar";
import StatsCards from "@/components/StatsCards";
import ProjectsList from "@/components/ProjectsList";
import BudgetChart from "@/components/BudgetChart";
import FundAllocationPanel from "@/components/FundAllocationPanel";
import TransactionsList from "@/components/TransactionsList";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import AdvancedAnalytics from "@/components/AdvancedAnalytics";
import AuditLog from "@/components/AuditLog";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  useEffect(() => {
    document.title = "Dashboard - ProjectFund";
  }, []);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 ml-64 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Dashboard Overview</h2>
            <p className="text-muted-foreground mt-1">Manage your projects and fund allocations</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-new-project"
            >
              <i className="fas fa-plus mr-2"></i>New Project
            </Button>
            <Button
              variant="outline"
              size="icon"
              data-testid="button-notifications"
            >
              <i className="fas fa-bell text-muted-foreground"></i>
            </Button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <StatsCards />
        
        {/* Projects and Budget Chart Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <ProjectsList />
          </div>
          <div>
            <BudgetChart />
          </div>
        </div>
        
        {/* Fund Allocation and Transactions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <FundAllocationPanel />
          <TransactionsList />
        </div>
        
        {/* Analytics Dashboard */}
        <AnalyticsDashboard />
        
        {/* Advanced Analytics */}
        <div className="mb-8">
          <AdvancedAnalytics />
        </div>
        
        {/* Audit Log */}
        <AuditLog />
      </div>
    </div>
  );
}
