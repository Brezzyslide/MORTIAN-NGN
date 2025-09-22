import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useLocation } from "wouter";
import { ArrowLeft, Wallet, TrendingUp, PieChart, Activity, Shield } from "lucide-react";

interface ProjectAnalyticsData {
  project: {
    id: string;
    title: string;
    description: string;
    budget: number;
    consumedAmount: number;
    revenue: number;
    status: string;
    startDate: string;
    endDate: string;
  };
  totalSpent: number;
  netProfit: number;
  budgetUtilization: number;
  costBreakdown: {
    labour: number;
    materials: number;
    other: number;
  };
  remainingBudget: number;
}

interface ProjectAnalyticsProps {
  projectId: string;
}

export default function ProjectAnalytics({ projectId }: ProjectAnalyticsProps) {
  const { toast } = useToast();
  const { permissions, normalizedRole, isAdmin, isTeamLeader } = usePermissions();
  const [, setLocation] = useLocation();
  
  const { data: analytics, isLoading, error } = useQuery<ProjectAnalyticsData>({
    queryKey: [`/api/projects/${projectId}/analytics`],
    retry: false,
    enabled: Boolean(projectId),
  });

  // Handle authentication errors
  useEffect(() => {
    if (error && isUnauthorizedError(error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-muted rounded animate-pulse"></div>
            <div>
              <div className="h-8 bg-muted rounded w-64 mb-2"></div>
              <div className="h-4 bg-muted rounded w-96"></div>
            </div>
          </div>
        </div>

        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card p-6 rounded-lg card-shadow border border-border animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-muted rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !isUnauthorizedError(error)) {
    const isAccessDenied = error instanceof Error && error.message.includes('403');
    
    return (
      <div className="text-center py-16">
        <div className="mb-6">
          {isAccessDenied ? (
            <Shield className="w-16 h-16 mx-auto text-orange-500 mb-4" />
          ) : (
            <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
          )}
          <h3 className="text-xl font-semibold mb-2">
            {isAccessDenied ? 'Access Denied' : 'Failed to Load Project Analytics'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {isAccessDenied 
              ? `You don't have permission to view analytics for this project. ${
                  isTeamLeader 
                    ? 'Only team leaders assigned to this project can view its analytics.' 
                    : isAdmin 
                      ? 'This shouldn\'t happen for admins. Please contact support.'
                      : 'Only users involved with this project can view its analytics.'
                }`
              : error instanceof Error ? error.message : 'An error occurred while fetching project analytics'
            }
          </p>
          {isAccessDenied && (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg max-w-md mx-auto">
              <p className="font-medium mb-1">Access is granted to:</p>
              <ul className="text-left space-y-1">
                <li>• Project managers</li>
                <li>• Team leaders assigned to the project</li>
                <li>• Users with transactions or cost allocations</li>
                <li>• Administrators</li>
              </ul>
            </div>
          )}
        </div>
        <Button 
          onClick={() => setLocation("/projects")}
          variant="outline"
          data-testid="button-back-to-projects-error"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Projects
        </Button>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-16">
        <div className="mb-6">
          <i className="fas fa-chart-bar text-4xl text-muted-foreground mb-4"></i>
          <h3 className="text-xl font-semibold mb-2">No Analytics Available</h3>
          <p className="text-muted-foreground">Analytics data is not available for this project</p>
        </div>
        <Button 
          onClick={() => setLocation("/projects")}
          variant="outline"
          data-testid="button-back-to-projects-no-data"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Projects
        </Button>
      </div>
    );
  }

  const { project } = analytics;
  const budgetUtilizationPercent = (analytics.budgetUtilization * 100);
  const progressColor = budgetUtilizationPercent >= 90 ? "bg-red-500" : budgetUtilizationPercent >= 75 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            onClick={() => setLocation("/projects")}
            variant="ghost"
            size="sm"
            className="p-2"
            data-testid="button-back-to-projects"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-semibold text-foreground" data-testid="text-project-title">
              {project.title}
            </h2>
            <p className="text-muted-foreground mt-1" data-testid="text-project-description">
              {project.description || "No description available"} • {formatDate(project.startDate)} - {formatDate(project.endDate)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
            project.status === 'active' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
          }`} data-testid="badge-project-status">
            {project.status}
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-shadow border border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Total Budget</p>
                <p className="text-2xl font-semibold text-foreground mt-1" data-testid="text-project-budget">
                  {formatCurrency(project.budget)}
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-primary font-medium">Allocated</span>
              <span className="text-muted-foreground ml-2">project budget</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-shadow border border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Total Spent</p>
                <p className="text-2xl font-semibold text-foreground mt-1" data-testid="text-project-spent">
                  {formatCurrency(analytics.totalSpent)}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-orange-600 font-medium">
                {budgetUtilizationPercent.toFixed(1)}%
              </span>
              <span className="text-muted-foreground ml-2">of budget used</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-shadow border border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Net Profit</p>
                <p className={`text-2xl font-semibold mt-1 ${analytics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-project-profit">
                  {formatCurrency(analytics.netProfit)}
                </p>
              </div>
              <div className={`p-3 rounded-full ${analytics.netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <Activity className={`w-5 h-5 ${analytics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className={`font-medium ${analytics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Revenue - Costs
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-shadow border border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Budget Utilization</p>
                <p className="text-2xl font-semibold text-foreground mt-1" data-testid="text-project-utilization">
                  {budgetUtilizationPercent.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <PieChart className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <Progress 
                value={budgetUtilizationPercent} 
                className="h-2" 
                data-testid="progress-budget-utilization"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Progress & Remaining Funds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-shadow border border-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Budget Progress</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Spent</span>
                <span className="text-sm font-medium" data-testid="text-spent-amount">
                  {formatCurrency(analytics.totalSpent)}
                </span>
              </div>
              <Progress 
                value={budgetUtilizationPercent} 
                className="h-3"
                data-testid="progress-budget-main"
              />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Budget</span>
                <span className="text-sm font-medium">
                  {formatCurrency(project.budget)}
                </span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Remaining</span>
                  <span className={`text-sm font-bold ${analytics.remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-remaining-budget">
                    {formatCurrency(analytics.remainingBudget)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow border border-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Cost Breakdown</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm">Labour</span>
                </div>
                <span className="text-sm font-medium" data-testid="text-labour-cost">
                  {formatCurrency(analytics.costBreakdown.labour)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm">Materials</span>
                </div>
                <span className="text-sm font-medium" data-testid="text-materials-cost">
                  {formatCurrency(analytics.costBreakdown.materials)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                  <span className="text-sm">Other</span>
                </div>
                <span className="text-sm font-medium" data-testid="text-other-cost">
                  {formatCurrency(analytics.costBreakdown.other)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Information */}
      <Card className="card-shadow border border-border">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Financial Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600" data-testid="text-project-revenue">
                {formatCurrency(project.revenue)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Total Costs</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(analytics.totalSpent)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Profit Margin</p>
              <p className={`text-2xl font-bold ${analytics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-profit-margin">
                {project.revenue > 0 ? ((analytics.netProfit / project.revenue) * 100).toFixed(1) : '0.0'}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}