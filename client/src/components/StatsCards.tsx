import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { Wallet, TrendingUp, FolderKanban, PiggyBank } from "lucide-react";

interface TenantStats {
  totalBudget: number;
  totalSpent: number;
  totalRevenue: number;
  activeProjects: number;
  completedProjects: number;
  netProfit: number;
  remainingBudget: number;
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
  
  const { data: projectStats, isLoading: isProjectLoading, error: projectError } = useQuery<ProjectStats>({
    queryKey: ['project-analytics', projectId],
    queryFn: () => fetch(`/api/projects/${projectId}/analytics?_cb=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache' }
    }).then(res => res.json()),
    enabled: Boolean(projectId),
    retry: false,
    staleTime: 0,
  });

  const { data: tenantStats, isLoading: isTenantLoading, error: tenantError } = useQuery<TenantStats>({
    queryKey: ["/api/analytics/tenant"],
    enabled: !projectId,
    retry: false,
  });

  const stats = projectId ? projectStats : tenantStats;
  const isLoading = projectId ? isProjectLoading : isTenantLoading;
  const error = projectId ? projectError : tenantError;

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
          <div key={i} className="relative overflow-hidden bg-card p-6 rounded-xl border border-border animate-pulse">
            <div className="shimmer absolute inset-0 z-0"></div>
            <div className="relative z-10">
              <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-muted rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </div>
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
      <Card className="card-elevated card-hover border-0 overflow-hidden stat-card animate-slide-up" style={{ animationDelay: '0ms' }}>
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
                {projectId ? 'Project Budget' : 'Total Budget'}
              </p>
              <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent" data-testid="text-total-budget">
                {stats 
                  ? formatCurrency(projectId ? (projectStats?.budget || 0) : (tenantStats?.totalBudget || 0))
                  : '₦0'
                }
              </p>
            </div>
            <div className="p-4 rounded-xl gradient-primary glow-primary">
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
            <span className="text-green-600 dark:text-green-400 font-semibold">Active</span>
            <span className="text-muted-foreground ml-2">budget allocation</span>
          </div>
        </CardContent>
      </Card>
      
      <Card className="card-elevated card-hover border-0 overflow-hidden stat-card animate-slide-up" style={{ animationDelay: '100ms' }}>
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
                {projectId ? 'Project Spent' : 'Total Spent'}
              </p>
              <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent" data-testid="text-total-spent">
                {stats 
                  ? formatCurrency(projectId ? (projectStats?.totalSpent || 0) : (tenantStats?.totalSpent || 0))
                  : '₦0'
                }
              </p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 glow-warning">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-orange-600 dark:text-orange-400 font-bold text-lg">{budgetUtilization}%</span>
            <span className="text-muted-foreground ml-2">of total budget</span>
          </div>
        </CardContent>
      </Card>
      
      <Card className="card-elevated card-hover border-0 overflow-hidden stat-card animate-slide-up" style={{ animationDelay: '200ms' }}>
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
                {projectId ? 'Transaction Count' : 'Active Projects'}
              </p>
              <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent" data-testid="text-active-projects">
                {projectId 
                  ? (projectStats?.transactionCount || 0)
                  : (tenantStats?.activeProjects || 0)
                }
              </p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 glow-primary">
              <FolderKanban className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-blue-600 dark:text-blue-400 font-semibold">
              {projectId ? 'Total' : 'Current'}
            </span>
            <span className="text-muted-foreground ml-2">
              {projectId ? 'transactions' : 'active projects'}
            </span>
          </div>
        </CardContent>
      </Card>
      
      <Card className="card-elevated card-hover border-0 overflow-hidden stat-card animate-slide-up" style={{ animationDelay: '300ms' }}>
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">Budget Remaining</p>
              <p className={`text-3xl font-bold mt-2 ${
                projectId 
                  ? (projectStats?.remainingBudget || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  : (tenantStats?.remainingBudget || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`} data-testid="text-net-profit">
                {projectId 
                  ? formatCurrency(projectStats?.remainingBudget || 0)
                  : formatCurrency(tenantStats?.remainingBudget || 0)
                }
              </p>
            </div>
            <div className={`p-4 rounded-xl ${
              projectId 
                ? (projectStats?.remainingBudget || 0) >= 0 ? 'bg-gradient-to-br from-green-500 to-emerald-500 glow-success' : 'bg-gradient-to-br from-red-500 to-rose-500 glow-danger'
                : (tenantStats?.remainingBudget || 0) >= 0 ? 'bg-gradient-to-br from-green-500 to-emerald-500 glow-success' : 'bg-gradient-to-br from-red-500 to-rose-500 glow-danger'
            }`}>
              <PiggyBank className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              projectId 
                ? (projectStats?.remainingBudget || 0) >= 0 ? 'bg-green-500' : 'bg-red-500'
                : (tenantStats?.remainingBudget || 0) >= 0 ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className={`font-semibold ${
              projectId 
                ? (projectStats?.remainingBudget || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                : (tenantStats?.remainingBudget || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>Available Funds</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
