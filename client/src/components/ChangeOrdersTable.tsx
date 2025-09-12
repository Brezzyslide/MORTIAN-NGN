import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, Calendar, User, Building, Check, X, Clock, FileText, Layers, DollarSign, ArrowUpDown, Eye } from "lucide-react";

interface ChangeOrder {
  id: string;
  projectId: string;
  projectTitle: string;
  description: string;
  costImpact: string;
  proposedBy: string;
  proposedByName: string;
  status: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

interface ChangeOrdersTableProps {
  projectId?: string; // Optional filter for specific project
  showProjectColumn?: boolean; // Show project column when viewing all change orders
}

export default function ChangeOrdersTable({ 
  projectId, 
  showProjectColumn = true 
}: ChangeOrdersTableProps) {
  const { toast } = useToast();
  const { isAdmin } = usePermissions();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [rejectComments, setRejectComments] = useState("");
  const [selectedChangeOrderId, setSelectedChangeOrderId] = useState<string>("");
  const [viewDescriptionId, setViewDescriptionId] = useState<string>("");

  // Build query parameters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    
    if (projectId) {
      params.set("projectId", projectId);
    }
    
    if (statusFilter) {
      params.set("status", statusFilter);
    }
    
    return params.toString();
  }, [projectId, statusFilter]);

  const { data: changeOrders, isLoading, error } = useQuery<ChangeOrder[]>({
    queryKey: ["/api/change-orders", queryParams],
    retry: false,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-300" data-testid={`status-draft`}><FileText className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300" data-testid={`status-pending`}><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300" data-testid={`status-approved`}><Check className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300" data-testid={`status-rejected`}><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary" data-testid={`status-unknown`}>{status}</Badge>;
    }
  };

  const getCostImpactBadge = (amount: string) => {
    const numAmount = parseFloat(amount);
    if (numAmount === 0 || isNaN(numAmount)) {
      return (
        <span className="flex items-center text-gray-600">
          <DollarSign className="h-4 w-4 mr-1" />
          No Impact
        </span>
      );
    }
    
    const isIncrease = numAmount > 0;
    const isSignificant = Math.abs(numAmount) > 5000; // $5k threshold for significance
    
    return (
      <span className={`flex items-center ${isIncrease ? 'text-red-600' : 'text-green-600'}`}>
        <DollarSign className="h-4 w-4 mr-1" />
        {isIncrease ? '+' : ''}{formatCurrency(numAmount)}
        {isSignificant && (
          <Badge variant="outline" className="ml-2 text-xs border-orange-500 text-orange-700">
            Significant
          </Badge>
        )}
      </span>
    );
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 opacity-30" />;
    return sortDirection === "asc" ? (
      <ArrowUpDown className="h-4 w-4 rotate-180" />
    ) : (
      <ArrowUpDown className="h-4 w-4" />
    );
  };

  // Client-side filtering and sorting
  const filteredAndSortedChangeOrders = useMemo(() => {
    if (!changeOrders) return [];
    
    let filtered = changeOrders;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(changeOrder =>
        changeOrder.projectTitle.toLowerCase().includes(query) ||
        changeOrder.description.toLowerCase().includes(query) ||
        changeOrder.proposedByName.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    return [...filtered].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case "createdAt":
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case "costImpact":
          aValue = parseFloat(a.costImpact);
          bValue = parseFloat(b.costImpact);
          break;
        case "projectTitle":
          aValue = a.projectTitle.toLowerCase();
          bValue = b.projectTitle.toLowerCase();
          break;
        case "proposedByName":
          aValue = a.proposedByName.toLowerCase();
          bValue = b.proposedByName.toLowerCase();
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a[sortField as keyof ChangeOrder];
          bValue = b[sortField as keyof ChangeOrder];
      }
      
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [changeOrders, searchQuery, sortField, sortDirection]);

  // Approve mutation
  const approveChangeOrder = useMutation({
    mutationFn: async (changeOrderId: string) => {
      const response = await apiRequest("PATCH", `/api/change-orders/${changeOrderId}/status`, {
        status: "approved"
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Change order approved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/change-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve change order",
        variant: "destructive",
      });
    },
  });

  // Reject mutation
  const rejectChangeOrder = useMutation({
    mutationFn: async ({ changeOrderId, comments }: { changeOrderId: string; comments: string }) => {
      const response = await apiRequest("PATCH", `/api/change-orders/${changeOrderId}/status`, {
        status: "rejected",
        comments
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Change order rejected successfully",
      });
      setRejectComments("");
      setSelectedChangeOrderId("");
      queryClient.invalidateQueries({ queryKey: ["/api/change-orders"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject change order",
        variant: "destructive",
      });
    },
  });

  const truncateDescription = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Layers className="h-5 w-5 text-purple-600" />
            <span>Change Orders</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Loading change orders...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const orders = filteredAndSortedChangeOrders || [];

  return (
    <>
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="h-5 w-5 text-purple-600" />
              <span>Change Orders</span>
              {orders.length > 0 && (
                <Badge variant="outline">
                  {orders.length}
                </Badge>
              )}
            </div>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {projectId ? "Change orders for this project" : "Manage project scope change orders"}
          </p>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1 max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search change orders..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-change-orders"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || statusFilter ? "No change orders match your filters" : "No change orders found"}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {showProjectColumn && (
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50" 
                        onClick={() => handleSort("projectTitle")}
                        data-testid="header-project"
                      >
                        <div className="flex items-center space-x-1">
                          <Building className="h-4 w-4" />
                          <span>Project</span>
                          {getSortIcon("projectTitle")}
                        </div>
                      </TableHead>
                    )}
                    <TableHead data-testid="header-description">Description</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50" 
                      onClick={() => handleSort("costImpact")}
                      data-testid="header-cost-impact"
                    >
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-4 w-4" />
                        <span>Cost Impact</span>
                        {getSortIcon("costImpact")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50" 
                      onClick={() => handleSort("proposedByName")}
                      data-testid="header-proposed-by"
                    >
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>Proposed By</span>
                        {getSortIcon("proposedByName")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50" 
                      onClick={() => handleSort("status")}
                      data-testid="header-status"
                    >
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>Status</span>
                        {getSortIcon("status")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50" 
                      onClick={() => handleSort("createdAt")}
                      data-testid="header-date"
                    >
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Created</span>
                        {getSortIcon("createdAt")}
                      </div>
                    </TableHead>
                    {isAdmin && <TableHead data-testid="header-actions">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((changeOrder: ChangeOrder) => (
                    <TableRow 
                      key={changeOrder.id} 
                      className="hover:bg-muted/30"
                      data-testid={`change-order-row-${changeOrder.id}`}
                    >
                      {showProjectColumn && (
                        <TableCell>
                          <div className="font-medium">{changeOrder.projectTitle}</div>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="text-sm line-clamp-2">
                            {truncateDescription(changeOrder.description)}
                          </p>
                          {changeOrder.description.length > 100 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 mt-1 text-blue-600 hover:text-blue-800"
                              onClick={() => setViewDescriptionId(changeOrder.id)}
                              data-testid={`button-view-description-${changeOrder.id}`}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View Full
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getCostImpactBadge(changeOrder.costImpact)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-purple-600" />
                          </div>
                          <span className="text-sm font-medium">{changeOrder.proposedByName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(changeOrder.status)}
                        {changeOrder.approvedByName && (
                          <div className="text-xs text-muted-foreground mt-1">
                            by {changeOrder.approvedByName}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(changeOrder.createdAt)}
                          {changeOrder.approvedAt && (
                            <div className="text-xs text-muted-foreground">
                              Approved: {formatDate(changeOrder.approvedAt)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          {(changeOrder.status === 'pending' || changeOrder.status === 'draft') && (
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                onClick={() => approveChangeOrder.mutate(changeOrder.id)}
                                disabled={approveChangeOrder.isPending}
                                className="bg-green-600 hover:bg-green-700 text-white"
                                data-testid={`button-approve-${changeOrder.id}`}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-300 text-red-600 hover:bg-red-50"
                                    onClick={() => setSelectedChangeOrderId(changeOrder.id)}
                                    data-testid={`button-reject-${changeOrder.id}`}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent data-testid={`dialog-reject-${changeOrder.id}`}>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Reject Change Order</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Please provide a reason for rejecting this change order proposal.
                                      <div className="mt-4 p-3 bg-gray-50 rounded">
                                        <p><strong>Project:</strong> {changeOrder.projectTitle}</p>
                                        <p><strong>Cost Impact:</strong> {formatCurrency(parseFloat(changeOrder.costImpact))}</p>
                                        <p><strong>Description:</strong> {changeOrder.description}</p>
                                      </div>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <div className="py-4">
                                    <Textarea
                                      placeholder="Enter rejection reason..."
                                      value={rejectComments}
                                      onChange={(e) => setRejectComments(e.target.value)}
                                      className="min-h-[100px]"
                                      data-testid={`textarea-reject-comments-${changeOrder.id}`}
                                    />
                                  </div>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel
                                      onClick={() => {
                                        setRejectComments("");
                                        setSelectedChangeOrderId("");
                                      }}
                                      data-testid={`button-cancel-reject-${changeOrder.id}`}
                                    >
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => rejectChangeOrder.mutate({ 
                                        changeOrderId: changeOrder.id, 
                                        comments: rejectComments 
                                      })}
                                      disabled={!rejectComments.trim() || rejectChangeOrder.isPending}
                                      className="bg-red-600 hover:bg-red-700"
                                      data-testid={`button-confirm-reject-${changeOrder.id}`}
                                    >
                                      {rejectChangeOrder.isPending ? "Rejecting..." : "Reject Change Order"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                          {changeOrder.status === 'approved' && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                              <Check className="h-3 w-3 mr-1" />
                              Approved
                            </Badge>
                          )}
                          {changeOrder.status === 'rejected' && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                              <X className="h-3 w-3 mr-1" />
                              Rejected
                            </Badge>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Full Description Dialog */}
      <AlertDialog open={!!viewDescriptionId} onOpenChange={(open) => !open && setViewDescriptionId("")}>
        <AlertDialogContent className="max-w-2xl" data-testid={`dialog-view-description-${viewDescriptionId}`}>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Order Description</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="py-4">
            <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap">
                {orders.find(order => order.id === viewDescriptionId)?.description}
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setViewDescriptionId("")}
              data-testid={`button-close-description-${viewDescriptionId}`}
            >
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}