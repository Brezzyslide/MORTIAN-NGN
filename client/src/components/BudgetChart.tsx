import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface TenantStats {
  totalBudget: number;
  totalSpent: number;
  totalRevenue: number;
  activeProjects: number;
  completedProjects: number;
}

export default function BudgetChart() {
  const { toast } = useToast();
  const { user } = useAuth();
  const tenantId = user?.tenantId;

  const { data: stats, isLoading, error } = useQuery<TenantStats>({
    queryKey: ["/api/analytics/tenant"],
    enabled: Boolean(tenantId),
    retry: false,
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
    if (amount >= 1000000) {
      return `₦${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `₦${(amount / 1000).toFixed(0)}K`;
    }
    return `₦${amount.toFixed(0)}`;
  };

  if (isLoading) {
    return (
      <Card className="card-shadow border border-border">
        <div className="p-6 border-b border-border">
          <div className="h-6 bg-muted rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/3"></div>
        </div>
        <div className="p-6">
          <div className="chart-container rounded-lg p-4 mb-4 animate-pulse">
            <div className="w-32 h-32 mx-auto bg-muted rounded-full"></div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-muted rounded-full"></div>
                  <div className="h-4 bg-muted rounded w-20"></div>
                </div>
                <div className="h-4 bg-muted rounded w-12"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  // Mock department breakdown for visualization
  const departmentBreakdown = [
    { name: "Development", color: "bg-primary", amount: (stats?.totalBudget || 0) * 0.49 },
    { name: "Design", color: "bg-green-500", amount: (stats?.totalBudget || 0) * 0.196 },
    { name: "Marketing", color: "bg-orange-500", amount: (stats?.totalBudget || 0) * 0.212 },
    { name: "Operations", color: "bg-purple-500", amount: (stats?.totalBudget || 0) * 0.102 },
  ];

  return (
    <Card className="card-shadow border border-border">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold">Budget Allocation</h3>
        <p className="text-sm text-muted-foreground mt-1">By department</p>
      </div>
      <CardContent className="p-6">
        <div className="chart-container rounded-lg p-4 mb-4">
          <div className="w-32 h-32 mx-auto relative" data-testid="budget-chart-circle">
            <div className="w-full h-full rounded-full border-8 border-primary"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-xl font-semibold" data-testid="text-total-budget-chart">
                  {formatCurrency(stats?.totalBudget || 0)}
                </div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          {departmentBreakdown.map((dept, index) => (
            <div key={dept.name} className="flex items-center justify-between" data-testid={`budget-item-${dept.name.toLowerCase()}`}>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 ${dept.color} rounded-full`}></div>
                <span className="text-sm">{dept.name}</span>
              </div>
              <span className="text-sm font-medium" data-testid={`text-budget-${dept.name.toLowerCase()}`}>
                {formatCurrency(dept.amount)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
