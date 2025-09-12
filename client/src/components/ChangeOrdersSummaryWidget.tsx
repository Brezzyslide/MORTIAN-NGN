import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/hooks/usePermissions";
import { Layers, Clock, DollarSign, Building, ArrowRight, AlertTriangle, CheckCircle } from "lucide-react";

interface ChangeOrder {
  id: string;
  projectId: string;
  projectTitle: string;
  description: string;
  costImpact: string;
  proposedBy: string;
  proposedByName: string;
  status: string;
  createdAt: string;
}

interface ChangeOrdersSummaryWidgetProps {
  onViewAll?: () => void;
}

export default function ChangeOrdersSummaryWidget({ onViewAll }: ChangeOrdersSummaryWidgetProps) {
  const { data: allChangeOrders, isLoading } = useQuery<ChangeOrder[]>({
    queryKey: ["/api/change-orders"],
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  const recentChangeOrders = allChangeOrders?.slice(0, 4) || [];
  const pendingChangeOrders = allChangeOrders?.filter(order => 
    order.status === 'pending' || order.status === 'draft'
  ) || [];

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
      month: 'short',
      day: 'numeric',
    });
  };

  const getCostImpactDisplay = (amount: string) => {
    const numAmount = parseFloat(amount);
    if (numAmount === 0 || isNaN(numAmount)) {
      return (
        <span className="flex items-center text-gray-600 text-sm">
          <DollarSign className="h-3 w-3 mr-1" />
          No Impact
        </span>
      );
    }
    
    const isIncrease = numAmount > 0;
    return (
      <span className={`flex items-center text-sm ${isIncrease ? 'text-red-600' : 'text-green-600'}`}>
        <DollarSign className="h-3 w-3 mr-1" />
        {isIncrease ? '+' : ''}{formatCurrency(numAmount)}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-xs">Draft</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 text-xs">Rejected</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
  };

  const truncateDescription = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const totalCostImpact = recentChangeOrders
    .filter(order => order.status === 'approved')
    .reduce((sum, order) => sum + parseFloat(order.costImpact || '0'), 0);

  if (isLoading) {
    return (
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Layers className="h-5 w-5 text-purple-600" />
            <span>Recent Change Orders</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="h-5 w-5 text-purple-600" />
            <span>Recent Change Orders</span>
            {pendingChangeOrders.length > 0 && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                {pendingChangeOrders.length} Pending
              </Badge>
            )}
          </div>
          {recentChangeOrders.length > 3 && onViewAll && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onViewAll}
              className="text-purple-600 hover:text-purple-800"
              data-testid="button-view-all-change-orders"
            >
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Recent project scope changes and modifications
        </p>
      </CardHeader>
      <CardContent>
        {recentChangeOrders.length === 0 ? (
          <div className="text-center py-8">
            <Layers className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No change orders yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Project scope changes will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">Pending</span>
                </div>
                <p className="text-lg font-semibold text-purple-900 mt-1">
                  {pendingChangeOrders.length}
                </p>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Impact</span>
                </div>
                <p className={`text-lg font-semibold mt-1 ${totalCostImpact >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {totalCostImpact > 0 ? '+' : ''}{formatCurrency(totalCostImpact)}
                </p>
              </div>
            </div>

            {/* Change Order Items */}
            {recentChangeOrders.map((changeOrder: ChangeOrder) => (
              <div
                key={changeOrder.id}
                className="border rounded-lg p-4 space-y-3 hover:bg-muted/30 transition-colors"
                data-testid={`recent-change-order-${changeOrder.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{changeOrder.projectTitle}</span>
                    </div>
                    <div>
                      {getCostImpactDisplay(changeOrder.costImpact)}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {formatDate(changeOrder.createdAt)}
                      </span>
                    </div>
                    {getStatusBadge(changeOrder.status)}
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Proposed by</p>
                    <p className="text-sm font-medium">{changeOrder.proposedByName}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p className="text-sm line-clamp-2" title={changeOrder.description}>
                      {truncateDescription(changeOrder.description)}
                    </p>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center space-x-2">
                    {changeOrder.status === 'approved' && (
                      <>
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span className="text-xs text-green-600">Approved & Active</span>
                      </>
                    )}
                    {(changeOrder.status === 'pending' || changeOrder.status === 'draft') && (
                      <>
                        <AlertTriangle className="h-3 w-3 text-yellow-600" />
                        <span className="text-xs text-yellow-600">Awaiting Approval</span>
                      </>
                    )}
                    {changeOrder.status === 'rejected' && (
                      <>
                        <AlertTriangle className="h-3 w-3 text-red-600" />
                        <span className="text-xs text-red-600">Rejected</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Action Button */}
            {recentChangeOrders.length > 0 && onViewAll && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onViewAll}
                  className="w-full"
                  data-testid="button-manage-change-orders"
                >
                  Manage All Change Orders
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}