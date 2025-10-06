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

interface LineItemBreakdown {
  lineItemId: string;
  lineItemName: string;
  category: string;
  totalAllocated: number;
  color: string;
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

  const { data: lineItemBreakdown, isLoading: isBreakdownLoading } = useQuery<LineItemBreakdown[]>({
    queryKey: ["/api/analytics/line-item-breakdown"],
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

  if (isLoading || isBreakdownLoading) {
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

  // Use real line item breakdown data
  const breakdownData = lineItemBreakdown?.map(item => ({
    name: item.lineItemName,
    color: item.color,
    amount: item.totalAllocated,
  })) || [];

  // Calculate total from breakdown data
  const totalAllocated = breakdownData.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Card className="card-shadow border border-border">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold">Budget Allocation</h3>
        <p className="text-sm text-muted-foreground mt-1">By line item</p>
      </div>
      <CardContent className="p-6">
        {breakdownData.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No cost allocations yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create cost allocations to see budget breakdown by line items
            </p>
          </div>
        ) : (
          <>
            <div className="chart-container rounded-lg p-4 mb-4">
              <div className="w-32 h-32 mx-auto relative" data-testid="budget-chart-circle">
                <div className="w-full h-full rounded-full border-8 border-primary"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-xl font-semibold" data-testid="text-total-budget-chart">
                      {formatCurrency(totalAllocated)}
                    </div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              {breakdownData.map((item) => (
                <div key={item.name} className="flex items-center justify-between" data-testid={`budget-item-${item.name.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 ${item.color} rounded-full`}></div>
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium" data-testid={`text-budget-${item.name.toLowerCase().replace(/\s+/g, '-')}`}>
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
