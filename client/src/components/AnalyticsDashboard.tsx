import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";

interface TenantStats {
  totalBudget: number;
  totalSpent: number;
  totalRevenue: number;
  activeProjects: number;
  completedProjects: number;
}

interface ProjectStats {
  totalBudget: number;
  totalSpent: number;
  totalRevenue: number;
  netProfit: number;
  transactionCount: number;
}

interface AnalyticsDashboardProps {
  selectedProjectId?: string | null;
}

export default function AnalyticsDashboard({ selectedProjectId }: AnalyticsDashboardProps = {}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const tenantId = user?.tenantId;

  // Fetch tenant-wide stats when no project is selected
  const { data: tenantStats, isLoading: tenantLoading, error: tenantError } = useQuery<TenantStats>({
    queryKey: ["/api/analytics/tenant"],
    enabled: Boolean(tenantId) && !selectedProjectId,
    retry: false,
  });

  // Fetch project-specific stats when a project is selected
  const { data: projectStats, isLoading: projectLoading, error: projectError } = useQuery<ProjectStats>({
    queryKey: ["/api/analytics/project", selectedProjectId],
    enabled: Boolean(tenantId) && Boolean(selectedProjectId),
    retry: false,
  });

  const stats = selectedProjectId ? projectStats : tenantStats;
  const isLoading = selectedProjectId ? projectLoading : tenantLoading;
  const error = selectedProjectId ? projectError : tenantError;

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
      <Card className="card-shadow border border-border mb-8">
        <div className="p-6 border-b border-border">
          <div className="h-6 bg-muted rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/3"></div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center p-4 bg-accent/30 rounded-lg animate-pulse">
                <div className="h-8 bg-muted rounded w-3/4 mx-auto mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2 mx-auto mb-1"></div>
              </div>
            ))}
          </div>
          <div className="chart-container rounded-lg p-6 animate-pulse">
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  const totalBudget = stats?.totalBudget || 0;
  const totalSpent = stats?.totalSpent || 0;
  const remainingBudget = totalBudget - totalSpent;
  const utilizationPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const getUtilizationColor = (percent: number) => {
    if (percent >= 90) return "text-red-600";
    if (percent >= 75) return "text-yellow-600";
    return "text-green-600";
  };

  const getUtilizationStatus = (percent: number) => {
    if (percent >= 90) return "Critical";
    if (percent >= 75) return "Warning";
    return "Healthy";
  };

  return (
    <Card className="card-shadow border border-border mb-8">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold">Budget Overview</h3>
        <p className="text-sm text-muted-foreground mt-1">Current spending and budget status</p>
      </div>
      
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="h-5 w-5 text-blue-600 mr-2" />
              <div className="text-2xl font-bold text-blue-600" data-testid="text-total-budget">
                {formatCurrency(totalBudget)}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">Total Budget</div>
            <div className="text-xs text-blue-600 mt-1">
              {selectedProjectId 
                ? 'Project Budget' 
                : `${(tenantStats as TenantStats)?.activeProjects || 0} active projects`
              }
            </div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-purple-600 mr-2" />
              <div className="text-2xl font-bold text-purple-600" data-testid="text-total-spent">
                {formatCurrency(totalSpent)}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">Total Spent</div>
            <div className="text-xs text-purple-600 mt-1">Approved allocations + transactions</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-center mb-2">
              <TrendingDown className="h-5 w-5 text-green-600 mr-2" />
              <div className="text-2xl font-bold text-green-600" data-testid="text-remaining-budget">
                {formatCurrency(remainingBudget)}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">Remaining Budget</div>
            <div className="text-xs text-green-600 mt-1">
              {remainingBudget >= 0 ? 'Available to spend' : 'Over budget'}
            </div>
          </div>
          
          <div className={`text-center p-4 rounded-lg border ${
            utilizationPercent >= 90 
              ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
              : utilizationPercent >= 75
              ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
              : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
          }`}>
            <div className="flex items-center justify-center mb-2">
              <Percent className={`h-5 w-5 mr-2 ${getUtilizationColor(utilizationPercent)}`} />
              <div className={`text-2xl font-bold ${getUtilizationColor(utilizationPercent)}`} data-testid="text-utilization">
                {utilizationPercent.toFixed(1)}%
              </div>
            </div>
            <div className="text-sm text-muted-foreground">Budget Utilization</div>
            <div className={`text-xs mt-1 ${getUtilizationColor(utilizationPercent)}`}>
              {getUtilizationStatus(utilizationPercent)}
            </div>
          </div>
        </div>
        
        <div className="chart-container rounded-lg p-6">
          <h4 className="font-semibold mb-4">Budget vs Spend Comparison</h4>
          <div className="space-y-4" data-testid="budget-comparison-chart">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Total Budget</span>
                <span className="text-sm font-bold text-blue-600">{formatCurrency(totalBudget)}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-8 relative overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full flex items-center justify-end pr-2"
                  style={{ width: '100%' }}
                  data-testid="bar-budget"
                >
                  <span className="text-xs text-white font-medium">100%</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Total Spent</span>
                <span className="text-sm font-bold text-purple-600">{formatCurrency(totalSpent)}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-8 relative overflow-hidden">
                <div 
                  className={`h-full rounded-full flex items-center justify-end pr-2 ${
                    utilizationPercent >= 100 ? 'bg-red-500' : 
                    utilizationPercent >= 75 ? 'bg-yellow-500' : 
                    'bg-purple-500'
                  }`}
                  style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                  data-testid="bar-spent"
                >
                  <span className="text-xs text-white font-medium">{utilizationPercent.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {remainingBudget > 0 && (
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Remaining</span>
                  <span className="text-sm font-bold text-green-600">{formatCurrency(remainingBudget)}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-8 relative overflow-hidden">
                  <div 
                    className="bg-green-500 h-full rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${((remainingBudget / totalBudget) * 100).toFixed(1)}%` }}
                    data-testid="bar-remaining"
                  >
                    <span className="text-xs text-white font-medium">
                      {((remainingBudget / totalBudget) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
