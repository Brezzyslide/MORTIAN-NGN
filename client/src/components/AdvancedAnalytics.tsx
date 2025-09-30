import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Target } from "lucide-react";
import { Project, Transaction } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

interface TenantStats {
  totalBudget: number;
  totalSpent: number;
  totalRevenue: number;
  activeProjects: number;
  completedProjects: number;
}

export default function AdvancedAnalytics() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;

  const { data: tenantStats } = useQuery<TenantStats>({
    queryKey: ["/api/analytics/tenant"],
    enabled: Boolean(tenantId),
    retry: false,
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects", tenantId],
    enabled: Boolean(tenantId),
    retry: false,
  });

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions", tenantId],
    enabled: Boolean(tenantId),
    retry: false,
  });

  // Process project data to calculate net profit/loss
  const processProjectData = () => {
    if (!projects || !Array.isArray(projects)) return [];
    
    return projects.map((project: any) => {
      // Calculate spent from expense transactions
      const projectExpenses = (transactions || []).filter((t: any) => 
        t.projectId === project.id && t.type === 'expense'
      );
      const spent = projectExpenses.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      
      // Calculate revenue from revenue transactions
      const projectRevenue = (transactions || []).filter((t: any) => 
        t.projectId === project.id && t.type === 'revenue'
      );
      const revenue = projectRevenue.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      
      const budget = Number(project.budget) || 0;
      const netProfit = revenue - spent;
      
      return {
        name: project.title.length > 20 ? project.title.substring(0, 20) + '...' : project.title,
        budget,
        revenue,
        spent,
        netProfit,
        profitColor: netProfit >= 0 ? '#22c55e' : '#ef4444'
      };
    });
  };

  const projectData = processProjectData();
  const totalNetProfit = (tenantStats?.totalRevenue || 0) - (tenantStats?.totalSpent || 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Advanced Analytics
        </h2>
        <p className="text-muted-foreground">
          Comprehensive financial insights and performance metrics
        </p>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground" data-testid="text-total-budget-advanced">
              {formatCurrency(tenantStats?.totalBudget || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-total-revenue-advanced">
              {formatCurrency(tenantStats?.totalRevenue || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground" data-testid="text-total-spent-advanced">
              {formatCurrency(tenantStats?.totalSpent || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit / Loss</CardTitle>
            <Target className={`h-4 w-4 ${totalNetProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalNetProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-net-profit-advanced">
              {formatCurrency(totalNetProfit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalNetProfit >= 0 ? 'Profit' : 'Loss'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Project Revenue vs Spending with Net Profit */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle>Project Revenue vs Spending</CardTitle>
          <CardDescription>
            Net profit/loss analysis per project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={projectData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  color: 'hsl(var(--foreground))'
                }}
                formatter={(value, name) => [formatCurrency(Number(value)), name]}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#22c55e" name="Revenue" />
              <Bar dataKey="spent" fill="#ef4444" name="Spent" />
              <Bar dataKey="netProfit" name="Net Profit/Loss">
                {projectData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.netProfit >= 0 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
