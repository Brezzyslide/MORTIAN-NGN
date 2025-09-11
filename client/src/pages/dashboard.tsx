import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "wouter";
import Sidebar from "@/components/Sidebar";
import StatsCards from "@/components/StatsCards";
import ProjectsList from "@/components/ProjectsList";
import BudgetChart from "@/components/BudgetChart";
import FundAllocationPanel from "@/components/FundAllocationPanel";
import TransactionsList from "@/components/TransactionsList";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import AdvancedAnalytics from "@/components/AdvancedAnalytics";
import AuditLog from "@/components/AuditLog";
import CsvImportExport from "@/components/CsvImportExport";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

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
    const titles = {
      '/': 'Dashboard - ProjectFund',
      '/projects': 'Projects - ProjectFund', 
      '/allocations': 'Fund Allocation - ProjectFund',
      '/transactions': 'Transactions - ProjectFund',
      '/analytics': 'Analytics - ProjectFund',
      '/audit': 'Audit Log - ProjectFund',
      '/users': 'Team Members - ProjectFund',
      '/permissions': 'Permissions - ProjectFund'
    };
    document.title = titles[location as keyof typeof titles] || 'ProjectFund';
  }, [location]);

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
            <h2 className="text-2xl font-semibold text-foreground">
              {location === '/' && 'Dashboard Overview'}
              {location === '/projects' && 'Projects'}
              {location === '/allocations' && 'Fund Allocation'}
              {location === '/transactions' && 'Transactions'}
              {location === '/analytics' && 'Analytics'}
              {location === '/audit' && 'Audit Log'}
              {location === '/users' && 'Team Members'}
              {location === '/permissions' && 'Permissions'}
            </h2>
            <p className="text-muted-foreground mt-1">
              {location === '/' && 'Manage your projects and fund allocations'}
              {location === '/projects' && 'Create and manage project budgets'}
              {location === '/allocations' && 'Allocate funds to projects and team members'}
              {location === '/transactions' && 'Track expenses and revenue'}
              {location === '/analytics' && 'View detailed analytics and reports'}
              {location === '/audit' && 'Review system activity and changes'}
              {location === '/users' && 'Manage team members and roles'}
              {location === '/permissions' && 'Configure user permissions and access'}
            </p>
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
        
        {/* Debug info */}
        <div className="p-4 bg-blue-100 rounded mb-4">
          <p>Current location (raw): {String(location)}</p>
          <p>Location type: {typeof location}</p>
          <p>Is root?: {String(location === '/')}</p>
        </div>

        {/* Dashboard Overview */}
        {location === '/' && (
          <>
            <StatsCards />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2">
                <ProjectsList />
              </div>
              <div>
                <BudgetChart />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <FundAllocationPanel />
              <TransactionsList />
            </div>
            <AnalyticsDashboard />
          </>
        )}


        {/* Projects Page */}
        {location === '/projects' && (
          <>
            <StatsCards />
            <div className="mb-8">
              <ProjectsList />
            </div>
            <BudgetChart />
          </>
        )}

        {/* Fund Allocation Page */}
        {location === '/allocations' && (
          <>
            <div className="mb-8">
              <FundAllocationPanel />
            </div>
            <div className="mb-8">
              <CsvImportExport />
            </div>
          </>
        )}

        {/* Transactions Page */}
        {location === '/transactions' && (
          <>
            <div className="mb-8">
              <TransactionsList />
            </div>
            <div className="mb-8">
              <CsvImportExport />
            </div>
          </>
        )}

        {/* Analytics Page */}
        {location === '/analytics' && (
          <>
            <StatsCards />
            <AnalyticsDashboard />
            <div className="mb-8">
              <AdvancedAnalytics />
            </div>
          </>
        )}

        {/* Audit Log Page */}
        {location === '/audit' && (
          <AuditLog />
        )}

        {/* Team Members Page */}
        {location === '/users' && (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold mb-4">Team Members Management</h3>
            <p className="text-muted-foreground">Team member management functionality coming soon.</p>
          </div>
        )}

        {/* Permissions Page */}
        {location === '/permissions' && (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold mb-4">Permissions Management</h3>
            <p className="text-muted-foreground">User permissions configuration coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
