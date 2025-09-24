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

export default function StatsCards() {
  const { toast } = useToast();
  
  const { data: stats, isLoading, error } = useQuery<TenantStats>({
    queryKey: ["/api/analytics/tenant"],
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

  const budgetUtilization = stats ? ((stats.totalSpent / stats.totalBudget) * 100).toFixed(1) : '0.0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card className="card-shadow border border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Total Budget</p>
              <p className="text-2xl font-semibold text-foreground mt-1" data-testid="text-total-budget">
                {stats ? formatCurrency(stats.totalBudget) : '$0'}
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
              <p className="text-muted-foreground text-sm font-medium">Total Spent</p>
              <p className="text-2xl font-semibold text-foreground mt-1" data-testid="text-total-spent">
                {stats ? formatCurrency(stats.totalSpent) : '$0'}
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
              <p className="text-muted-foreground text-sm font-medium">Active Projects</p>
              <p className="text-2xl font-semibold text-foreground mt-1" data-testid="text-active-projects">
                {stats?.activeProjects || 0}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <i className="fas fa-project-diagram text-blue-600"></i>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-blue-600 font-medium">Current</span>
            <span className="text-muted-foreground ml-2">active projects</span>
          </div>
        </CardContent>
      </Card>
      
      <Card className="card-shadow border border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Budget Remaining</p>
              <p className={`text-2xl font-semibold mt-1 ${stats && stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-net-profit">
                {stats ? formatCurrency(stats.netProfit) : '$0'}
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
