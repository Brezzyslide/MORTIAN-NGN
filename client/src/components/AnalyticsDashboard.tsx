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
}

export default function AnalyticsDashboard() {
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

  const calculateBurnRate = (totalSpent: number, activeProjects: number) => {
    // Simple daily burn rate calculation (assumes even spending over time)
    if (!activeProjects) return 0;
    const avgProjectDuration = 90; // days
    return totalSpent / avgProjectDuration;
  };

  const calculateRemainingDays = (totalBudget: number, totalSpent: number, burnRate: number) => {
    if (burnRate <= 0) return Infinity;
    const remaining = totalBudget - totalSpent;
    return Math.floor(remaining / burnRate);
  };

  const calculateEfficiency = (totalRevenue: number, totalSpent: number) => {
    if (totalSpent <= 0) return 100;
    return Math.min(100, ((totalRevenue / totalSpent) * 100));
  };

  // Generate mock chart data for the last 6 months
  const generateChartData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const totalBudget = stats?.totalBudget || 0;
    const totalSpent = stats?.totalSpent || 0;
    
    return months.map((month, index) => {
      const progress = (index + 1) / 6;
      const budgetForMonth = totalBudget * progress;
      const spentForMonth = totalSpent * (progress * (0.8 + Math.random() * 0.4));
      const height = Math.max(40, Math.min(90, (spentForMonth / totalBudget) * 100 + Math.random() * 20));
      
      return {
        month,
        height: `${height}%`,
        budget: budgetForMonth,
        spent: spentForMonth,
      };
    });
  };

  if (isLoading) {
    return (
      <Card className="card-shadow border border-border mb-8">
        <div className="p-6 border-b border-border">
          <div className="h-6 bg-muted rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/3"></div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center p-4 bg-accent/30 rounded-lg animate-pulse">
                <div className="h-8 bg-muted rounded w-3/4 mx-auto mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2 mx-auto mb-1"></div>
                <div className="h-3 bg-muted rounded w-1/3 mx-auto"></div>
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

  const burnRate = calculateBurnRate(stats?.totalSpent || 0, stats?.activeProjects || 0);
  const remainingDays = calculateRemainingDays(stats?.totalBudget || 0, stats?.totalSpent || 0, burnRate);
  const efficiency = calculateEfficiency(stats?.totalRevenue || 0, stats?.totalSpent || 0);
  const remainingFunds = (stats?.totalBudget || 0) - (stats?.totalSpent || 0);
  const chartData = generateChartData();

  return (
    <Card className="card-shadow border border-border mb-8">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold">Real-time Analytics</h3>
        <p className="text-sm text-muted-foreground mt-1">Budget performance and burn rate analysis</p>
      </div>
      
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="text-center p-4 bg-accent/30 rounded-lg">
            <div className="text-2xl font-bold text-foreground" data-testid="text-burn-rate">
              {formatCurrency(burnRate)}
            </div>
            <div className="text-sm text-muted-foreground">Daily Burn Rate</div>
            <div className="text-xs text-blue-600 mt-1">Average spending</div>
          </div>
          
          <div className="text-center p-4 bg-accent/30 rounded-lg">
            <div className="text-2xl font-bold text-foreground" data-testid="text-remaining-funds">
              {formatCurrency(remainingFunds)}
            </div>
            <div className="text-sm text-muted-foreground">Remaining Funds</div>
            <div className="text-xs text-green-600 mt-1">
              {remainingDays === Infinity ? 'Indefinite' : `${remainingDays} days at current rate`}
            </div>
          </div>
          
          <div className="text-center p-4 bg-accent/30 rounded-lg">
            <div className="text-2xl font-bold text-green-600" data-testid="text-efficiency">
              {efficiency.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Budget Efficiency</div>
            <div className="text-xs text-green-600 mt-1">Revenue vs Spend</div>
          </div>
        </div>
        
        <div className="chart-container rounded-lg p-6">
          <h4 className="font-semibold mb-4">Budget vs Spend Trend</h4>
          <div className="h-64 flex items-end space-x-2" data-testid="budget-trend-chart">
            {chartData.map((data, index) => (
              <div key={data.month} className="flex-1 bg-secondary rounded-t flex flex-col justify-end relative group" style={{ height: data.height }}>
                <div className="bg-primary rounded-t p-2 text-center text-xs text-white cursor-pointer" data-testid={`chart-bar-${data.month.toLowerCase()}`}>
                  {data.month}
                </div>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  Budget: {formatCurrency(data.budget)}<br/>
                  Spent: {formatCurrency(data.spent)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
