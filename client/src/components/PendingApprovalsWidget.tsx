import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { Check, X, Clock, FileText, AlertCircle, User, Building, Calendar } from "lucide-react";

interface PendingApproval {
  id: string;
  recordId: string;
  recordType: string;
  status: string;
  submittedAt: string;
  submittedBy: string;
  submittedByName: string;
  // Cost allocation specific fields
  projectTitle?: string;
  lineItemName?: string;
  lineItemCategory?: string;
  totalCost?: string;
  labourCost?: string;
  materialCost?: string;
  dateIncurred?: string;
}

export default function PendingApprovalsWidget() {
  const { toast } = useToast();
  const { isAdmin, isTeamLeader } = usePermissions();
  const [rejectComments, setRejectComments] = useState("");
  const [selectedApprovalId, setSelectedApprovalId] = useState<string>("");

  // Only show this widget for managers/admins
  if (!isAdmin && !isTeamLeader) {
    return null;
  }

  const { data: pendingApprovals, isLoading } = useQuery<PendingApproval[]>({
    queryKey: ["/api/approvals"],
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  const approveAllocation = useMutation({
    mutationFn: async (recordId: string) => {
      const response = await apiRequest("POST", `/api/approvals/${recordId}/approve`, {});
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Cost allocation approved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cost-allocations-filtered"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve cost allocation",
        variant: "destructive",
      });
    },
  });

  const rejectAllocation = useMutation({
    mutationFn: async ({ recordId, comments }: { recordId: string; comments: string }) => {
      const response = await apiRequest("POST", `/api/approvals/${recordId}/reject`, { comments });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Cost allocation rejected successfully",
      });
      setRejectComments("");
      setSelectedApprovalId("");
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cost-allocations-filtered"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject cost allocation",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            <span>Pending Approvals</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Loading pending approvals...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const approvals = pendingApprovals || [];

  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            <span>Pending Approvals</span>
            {approvals.length > 0 && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                {approvals.length}
              </Badge>
            )}
          </div>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Cost allocations requiring your approval
        </p>
      </CardHeader>
      <CardContent>
        {approvals.length === 0 ? (
          <div className="text-center py-8">
            <Check className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No pending approvals at this time
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvals.map((approval: PendingApproval) => (
              <div
                key={approval.id}
                className="border rounded-lg p-4 space-y-3 hover:bg-muted/30 transition-colors"
                data-testid={`approval-item-${approval.recordId}`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{approval.lineItemName}</span>
                      <Badge variant="secondary" className="text-xs">
                        {approval.lineItemCategory?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {approval.projectTitle}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-lg">
                      {formatCurrency(approval.totalCost || 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Labour: {formatCurrency(approval.labourCost || 0)} | 
                      Materials: {formatCurrency(approval.materialCost || 0)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <User className="h-3 w-3" />
                      <span>Submitted by {approval.submittedByName}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(approval.submittedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => approveAllocation.mutate(approval.recordId)}
                    disabled={approveAllocation.isPending || rejectAllocation.isPending}
                    className="text-green-600 border-green-600 hover:bg-green-50"
                    data-testid={`button-approve-${approval.recordId}`}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Approve
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={approveAllocation.isPending || rejectAllocation.isPending}
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        data-testid={`button-reject-${approval.recordId}`}
                        onClick={() => setSelectedApprovalId(approval.recordId)}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reject Cost Allocation</AlertDialogTitle>
                        <AlertDialogDescription>
                          Please provide a reason for rejecting this cost allocation. The submitter will be notified with your comments.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="my-4">
                        <Textarea
                          placeholder="Enter rejection reason..."
                          value={rejectComments}
                          onChange={(e) => setRejectComments(e.target.value)}
                          className="min-h-[100px]"
                          data-testid="textarea-reject-comments"
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                          setRejectComments("");
                          setSelectedApprovalId("");
                        }}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => rejectAllocation.mutate({ 
                            recordId: selectedApprovalId, 
                            comments: rejectComments 
                          })}
                          disabled={!rejectComments.trim() || rejectAllocation.isPending}
                          className="bg-red-600 hover:bg-red-700"
                          data-testid="button-confirm-reject"
                        >
                          Reject with Comments
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}