import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface BudgetSummaryItem {
  projectId: string;
  projectTitle: string;
  totalBudget: number;
  totalSpent: number;
  spentPercentage: number;
  remainingBudget: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface BudgetProgressBarProps {
  projectId?: string | null;
}

export default function BudgetProgressBar({ projectId }: BudgetProgressBarProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  
  const { data: budgetSummary, isLoading, error } = useQuery<BudgetSummaryItem[]>({
    queryKey: ["/api/analytics/budget-summary", tenantId, projectId],
    queryFn: ({ queryKey }) => {
      const [url, tenantId, projectId] = queryKey;
      const params = new URLSearchParams();
      if (projectId) {
        params.set('projectId', projectId as string);
      }
      const fullUrl = `${url}${params.toString() ? `?${params.toString()}` : ''}`;
      return fetch(fullUrl).then(res => res.json());
    },
    enabled: Boolean(tenantId),
    retry: false,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-orange-600 bg-orange-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 95) return 'bg-red-500';
    if (percentage >= 80) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'critical':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card className="card-shadow border border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Budget vs Spend Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex justify-between items-center mb-2">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-6 bg-muted rounded w-16"></div>
                </div>
                <div className="h-2 bg-muted rounded-full mb-2"></div>
                <div className="flex justify-between items-center">
                  <div className="h-3 bg-muted rounded w-24"></div>
                  <div className="h-3 bg-muted rounded w-24"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!budgetSummary || budgetSummary.length === 0) {
    return (
      <Card className="card-shadow border border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Budget vs Spend Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No active projects found</p>
            <p className="text-sm mt-1">Create a project to track budget progress</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-shadow border border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Budget vs Spend Progress</CardTitle>
        <p className="text-sm text-muted-foreground">
          Real-time budget utilization across all active projects
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {budgetSummary.map((project) => (
            <div key={project.projectId} data-testid={`budget-progress-${project.projectId}`}>
              {/* Project Header */}
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium text-foreground truncate max-w-[200px]" title={project.projectTitle}>
                    {project.projectTitle}
                  </h4>
                  <Badge 
                    className={`text-xs ${getStatusColor(project.status)}`}
                    data-testid={`badge-status-${project.status}`}
                  >
                    <span className="flex items-center space-x-1">
                      {getStatusIcon(project.status)}
                      <span className="capitalize">{project.status}</span>
                    </span>
                  </Badge>
                </div>
                <div className="text-right">
                  <span 
                    className={`font-semibold text-lg ${
                      project.spentPercentage >= 95 ? 'text-red-600' :
                      project.spentPercentage >= 80 ? 'text-orange-600' : 'text-green-600'
                    }`}
                    data-testid={`text-percentage-${project.projectId}`}
                  >
                    {project.spentPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ease-in-out ${getProgressColor(project.spentPercentage)}`}
                    style={{ width: `${Math.min(project.spentPercentage, 100)}%` }}
                    data-testid={`progress-bar-${project.projectId}`}
                  />
                </div>
              </div>

              {/* Budget Details */}
              <div className="flex justify-between items-center text-sm">
                <div className="text-muted-foreground">
                  <span className="font-medium">Spent:</span> {formatCurrency(project.totalSpent)}
                </div>
                <div className="text-muted-foreground">
                  <span className="font-medium">Budget:</span> {formatCurrency(project.totalBudget)}
                </div>
              </div>
              <div className="flex justify-between items-center text-sm mt-1">
                <div className={`font-medium ${project.remainingBudget < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {project.remainingBudget < 0 ? 'Over budget by' : 'Remaining'}: {formatCurrency(Math.abs(project.remainingBudget))}
                </div>
                <div className="text-xs text-muted-foreground">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>

              {/* Alert for over-budget or near budget */}
              {project.spentPercentage >= 95 && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center space-x-2 text-red-700 text-xs">
                    <XCircle className="h-3 w-3" />
                    <span>
                      {project.remainingBudget < 0 
                        ? `Project is over budget by ${formatCurrency(Math.abs(project.remainingBudget))}`
                        : 'Project budget critically low - immediate attention required'
                      }
                    </span>
                  </div>
                </div>
              )}
              {project.spentPercentage >= 80 && project.spentPercentage < 95 && (
                <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded-md">
                  <div className="flex items-center space-x-2 text-orange-700 text-xs">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Budget warning - {formatCurrency(project.remainingBudget)} remaining</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary Footer */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Healthy Projects</div>
              <div className="text-lg font-semibold text-green-600">
                {budgetSummary.filter(p => p.status === 'healthy').length}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Warning Projects</div>
              <div className="text-lg font-semibold text-orange-600">
                {budgetSummary.filter(p => p.status === 'warning').length}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Critical Projects</div>
              <div className="text-lg font-semibold text-red-600">
                {budgetSummary.filter(p => p.status === 'critical').length}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}