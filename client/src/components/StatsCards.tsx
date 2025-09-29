import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";

interface TenantStats {
  totalBudget: number;
  totalSpent: number;
  totalRevenue: number;
  activeProjects: number;
  completedProjects: number;
  netProfit: number;
}

interface ProjectStats {
  projectId: string;
  budget: number;
  totalSpent: number;
  revenue: number;
  netProfit: number;
  budgetUtilizationPercentage: number;
  remainingBudget: number;
  transactionCount: number;
}

interface StatsCardsProps {
  projectId?: string | null;
}

export default function StatsCards({ projectId }: StatsCardsProps) {
  const { toast } = useToast();
  
  // Fetch project-specific stats when projectId is provided
  const { data: projectStats, isLoading: isProjectLoading, error: projectError } = useQuery<ProjectStats>({
    queryKey: ["/api/analytics/projects", projectId],
    enabled: Boolean(projectId),
    retry: false,
  });

  // Fetch tenant-level stats when no projectId is provided
  const { data: tenantStats, isLoading: isTenantLoading, error: tenantError } = useQuery<TenantStats>({
    queryKey: ["/api/analytics/tenant"],
    enabled: !projectId,
    retry: false,
  });

  const stats = projectId ? projectStats : tenantStats;
  const isLoading = projectId ? isProjectLoading : isTenantLoading;
  const error = projectId ? projectError : tenantError;

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

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card p-6 rounded-lg card-shadow border border-border animate-pulse">
            <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-muted rounded w-3/4 mb-4"></div>
            <div className="h-3 bg-muted rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  const budgetUtilization = stats 
    ? projectId 
      ? ((projectStats?.totalSpent || 0) / (projectStats?.budget || 1) * 100).toFixed(1)
      : ((tenantStats?.totalSpent || 0) / (tenantStats?.totalBudget || 1) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card className="card-shadow border border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                {projectId ? 'Project Budget' : 'Total Budget'}
              </p>
              <p className="text-2xl font-semibold text-foreground mt-1" data-testid="text-total-budget">
                {stats 
                  ? formatCurrency(projectId ? (projectStats?.budget || 0) : (tenantStats?.totalBudget || 0))
                  : '₦0'
                }
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-full">
              <i className="fas fa-wallet text-primary"></i>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">Active</span>
            <span className="text-muted-foreground ml-2">budget allocation</span>
          </div>
        </CardContent>
      </Card>
      
      <Card className="card-shadow border border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                {projectId ? 'Project Spent' : 'Total Spent'}
              </p>
              <p className="text-2xl font-semibold text-foreground mt-1" data-testid="text-total-spent">
                {stats 
                  ? formatCurrency(projectId ? (projectStats?.totalSpent || 0) : (tenantStats?.totalSpent || 0))
                  : '₦0'
                }
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <i className="fas fa-chart-line text-orange-600"></i>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-orange-600 font-medium">{budgetUtilization}%</span>
            <span className="text-muted-foreground ml-2">of total budget</span>
          </div>
        </CardContent>
      </Card>
      
      <Card className="card-shadow border border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                {projectId ? 'Transaction Count' : 'Active Projects'}
              </p>
              <p className="text-2xl font-semibold text-foreground mt-1" data-testid="text-active-projects">
                {projectId 
                  ? (projectStats?.transactionCount || 0)
                  : (tenantStats?.activeProjects || 0)
                }
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <i className="fas fa-project-diagram text-blue-600"></i>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-blue-600 font-medium">
              {projectId ? 'Total' : 'Current'}
            </span>
            <span className="text-muted-foreground ml-2">
              {projectId ? 'transactions' : 'active projects'}
            </span>
          </div>
        </CardContent>
      </Card>
      
      <Card className="card-shadow border border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Budget Remaining</p>
              <p className={`text-2xl font-semibold mt-1 ${
                projectId 
                  ? (projectStats?.remainingBudget || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  : (tenantStats?.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`} data-testid="text-net-profit">
                {projectId 
                  ? formatCurrency(projectStats?.remainingBudget || 0)
                  : formatCurrency(tenantStats?.netProfit || 0)
                }
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <i className={`fas ${stats && stats.netProfit >= 0 ? 'fa-trending-up text-green-600' : 'fa-trending-down text-red-600'}`}></i>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">Available Funds</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
