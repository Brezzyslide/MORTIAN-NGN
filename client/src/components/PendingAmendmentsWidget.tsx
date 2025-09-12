import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/hooks/usePermissions";
import { TrendingUp, AlertTriangle, Clock, DollarSign, Building, ArrowRight } from "lucide-react";

interface PendingAmendment {
  id: string;
  projectId: string;
  projectTitle: string;
  amountAdded: string;
  reason: string;
  proposedBy: string;
  proposedByName: string;
  status: string;
  createdAt: string;
}

interface PendingAmendmentsWidgetProps {
  onViewAll?: () => void;
}

export default function PendingAmendmentsWidget({ onViewAll }: PendingAmendmentsWidgetProps) {
  const { isAdmin, isTeamLeader } = usePermissions();

  // Only show for managers who can approve amendments
  if (!isAdmin) {
    return null;
  }

  const { data: allAmendments, isLoading } = useQuery<PendingAmendment[]>({
    queryKey: ["/api/budget-amendments"],
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  const pendingAmendments = allAmendments?.filter(amendment => 
    amendment.status === 'pending' || amendment.status === 'draft'
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

  const getAmountBadge = (amount: string) => {
    const numAmount = parseFloat(amount);
    const isIncrease = numAmount > 0;
    const isSignificant = Math.abs(numAmount) > 10000; // $10k threshold for significance
    
    return (
      <div className={`flex items-center ${isIncrease ? 'text-red-600' : 'text-green-600'}`}>
        <TrendingUp className={`h-3 w-3 mr-1 ${isIncrease ? '' : 'rotate-180'}`} />
        <span className="text-sm font-medium">
          {isIncrease ? '+' : ''}{formatCurrency(numAmount)}
        </span>
        {isSignificant && (
          <Badge variant="outline" className="ml-1 text-xs border-orange-500 text-orange-700 px-1 py-0">
            High
          </Badge>
        )}
      </div>
    );
  };

  const totalPendingAmount = pendingAmendments.reduce((sum, amendment) => 
    sum + parseFloat(amendment.amountAdded), 0
  );

  if (isLoading) {
    return (
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span>Pending Amendments</span>
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
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span>Pending Amendments</span>
            {pendingAmendments.length > 0 && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                {pendingAmendments.length}
              </Badge>
            )}
          </div>
          {pendingAmendments.length > 3 && onViewAll && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onViewAll}
              className="text-blue-600 hover:text-blue-800"
              data-testid="button-view-all-amendments"
            >
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Budget amendments requiring your approval
        </p>
      </CardHeader>
      <CardContent>
        {pendingAmendments.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No pending amendments at this time
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Card */}
            {pendingAmendments.length > 1 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">
                      {pendingAmendments.length} amendments pending
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-yellow-700">Total Impact</p>
                    <p className={`font-semibold ${totalPendingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {totalPendingAmount > 0 ? '+' : ''}{formatCurrency(totalPendingAmount)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Amendment Items */}
            {pendingAmendments.slice(0, 3).map((amendment: PendingAmendment) => (
              <div
                key={amendment.id}
                className="border rounded-lg p-4 space-y-3 hover:bg-muted/30 transition-colors"
                data-testid={`pending-amendment-${amendment.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{amendment.projectTitle}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getAmountBadge(amendment.amountAdded)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {formatDate(amendment.createdAt)}
                      </span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={amendment.status === 'pending' 
                        ? "bg-yellow-50 text-yellow-700 border-yellow-300" 
                        : "bg-gray-50 text-gray-600 border-gray-300"
                      }
                    >
                      {amendment.status === 'pending' ? 'Pending' : 'Draft'}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Proposed by</p>
                    <p className="text-sm font-medium">{amendment.proposedByName}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground">Reason</p>
                    <p className="text-sm line-clamp-2" title={amendment.reason}>
                      {amendment.reason}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Action Button */}
            {pendingAmendments.length > 0 && onViewAll && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onViewAll}
                  className="w-full"
                  data-testid="button-manage-amendments"
                >
                  Manage All Amendments
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