import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import ChangeOrdersTable from "@/components/ChangeOrdersTable";
import ChangeOrdersSummaryWidget from "@/components/ChangeOrdersSummaryWidget";
import CostAllocationsTable from "@/components/CostAllocationsTable";
import BudgetHistoryView from "@/components/BudgetHistoryView";
import { 
  Building, 
  Calendar, 
  DollarSign, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  ArrowLeft,
  Layers,
  Target,
  BarChart3,
  FileText
} from "lucide-react";

interface Project {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  budget: string;
  consumedAmount: string;
  revenue: string;
  managerId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectDetailViewProps {
  projectId: string;
  onBack?: () => void;
}

export default function ProjectDetailView({ projectId, onBack }: ProjectDetailViewProps) {
  const { toast } = useToast();
  const { permissions } = usePermissions();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch project details
  const { data: project, isLoading: projectLoading, error: projectError } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    retry: false,
  });

  // Fetch change orders for this project
  const { data: changeOrders, isLoading: changeOrdersLoading } = useQuery({
    queryKey: ["/api/change-orders", `projectId=${projectId}`],
    retry: false,
  });

  // Fetch cost allocations for this project
  const { data: costAllocationsData, isLoading: costAllocationsLoading } = useQuery({
    queryKey: ["/api/cost-allocations-filtered", `projectId=${projectId}`],
    retry: false,
  });

  // Handle authentication errors
  if (projectError && isUnauthorizedError(projectError)) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
    return null;
  }

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateProgress = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    
    if (elapsed <= 0) return 0;
    if (elapsed >= totalDuration) return 100;
    
    return Math.round((elapsed / totalDuration) * 100);
  };

  const projectStats = useMemo(() => {
    if (!project) return null;

    const totalBudget = parseFloat(project.budget);
    const consumedAmount = parseFloat(project.consumedAmount);
    const revenue = parseFloat(project.revenue || "0");
    const spentPercentage = totalBudget > 0 ? (consumedAmount / totalBudget) * 100 : 0;
    const remainingBudget = totalBudget - consumedAmount;
    const timeProgress = calculateProgress(project.startDate, project.endDate);
    const isOverdue = new Date(project.endDate) < new Date();

    // Calculate change orders impact
    const approvedChangeOrders = changeOrders?.filter((co: any) => co.status === 'approved') || [];
    const pendingChangeOrders = changeOrders?.filter((co: any) => co.status === 'pending' || co.status === 'draft') || [];
    const totalChangeOrderImpact = approvedChangeOrders.reduce((sum: number, co: any) => sum + parseFloat(co.costImpact || '0'), 0);
    const pendingChangeOrderImpact = pendingChangeOrders.reduce((sum: number, co: any) => sum + parseFloat(co.costImpact || '0'), 0);

    // Calculate cost allocations linked to change orders
    const allocationsWithChangeOrders = costAllocationsData?.allocations?.filter((ca: any) => ca.changeOrderId) || [];
    const changeOrderLinkedCosts = allocationsWithChangeOrders.reduce((sum: number, ca: any) => sum + parseFloat(ca.totalCost || '0'), 0);

    return {
      totalBudget,
      consumedAmount,
      revenue,
      spentPercentage,
      remainingBudget,
      timeProgress,
      isOverdue,
      totalChangeOrderImpact,
      pendingChangeOrderImpact,
      changeOrderLinkedCosts,
      approvedChangeOrdersCount: approvedChangeOrders.length,
      pendingChangeOrdersCount: pendingChangeOrders.length,
      allocationsWithChangeOrdersCount: allocationsWithChangeOrders.length,
    };
  }, [project, changeOrders, costAllocationsData]);

  const getBudgetStatus = (spentPercentage: number) => {
    if (spentPercentage >= 95) return { status: 'critical', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
    if (spentPercentage >= 80) return { status: 'warning', color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' };
    return { status: 'healthy', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
  };

  if (projectLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Loading project details...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-600">Project not found</p>
              <p className="text-gray-500 mt-2">The project you're looking for doesn't exist or you don't have access to it.</p>
              {onBack && (
                <Button variant="outline" onClick={onBack} className="mt-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const budgetStatus = getBudgetStatus(projectStats?.spentPercentage || 0);

  return (
    <div className="space-y-6" data-testid={`project-detail-${projectId}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid={`text-project-title-${projectId}`}>
              {project.title}
            </h1>
            <p className="text-muted-foreground mt-1" data-testid={`text-project-description-${projectId}`}>
              {project.description || "No description available"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge 
            variant={project.status === 'active' ? 'default' : 'secondary'}
            data-testid={`badge-project-status-${projectId}`}
          >
            {project.status}
          </Badge>
          {projectStats?.isOverdue && (
            <Badge variant="destructive" data-testid={`badge-overdue-${projectId}`}>
              <AlertTriangle className="h-3 w-3 mr-1" />
              Overdue
            </Badge>
          )}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Budget Overview */}
        <Card className={`${budgetStatus.bgColor} ${budgetStatus.borderColor}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Budget Status</p>
                <p className={`text-2xl font-bold ${budgetStatus.color}`} data-testid={`text-budget-spent-${projectId}`}>
                  {projectStats?.spentPercentage.toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatCurrency(projectStats?.consumedAmount || 0)} / {formatCurrency(projectStats?.totalBudget || 0)}
                </p>
              </div>
              <DollarSign className={`h-8 w-8 ${budgetStatus.color}`} />
            </div>
            <Progress value={projectStats?.spentPercentage || 0} className="mt-3" />
          </CardContent>
        </Card>

        {/* Time Progress */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Time Progress</p>
                <p className="text-2xl font-bold text-foreground" data-testid={`text-time-progress-${projectId}`}>
                  {projectStats?.timeProgress}%
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDate(project.startDate)} - {formatDate(project.endDate)}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
            <Progress value={projectStats?.timeProgress || 0} className="mt-3" />
          </CardContent>
        </Card>

        {/* Change Orders */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Change Orders</p>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-2xl font-bold text-foreground" data-testid={`text-change-orders-count-${projectId}`}>
                    {(projectStats?.approvedChangeOrdersCount || 0) + (projectStats?.pendingChangeOrdersCount || 0)}
                  </p>
                  {projectStats?.pendingChangeOrdersCount && projectStats.pendingChangeOrdersCount > 0 && (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">
                      {projectStats.pendingChangeOrdersCount} pending
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Impact: {formatCurrency(projectStats?.totalChangeOrderImpact || 0)}
                </p>
              </div>
              <Layers className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        {/* Linked Costs */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Change Order Costs</p>
                <p className="text-2xl font-bold text-foreground" data-testid={`text-linked-costs-${projectId}`}>
                  {projectStats?.allocationsWithChangeOrdersCount || 0}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Total: {formatCurrency(projectStats?.changeOrderLinkedCosts || 0)}
                </p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <Building className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="change-orders" data-testid="tab-change-orders">
            <Layers className="h-4 w-4 mr-2" />
            Change Orders
          </TabsTrigger>
          <TabsTrigger value="cost-allocations" data-testid="tab-cost-allocations">
            <BarChart3 className="h-4 w-4 mr-2" />
            Cost Allocations
          </TabsTrigger>
          <TabsTrigger value="budget-history" data-testid="tab-budget-history">
            <FileText className="h-4 w-4 mr-2" />
            Budget History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Project Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5 text-blue-600" />
                  <span>Project Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-sm mt-1" data-testid={`text-project-detail-description-${projectId}`}>
                    {project.description || "No description provided"}
                  </p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                    <p className="text-sm mt-1" data-testid={`text-start-date-${projectId}`}>
                      {formatDate(project.startDate)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">End Date</label>
                    <p className="text-sm mt-1" data-testid={`text-end-date-${projectId}`}>
                      {formatDate(project.endDate)}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Original Budget</label>
                    <p className="text-sm mt-1 font-medium" data-testid={`text-original-budget-${projectId}`}>
                      {formatCurrency(project.budget)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Revenue Target</label>
                    <p className="text-sm mt-1 font-medium" data-testid={`text-revenue-target-${projectId}`}>
                      {formatCurrency(project.revenue || 0)}
                    </p>
                  </div>
                </div>
                <Separator />
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                      {project.status}
                    </Badge>
                    {projectStats?.isOverdue && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Overdue
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Change Orders */}
            <ChangeOrdersSummaryWidget 
              onViewAll={() => setActiveTab("change-orders")}
            />
          </div>

          {/* Budget Impact Analysis */}
          {projectStats && (projectStats.totalChangeOrderImpact > 0 || projectStats.pendingChangeOrderImpact > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  <span>Change Order Budget Impact</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Approved Impact</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900 mt-2">
                      {formatCurrency(projectStats.totalChangeOrderImpact)}
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      {projectStats.approvedChangeOrdersCount} approved change orders
                    </p>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">Pending Impact</span>
                    </div>
                    <p className="text-2xl font-bold text-yellow-900 mt-2">
                      {formatCurrency(projectStats.pendingChangeOrderImpact)}
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      {projectStats.pendingChangeOrdersCount} pending change orders
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Linked Costs</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900 mt-2">
                      {formatCurrency(projectStats.changeOrderLinkedCosts)}
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      {projectStats.allocationsWithChangeOrdersCount} cost allocations
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="change-orders">
          <ChangeOrdersTable projectId={projectId} showProjectColumn={false} />
        </TabsContent>

        <TabsContent value="cost-allocations">
          <CostAllocationsTable 
            filters={{ projectId: projectId }}
          />
        </TabsContent>

        <TabsContent value="budget-history">
          <BudgetHistoryView projectId={projectId} showProjectColumn={false} />
        </TabsContent>
      </Tabs>
    </div>
  );
}