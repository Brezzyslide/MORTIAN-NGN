import { useEffect, useState } from "react";
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
import NewProjectDialog from "@/components/NewProjectDialog";
import UserManagement from "@/components/UserManagement";
import { CompanyManagement } from "@/components/CompanyManagement";
import CostEntryForm from "@/components/CostEntryForm";
import { Button } from "@/components/ui/button";
// Sprint 4 Analytics Components
import BudgetProgressBar from "@/components/BudgetProgressBar";
import CostAllocationsTable from "@/components/CostAllocationsTable";
import SpendingCharts from "@/components/SpendingCharts";
import AnalyticsFilters from "@/components/AnalyticsFilters";
import PendingApprovalsWidget from "@/components/PendingApprovalsWidget";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  
  // Sprint 4 Analytics Filters State
  const [analyticsFilters, setAnalyticsFilters] = useState<{
    startDate?: Date;
    endDate?: Date;
    projectId?: string;
    categories?: string[];
  }>({});

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
      '/cost-entry': 'Cost Entry - ProjectFund',
      '/transactions': 'Transactions - ProjectFund',
      '/analytics': 'Analytics - ProjectFund',
      '/audit': 'Audit Log - ProjectFund',
      '/users': 'Team Members - ProjectFund',
      '/companies': 'Company Management - ProjectFund',
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
              {location === '/cost-entry' && 'Cost Entry'}
              {location === '/transactions' && 'Transactions'}
              {location === '/analytics' && 'Analytics'}
              {location === '/audit' && 'Audit Log'}
              {location === '/users' && 'Team Members'}
              {location === '/companies' && 'Company Management'}
              {location === '/permissions' && 'Permissions'}
            </h2>
            <p className="text-muted-foreground mt-1">
              {location === '/' && 'Manage your projects and fund allocations'}
              {location === '/projects' && 'Create and manage project budgets'}
              {location === '/allocations' && 'Allocate funds to projects and team members'}
              {location === '/cost-entry' && 'Enter construction costs with labour and material tracking'}
              {location === '/transactions' && 'Track expenses and revenue'}
              {location === '/analytics' && 'View detailed analytics and reports'}
              {location === '/audit' && 'Review system activity and changes'}
              {location === '/users' && 'Manage team members and roles'}
              {location === '/companies' && 'Manage tenant companies and subscriptions'}
              {location === '/permissions' && 'Configure user permissions and access'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => setShowNewProjectDialog(true)}
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2">
                <FundAllocationPanel />
              </div>
              <div>
                <PendingApprovalsWidget />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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

        {/* Cost Entry Page */}
        {location === '/cost-entry' && (
          <div className="mb-8">
            <CostEntryForm />
          </div>
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

        {/* Analytics Page - Sprint 4 Enhanced */}
        {location === '/analytics' && (
          <>
            {/* Analytics Filters */}
            <div className="mb-8">
              <AnalyticsFilters 
                filters={analyticsFilters}
                onFiltersChange={setAnalyticsFilters}
              />
            </div>

            {/* Key Metrics Overview */}
            <StatsCards />

            {/* Budget Progress and Spending Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
              <div className="xl:col-span-2">
                <BudgetProgressBar />
              </div>
              <div>
                <div className="space-y-6">
                  {/* Quick Stats Card */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <i className="fas fa-chart-line text-blue-600 dark:text-blue-400"></i>
                      </div>
                      <div>
                        <h3 className="font-semibold text-blue-900 dark:text-blue-100">Live Analytics</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Real-time budget tracking with automatic updates every 30 seconds
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Spending Analysis Charts */}
            <div className="mb-8">
              <SpendingCharts filters={analyticsFilters} />
            </div>

            {/* Cost Allocations Ledger Table */}
            <div className="mb-8">
              <CostAllocationsTable filters={analyticsFilters} />
            </div>

            {/* Legacy Analytics Components (kept for backward compatibility) */}
            <div className="space-y-8">
              <div className="border-t border-border pt-8">
                <div className="flex items-center space-x-2 mb-6">
                  <i className="fas fa-history text-muted-foreground"></i>
                  <h3 className="text-lg font-semibold text-foreground">Historical Analytics</h3>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">Legacy View</span>
                </div>
                <AnalyticsDashboard />
              </div>
              
              <div className="mb-8">
                <AdvancedAnalytics />
              </div>
            </div>
          </>
        )}

        {/* Audit Log Page */}
        {location === '/audit' && (
          <AuditLog />
        )}

        {/* Team Members Page */}
        {location === '/users' && (
          <UserManagement />
        )}

        {/* Company Management Page */}
        {location === '/companies' && (
          <CompanyManagement />
        )}

        {/* Permissions Page */}
        {location === '/permissions' && (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold mb-4">Permissions Management</h3>
            <p className="text-muted-foreground">User permissions configuration coming soon.</p>
          </div>
        )}
      </div>
      
      <NewProjectDialog 
        open={showNewProjectDialog} 
        onOpenChange={setShowNewProjectDialog} 
      />
    </div>
  );
}
