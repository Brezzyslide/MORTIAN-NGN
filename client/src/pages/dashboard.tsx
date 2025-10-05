import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "wouter";
import Sidebar from "@/components/Sidebar";
import ProjectAnalytics from "@/components/ProjectAnalytics";
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
import ProjectCostingsView from "@/components/ProjectCostingsView";
import RevenueEntryForm from "@/components/RevenueEntryForm";
import { Button } from "@/components/ui/button";
// Sprint 4 Analytics Components
import BudgetProgressBar from "@/components/BudgetProgressBar";
import CostAllocationsTable from "@/components/CostAllocationsTable";
import SpendingCharts from "@/components/SpendingCharts";
import AnalyticsFilters from "@/components/AnalyticsFilters";
import AnalyticsSelector from "@/components/AnalyticsSelector";
import PendingApprovalsWidget from "@/components/PendingApprovalsWidget";
// Sprint 3 Budget Amendments & Change Orders Components
import BudgetAmendmentForm from "@/components/BudgetAmendmentForm";
import BudgetAmendmentsTable from "@/components/BudgetAmendmentsTable";
import ChangeOrderForm from "@/components/ChangeOrderForm";
import ChangeOrdersTable from "@/components/ChangeOrdersTable";
import BudgetHistoryView from "@/components/BudgetHistoryView";
import PendingAmendmentsWidget from "@/components/PendingAmendmentsWidget";
import ChangeOrdersSummaryWidget from "@/components/ChangeOrdersSummaryWidget";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  
  // Extract project ID from location if we're on a project-specific route
  const projectIdMatch = location.match(/^\/projects\/([^/]+)$/);
  const projectId = projectIdMatch ? projectIdMatch[1] : null;
  
  // Sprint 4 Analytics Filters State
  const [analyticsFilters, setAnalyticsFilters] = useState<{
    startDate?: Date;
    endDate?: Date;
    projectId?: string;
    categories?: string[];
  }>({});

  // Project Selection State for Analytics
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Parse projectId from URL query parameters
  useEffect(() => {
    // Extract base path from location (remove query params)
    const basePath = location.split('?')[0];
    
    if (basePath === '/analytics') {
      const params = new URLSearchParams(window.location.search);
      const projectIdFromUrl = params.get('projectId');
      setSelectedProjectId(projectIdFromUrl);
    }
  }, [location]);

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
      '/permissions': 'Permissions - ProjectFund',
      '/budget-amendments': 'Budget Amendments - ProjectFund',
      '/change-orders': 'Change Orders - ProjectFund',
      '/budget-history': 'Budget History - ProjectFund',
      '/project-costings': 'Project Costings - ProjectFund'
    };
    
    // Handle project-specific page title
    if (projectId) {
      document.title = 'Project Analytics - ProjectFund';
    } else {
      document.title = titles[location as keyof typeof titles] || 'ProjectFund';
    }
  }, [location, projectId]);

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
              {projectId && 'Project Analytics'}
              {!projectId && location === '/' && 'Dashboard Overview'}
              {!projectId && location === '/projects' && 'Projects'}
              {location === '/allocations' && 'Fund Allocation'}
              {location === '/cost-entry' && 'Cost Entry'}
              {location === '/revenue-entry' && 'Revenue Entry'}
              {location === '/transactions' && 'Transactions'}
              {location === '/analytics' && 'Analytics'}
              {location === '/audit' && 'Audit Log'}
              {location === '/users' && 'Team Members'}
              {location === '/companies' && 'Company Management'}
              {location === '/permissions' && 'Permissions'}
              {location === '/budget-amendments' && 'Budget Amendments'}
              {location === '/change-orders' && 'Change Orders'}
              {location === '/budget-history' && 'Budget History'}
              {location === '/project-costings' && 'Project Costings'}
            </h2>
            <p className="text-muted-foreground mt-1">
              {projectId && 'Detailed project metrics, budget utilization, and financial performance'}
              {!projectId && location === '/' && 'Manage your projects and fund allocations'}
              {!projectId && location === '/projects' && 'Create and manage project budgets'}
              {location === '/allocations' && 'Allocate funds to projects and team members'}
              {location === '/cost-entry' && 'Enter construction costs with labour and material tracking'}
              {location === '/revenue-entry' && 'Record building sales and revenue'}
              {location === '/transactions' && 'Track expenses and revenue'}
              {location === '/analytics' && 'View detailed analytics and reports'}
              {location === '/audit' && 'Review system activity and changes'}
              {location === '/users' && 'Manage team members and roles'}
              {location === '/companies' && 'Manage tenant companies and subscriptions'}
              {location === '/permissions' && 'Configure user permissions and access'}
              {location === '/budget-amendments' && 'Propose and manage budget amendments'}
              {location === '/change-orders' && 'Create and track project scope changes'}
              {location === '/budget-history' && 'View chronological budget change timeline'}
            </p>
          </div>
          {!projectId && (
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
          )}
        </div>
        

        {/* Project Analytics - Individual Project View */}
        {projectId && (
          <ProjectAnalytics projectId={projectId} />
        )}

        {/* Dashboard Overview */}
        {location === '/' && (
          <>
            <StatsCards />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2">
                <ProjectsList onEditProject={setEditingProject} />
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
              <PendingAmendmentsWidget onViewAll={() => setLocation("/budget-amendments")} />
              <ChangeOrdersSummaryWidget onViewAll={() => setLocation("/change-orders")} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <TransactionsList />
            </div>
            <AnalyticsDashboard selectedProjectId={null} />
          </>
        )}


        {/* Projects Page */}
        {location === '/projects' && (
          <>
            <StatsCards />
            <div className="mb-8">
              <ProjectsList onEditProject={setEditingProject} />
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

        {/* Revenue Entry Page */}
        {location === '/revenue-entry' && (
          <div className="mb-8">
            <RevenueEntryForm />
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

        {/* Analytics Page - Sprint 4 Enhanced with Project Selection */}
        {location === '/analytics' && (
          <>
            {/* Project Selection Interface */}
            <AnalyticsSelector 
              selectedProjectId={selectedProjectId}
              onProjectChange={setSelectedProjectId}
            />

            {/* Analytics Filters */}
            <div className="mb-8">
              <AnalyticsFilters 
                filters={{
                  ...analyticsFilters,
                  projectId: selectedProjectId || undefined
                }}
                onFiltersChange={(filters) => {
                  // Don't let filters override our project selection
                  const { projectId, ...otherFilters } = filters;
                  setAnalyticsFilters(otherFilters);
                }}
              />
            </div>

            {/* Key Metrics Overview */}
            <StatsCards projectId={selectedProjectId} />

            {/* Budget Progress and Spending Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
              <div className="xl:col-span-2">
                <BudgetProgressBar projectId={selectedProjectId} />
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
                          {selectedProjectId 
                            ? "Real-time project analytics with automatic updates every 30 seconds"
                            : "Real-time organizational analytics with automatic updates every 30 seconds"
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Spending Analysis Charts */}
            <div className="mb-8">
              <SpendingCharts 
                filters={{
                  ...analyticsFilters,
                  projectId: selectedProjectId || undefined
                }} 
              />
            </div>

            {/* Cost Allocations Ledger Table */}
            <div className="mb-8">
              <CostAllocationsTable 
                filters={{
                  ...analyticsFilters,
                  projectId: selectedProjectId || undefined
                }} 
              />
            </div>

            {/* Legacy Analytics Components (kept for backward compatibility) */}
            <div className="space-y-8">
              <div className="border-t border-border pt-8">
                <div className="flex items-center space-x-2 mb-6">
                  <i className="fas fa-history text-muted-foreground"></i>
                  <h3 className="text-lg font-semibold text-foreground">Historical Analytics</h3>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">Legacy View</span>
                </div>
                <AnalyticsDashboard selectedProjectId={selectedProjectId} />
              </div>
              
              <div className="mb-8">
                <AdvancedAnalytics projectId={selectedProjectId} />
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

        {/* Budget Amendments Page */}
        {location === '/budget-amendments' && (
          <div className="space-y-8">
            <BudgetAmendmentForm />
            <BudgetAmendmentsTable />
          </div>
        )}

        {/* Change Orders Page */}
        {location === '/change-orders' && (
          <div className="space-y-8">
            <ChangeOrderForm />
            <ChangeOrdersTable />
          </div>
        )}

        {/* Budget History Page */}
        {location === '/budget-history' && (
          <BudgetHistoryView />
        )}

        {/* Project Costings Page */}
        {location === '/project-costings' && (
          <ProjectCostingsView />
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
        open={showNewProjectDialog || !!editingProject} 
        onOpenChange={(open) => {
          setShowNewProjectDialog(open);
          if (!open) setEditingProject(null);
        }}
        project={editingProject}
      />
    </div>
  );
}
