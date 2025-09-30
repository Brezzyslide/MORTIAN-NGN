import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Users, Target } from "lucide-react";
import { Project, Transaction, FundAllocation } from "@shared/schema";
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

  const { data: allocations } = useQuery<FundAllocation[]>({
    queryKey: ["/api/fund-allocations", tenantId],
    enabled: Boolean(tenantId),
    retry: false,
  });

  // Process data for charts
  const processProjectData = () => {
    if (!projects || !Array.isArray(projects)) return [];
    
    return projects.map((project: any) => {
      // Calculate spent from transactions for this project
      const projectTransactions = (transactions || []).filter((t: any) => 
        t.projectId === project.id && t.type === 'expense'
      );
      const spent = projectTransactions.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      
      const budget = Number(project.budget) || 0;
      const revenue = Number(project.revenue) || 0;
      const profit = revenue - spent;
      
      return {
        name: project.title.length > 15 ? project.title.substring(0, 15) + '...' : project.title,
        budget,
        revenue,
        spent,
        profit
      };
    });
  };

  const processSpendingByCategory = () => {
    if (!transactions || !Array.isArray(transactions)) return [];
    
    const categoryTotals: { [key: string]: number } = {};
    
    transactions
      .filter((t: any) => t.type === 'expense')
      .forEach((transaction: any) => {
        const category = transaction.category || 'other';
        categoryTotals[category] = (categoryTotals[category] || 0) + Number(transaction.amount);
      });

    return Object.entries(categoryTotals).map(([name, value]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value
    }));
  };

  const processAllocationTrends = () => {
    if (!allocations || !Array.isArray(allocations)) return [];
    
    const monthlyAllocations: { [key: string]: number } = {};
    
    allocations.forEach((allocation: any) => {
      const date = new Date(allocation.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyAllocations[monthKey] = (monthlyAllocations[monthKey] || 0) + Number(allocation.amount);
    });

    return Object.entries(monthlyAllocations)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({
        month,
        allocations: amount
      }));
  };

  const processBudgetUtilization = () => {
    if (!projects || !Array.isArray(projects)) return [];
    
    return projects.map((project: any) => {
      // Calculate spent from transactions for this project
      const projectTransactions = (transactions || []).filter((t: any) => 
        t.projectId === project.id && t.type === 'expense'
      );
      const spent = projectTransactions.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      
      const budget = Number(project.budget) || 0;
      const utilization = budget > 0 ? (spent / budget) * 100 : 0;
      
      return {
        name: project.title.length > 15 ? project.title.substring(0, 15) + '...' : project.title,
        budgetUtilization: Math.min(utilization, 100),
        remaining: Math.max(100 - utilization, 0)
      };
    });
  };

  const chartColors = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0', '#ffb347'
  ];

  const projectData = processProjectData();
  const categoryData = processSpendingByCategory();
  const allocationTrends = processAllocationTrends();
  const budgetUtilization = processBudgetUtilization();

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
            <div className="text-2xl font-bold text-foreground">
              ${((tenantStats as any)?.totalBudget || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              ${((tenantStats as any)?.totalRevenue || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              ${((tenantStats as any)?.totalSpent || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Remaining</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${((tenantStats as any)?.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${((tenantStats as any)?.netProfit || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Tabs */}
      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-muted">
          <TabsTrigger value="projects" data-testid="tab-projects-analytics">Projects</TabsTrigger>
          <TabsTrigger value="spending" data-testid="tab-spending-analytics">Spending</TabsTrigger>
          <TabsTrigger value="trends" data-testid="tab-trends-analytics">Trends</TabsTrigger>
          <TabsTrigger value="utilization" data-testid="tab-utilization-analytics">Budget</TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle>Project Budget vs Revenue</CardTitle>
              <CardDescription>
                Comparison of allocated budgets and generated revenue per project
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
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      color: 'hsl(var(--foreground))'
                    }}
                    formatter={(value) => [`$${Number(value).toLocaleString()}`, '']}
                  />
                  <Legend />
                  <Bar dataKey="budget" fill="#8884d8" name="Budget" />
                  <Bar dataKey="revenue" fill="#82ca9d" name="Revenue" />
                  <Bar dataKey="spent" fill="#ffc658" name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="spending">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle>Spending Distribution by Category</CardTitle>
              <CardDescription>
                Breakdown of expenses across different categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Amount']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle>Monthly Allocation Trends</CardTitle>
              <CardDescription>
                Fund allocation patterns over time with trend line overlay
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={allocationTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      color: 'hsl(var(--foreground))'
                    }}
                    formatter={(value, name) => [`$${Number(value).toLocaleString()}`, name]}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="allocations" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.3}
                    name="Allocation Area"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="allocations" 
                    stroke="#ff7300" 
                    strokeWidth={3}
                    dot={{ fill: '#ff7300', strokeWidth: 2 }}
                    name="Trend Line"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="utilization">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle>Budget Utilization by Project</CardTitle>
              <CardDescription>
                Percentage of budget used per project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={budgetUtilization} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    type="number" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    width={100}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      color: 'hsl(var(--foreground))'
                    }}
                    formatter={(value) => [`${Number(value).toFixed(1)}%`, '']}
                  />
                  <Legend />
                  <Bar dataKey="budgetUtilization" stackId="a" fill="#ff7300" name="Used" />
                  <Bar dataKey="remaining" stackId="a" fill="#82ca9d" name="Remaining" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}