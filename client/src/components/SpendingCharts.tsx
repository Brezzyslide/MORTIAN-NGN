import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { TrendingUp, Users, Package, BarChart3, PieChart as PieChartIcon } from "lucide-react";

interface LabourMaterialSplit {
  totalLabour: number;
  totalMaterial: number;
  labourPercentage: number;
  materialPercentage: number;
}

interface CategorySpending {
  category: string;
  totalSpent: number;
  labourCost: number;
  materialCost: number;
  allocationCount: number;
}

interface SpendingChartsProps {
  filters?: {
    startDate?: Date;
    endDate?: Date;
    projectId?: string;
    categories?: string[];
  };
}

const COLORS = {
  labour: '#3b82f6', // Blue
  material: '#f59e0b', // Orange
  categories: [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Orange
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#f97316', // Orange
    '#ec4899', // Pink
    '#6366f1', // Indigo
  ]
};

const CATEGORY_LABELS: Record<string, string> = {
  'land_purchase': 'Land Purchase',
  'site_preparation': 'Site Preparation',
  'foundation': 'Foundation',
  'structural': 'Structural',
  'roofing': 'Roofing',
  'electrical': 'Electrical',
  'plumbing': 'Plumbing',
  'finishing': 'Finishing',
  'external_works': 'External Works',
  'development_resources': 'Development',
  'design_tools': 'Design Tools',
  'testing_qa': 'Testing & QA',
  'infrastructure': 'Infrastructure',
  'marketing': 'Marketing',
  'operations': 'Operations',
  'miscellaneous': 'Miscellaneous'
};

export default function SpendingCharts({ filters }: SpendingChartsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const tenantId = user?.tenantId;

  // Build query parameters for API calls
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    
    if (filters?.startDate) {
      params.set("startDate", filters.startDate.toISOString());
    }
    
    if (filters?.endDate) {
      params.set("endDate", filters.endDate.toISOString());
    }
    
    if (filters?.projectId) {
      params.set("projectId", filters.projectId);
    }
    
    if (filters?.categories && filters.categories.length > 0) {
      filters.categories.forEach(category => {
        params.append("categories", category);
      });
    }
    
    return params.toString();
  }, [filters]);

  // Fetch labour vs material split data
  const labourMaterialUrl = `/api/analytics/labour-material-split${queryParams ? `?${queryParams}` : ''}`;
  const { data: labourMaterialData, isLoading: isLoadingLabourMaterial, error: labourMaterialError } = useQuery<LabourMaterialSplit>({
    queryKey: ['labour-material-split', tenantId, queryParams],
    queryFn: async () => {
      const res = await fetch(labourMaterialUrl);
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: Boolean(tenantId),
    retry: false,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Fetch category spending data
  const categorySpendingUrl = `/api/analytics/category-spending${queryParams ? `?${queryParams}` : ''}`;
  const { data: categoryData, isLoading: isLoadingCategory, error: categoryError } = useQuery<CategorySpending[]>({
    queryKey: ['category-spending', tenantId, queryParams],
    queryFn: async () => {
      const res = await fetch(categorySpendingUrl);
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: Boolean(tenantId),
    retry: false,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Handle authentication errors
  useEffect(() => {
    const handleAuthError = (error: any) => {
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
    };

    handleAuthError(labourMaterialError);
    handleAuthError(categoryError);
  }, [labourMaterialError, categoryError, toast]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCurrencyShort = (amount: number) => {
    if (amount >= 1000000) {
      return `₦${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `₦${(amount / 1000).toFixed(0)}K`;
    }
    return `₦${amount.toFixed(0)}`;
  };

  // Prepare pie chart data for labour vs material
  const pieChartData = useMemo(() => {
    if (!labourMaterialData) return [];
    
    return [
      {
        name: 'Labour',
        value: labourMaterialData.totalLabour,
        percentage: labourMaterialData.labourPercentage,
        color: COLORS.labour
      },
      {
        name: 'Material',
        value: labourMaterialData.totalMaterial,
        percentage: labourMaterialData.materialPercentage,
        color: COLORS.material
      }
    ].filter(item => item.value > 0);
  }, [labourMaterialData]);

  // Prepare bar chart data for category spending
  const barChartData = useMemo(() => {
    if (!categoryData) return [];
    
    return categoryData
      .map((category, index) => ({
        name: CATEGORY_LABELS[category.category] || category.category.replace(/_/g, ' '),
        totalSpent: category.totalSpent,
        labourCost: category.labourCost,
        materialCost: category.materialCost,
        allocationCount: category.allocationCount,
        color: COLORS.categories[index % COLORS.categories.length]
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10); // Show top 10 categories
  }, [categoryData]);

  // Custom tooltip for pie chart
  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(data.value)} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for bar chart
  const BarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">
            Total: {formatCurrency(data.totalSpent)}
          </p>
          <p className="text-sm text-blue-600">
            Labour: {formatCurrency(data.labourCost)}
          </p>
          <p className="text-sm text-orange-600">
            Material: {formatCurrency(data.materialCost)}
          </p>
          <p className="text-sm text-muted-foreground">
            {data.allocationCount} allocation(s)
          </p>
        </div>
      );
    }
    return null;
  };

  const isLoading = isLoadingLabourMaterial || isLoadingCategory;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Labour vs Material Pie Chart */}
      <Card className="card-shadow border border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center space-x-2">
            <PieChartIcon className="h-5 w-5" />
            <span>Labour vs Material Split</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Distribution of construction costs between labour and materials
          </p>
        </CardHeader>
        <CardContent>
          {isLoadingLabourMaterial ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-pulse">
                <div className="w-48 h-48 bg-muted rounded-full mx-auto"></div>
              </div>
            </div>
          ) : pieChartData && pieChartData.length > 0 ? (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend and Summary */}
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Labour</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(labourMaterialData?.totalLabour || 0)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {labourMaterialData?.labourPercentage.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Material</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(labourMaterialData?.totalMaterial || 0)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {labourMaterialData?.materialPercentage.toFixed(1)}%
                    </Badge>
                  </div>
                </div>

                {/* Total Summary */}
                <div className="pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Spending</span>
                    <span className="text-lg font-semibold">
                      {formatCurrency((labourMaterialData?.totalLabour || 0) + (labourMaterialData?.totalMaterial || 0))}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-center">
              <div className="text-muted-foreground">
                <PieChartIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No spending data available</p>
                <p className="text-sm mt-1">Add cost allocations to see the split</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Spending Bar Chart */}
      <Card className="card-shadow border border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Spending by Category</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Top construction categories by total spending (labour + materials)
          </p>
        </CardHeader>
        <CardContent>
          {isLoadingCategory ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-pulse w-full">
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-8 bg-muted rounded" style={{ width: `${80 - i * 10}%` }}></div>
                  ))}
                </div>
              </div>
            </div>
          ) : barChartData && barChartData.length > 0 ? (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barChartData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={formatCurrencyShort}
                    />
                    <Tooltip content={<BarTooltip />} />
                    <Bar 
                      dataKey="totalSpent" 
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top Categories Summary */}
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium">Top Categories</h4>
                <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                  {barChartData.slice(0, 3).map((category, index) => (
                    <div key={category.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }}></div>
                        <span className="truncate max-w-[120px]">{category.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrencyShort(category.totalSpent)}</p>
                        <p className="text-xs text-muted-foreground">{category.allocationCount} items</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-center">
              <div className="text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No category data available</p>
                <p className="text-sm mt-1">Add cost allocations to see category breakdown</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="lg:col-span-2">
        <Card className="card-shadow border border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Spending Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Labour Costs</p>
                  <p className="font-semibold">
                    {formatCurrency(labourMaterialData?.totalLabour || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {labourMaterialData?.labourPercentage.toFixed(1)}% of total
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-3 bg-orange-100 rounded-full">
                  <Package className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Material Costs</p>
                  <p className="font-semibold">
                    {formatCurrency(labourMaterialData?.totalMaterial || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {labourMaterialData?.materialPercentage.toFixed(1)}% of total
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-3 bg-green-100 rounded-full">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Categories</p>
                  <p className="font-semibold">
                    {categoryData?.length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {categoryData?.reduce((sum, cat) => sum + cat.allocationCount, 0) || 0} total allocations
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}