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
import { Search, Download, ChevronUp, ChevronDown, Calendar, User, Building, Check, X, Clock, FileText, Layers, Filter } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface CostAllocation {
  id: string;
  projectId: string;
  lineItemId: string;
  labourCost: string;
  materialCost: string;
  quantity: string;
  unitCost: string;
  totalCost: string;
  dateIncurred: string;
  enteredBy: string;
  tenantId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lineItemName: string;
  lineItemCategory: string;
  projectTitle: string;
  enteredByName: string;
  changeOrderId?: string | null;
  changeOrderDescription?: string | null;
  materialAllocations: Array<{
    id: string;
    materialId: string;
    quantity: string;
    unitPrice: string;
    total: string;
    material: {
      name: string;
      unit: string;
      supplier: string;
    };
  }>;
}

interface CostAllocationsResponse {
  allocations: CostAllocation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CostAllocationsTableProps {
  filters?: {
    startDate?: Date;
    endDate?: Date;
    projectId?: string;
    changeOrderId?: string;
    categories?: string[];
  };
}

export default function CostAllocationsTable({ filters }: CostAllocationsTableProps) {
  const { toast } = useToast();
  const { permissions, isAdmin, isTeamLeader } = usePermissions();
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<string>("dateIncurred");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [rejectComments, setRejectComments] = useState("");
  const [changeOrderFilter, setChangeOrderFilter] = useState<string>("all");

  // Build query parameters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", currentPage.toString());
    params.set("limit", pageSize.toString());
    
    if (searchQuery.trim()) {
      params.set("search", searchQuery.trim());
    }
    
    if (filters?.startDate) {
      params.set("startDate", filters.startDate.toISOString());
    }
    
    if (filters?.endDate) {
      params.set("endDate", filters.endDate.toISOString());
    }
    
    if (filters?.projectId) {
      params.set("projectId", filters.projectId);
    }

    if (filters?.changeOrderId) {
      params.set("changeOrderId", filters.changeOrderId);
    }

    if (changeOrderFilter && changeOrderFilter !== "all") {
      if (changeOrderFilter === "linked") {
        params.set("hasChangeOrder", "true");
      } else if (changeOrderFilter === "unlinked") {
        params.set("hasChangeOrder", "false");
      }
    }
    
    if (filters?.categories && filters.categories.length > 0) {
      filters.categories.forEach(category => {
        params.append("categories", category);
      });
    }
    
    return params.toString();
  }, [currentPage, pageSize, searchQuery, filters, changeOrderFilter]);

  const { data: costAllocationsData, isLoading, error } = useQuery<CostAllocationsResponse>({
    queryKey: [`/api/cost-allocations-filtered?${queryParams}`],
    enabled: Boolean(tenantId),
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

  // Reset page when search query or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters, changeOrderFilter]);

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

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  // Client-side sorting for better UX (could be moved to server-side for large datasets)
  const sortedAllocations = useMemo(() => {
    if (!costAllocationsData?.allocations) return [];
    
    return [...costAllocationsData.allocations].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case "dateIncurred":
          aValue = new Date(a.dateIncurred);
          bValue = new Date(b.dateIncurred);
          break;
        case "totalCost":
          aValue = parseFloat(a.totalCost);
          bValue = parseFloat(b.totalCost);
          break;
        case "labourCost":
          aValue = parseFloat(a.labourCost);
          bValue = parseFloat(b.labourCost);
          break;
        case "materialCost":
          aValue = parseFloat(a.materialCost);
          bValue = parseFloat(b.materialCost);
          break;
        case "lineItemName":
          aValue = a.lineItemName.toLowerCase();
          bValue = b.lineItemName.toLowerCase();
          break;
        case "enteredByName":
          aValue = a.enteredByName.toLowerCase();
          bValue = b.enteredByName.toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [costAllocationsData?.allocations, sortField, sortDirection]);

  const exportToCSV = () => {
    if (!sortedAllocations || sortedAllocations.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no cost allocations to export.",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      "Project",
      "Line Item",
      "Category",
      "Labour Cost",
      "Material Cost",
      "Total Cost",
      "Date",
      "Entered By",
      "Change Order",
      "Materials Used"
    ];

    const csvData = sortedAllocations.map(allocation => [
      allocation.projectTitle,
      allocation.lineItemName,
      allocation.lineItemCategory,
      parseFloat(allocation.labourCost).toFixed(2),
      parseFloat(allocation.materialCost).toFixed(2),
      parseFloat(allocation.totalCost).toFixed(2),
      formatDate(allocation.dateIncurred),
      allocation.enteredByName,
      allocation.changeOrderDescription || "None",
      allocation.materialAllocations.map(m => 
        `${m.material.name} (${m.quantity} ${m.material.unit})`
      ).join('; ')
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cost-allocations-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: `Exported ${sortedAllocations.length} cost allocation records.`,
    });
  };

  // Approval mutations
  const approveAllocation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/approvals/${id}/approve`, {});
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Cost allocation approved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cost-allocations-filtered", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals", tenantId] });
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
    mutationFn: async ({ id, comments }: { id: string; comments: string }) => {
      const response = await apiRequest("POST", `/api/approvals/${id}/reject`, { comments });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Cost allocation rejected successfully",
      });
      setRejectComments("");
      queryClient.invalidateQueries({ queryKey: ["/api/cost-allocations-filtered", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals", tenantId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject cost allocation",
        variant: "destructive",
      });
    },
  });

  const submitForApproval = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/cost-allocations/${id}/submit`, {});
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Cost allocation submitted for approval",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cost-allocations-filtered", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals", tenantId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit cost allocation for approval",
        variant: "destructive",
      });
    },
  });

  const renderPagination = () => {
    if (!costAllocationsData || costAllocationsData.totalPages <= 1) return null;

    const { page, totalPages } = costAllocationsData;
    const pages = [];
    
    // Show first, previous, current, next, last
    if (page > 1) {
      pages.push(
        <Button
          key="prev"
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(page - 1)}
          data-testid="button-prev-page"
        >
          Previous
        </Button>
      );
    }

    // Show page numbers
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          variant={i === page ? "default" : "outline"}
          size="sm"
          onClick={() => setCurrentPage(i)}
          data-testid={`button-page-${i}`}
        >
          {i}
        </Button>
      );
    }

    if (page < totalPages) {
      pages.push(
        <Button
          key="next"
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(page + 1)}
          data-testid="button-next-page"
        >
          Next
        </Button>
      );
    }

    return (
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, costAllocationsData.total)} of {costAllocationsData.total} entries
        </div>
        <div className="flex items-center space-x-2">
          {pages}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="card-shadow border border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Cost Allocations Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-10 bg-muted rounded w-full animate-pulse"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-shadow border border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <span>Cost Allocations Ledger</span>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={!sortedAllocations || sortedAllocations.length === 0}
              data-testid="button-export-csv"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Track all construction cost allocations with detailed breakdown
        </p>
      </CardHeader>
      <CardContent>
        {/* Search and Controls */}
        <div className="flex items-center justify-between mb-6 space-x-4">
          <div className="flex items-center space-x-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by line item, project, or change order..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-allocations"
              />
            </div>
            <Select
              value={changeOrderFilter}
              onValueChange={setChangeOrderFilter}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by change order..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All costs</SelectItem>
                <SelectItem value="linked">
                  <div className="flex items-center space-x-2">
                    <Layers className="h-4 w-4 text-blue-600" />
                    <span>Linked to change orders</span>
                  </div>
                </SelectItem>
                <SelectItem value="unlinked">
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <span>Not linked to change orders</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(parseInt(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 rows</SelectItem>
                <SelectItem value="25">25 rows</SelectItem>
                <SelectItem value="50">50 rows</SelectItem>
                <SelectItem value="100">100 rows</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("lineItemName")}
                  data-testid="header-line-item"
                >
                  <div className="flex items-center space-x-1">
                    <Building className="h-4 w-4" />
                    <span>Line Item</span>
                    {getSortIcon("lineItemName")}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("labourCost")}
                  data-testid="header-labour-cost"
                >
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>Labour Cost</span>
                    {getSortIcon("labourCost")}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("materialCost")}
                  data-testid="header-material-cost"
                >
                  <div className="flex items-center space-x-1">
                    <span>Material Cost</span>
                    {getSortIcon("materialCost")}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("totalCost")}
                  data-testid="header-total-cost"
                >
                  <div className="flex items-center space-x-1">
                    <span>Total</span>
                    {getSortIcon("totalCost")}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("dateIncurred")}
                  data-testid="header-date"
                >
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>Date</span>
                    {getSortIcon("dateIncurred")}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("enteredByName")}
                  data-testid="header-entered-by"
                >
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>Entered By</span>
                    {getSortIcon("enteredByName")}
                  </div>
                </TableHead>
                <TableHead>Change Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Materials</TableHead>
                {(isAdmin || isTeamLeader) && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAllocations && sortedAllocations.length > 0 ? (
                sortedAllocations.map((allocation) => (
                  <TableRow key={allocation.id} data-testid={`row-allocation-${allocation.id}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{allocation.lineItemName}</div>
                        <div className="text-xs text-muted-foreground">{allocation.projectTitle}</div>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {allocation.lineItemCategory.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">{formatCurrency(allocation.labourCost)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">{formatCurrency(allocation.materialCost)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-semibold">{formatCurrency(allocation.totalCost)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{formatDate(allocation.dateIncurred)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{allocation.enteredByName}</span>
                    </TableCell>
                    <TableCell>
                      {allocation.changeOrderId && allocation.changeOrderDescription ? (
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant="outline" 
                            className="bg-blue-50 text-blue-700 border-blue-300"
                            data-testid={`badge-change-order-${allocation.id}`}
                          >
                            <Layers className="h-3 w-3 mr-1" />
                            CO
                          </Badge>
                          <div className="text-xs text-muted-foreground max-w-32 truncate" title={allocation.changeOrderDescription}>
                            {allocation.changeOrderDescription}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(allocation.status)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {allocation.materialAllocations && allocation.materialAllocations.length > 0 ? (
                          allocation.materialAllocations.slice(0, 2).map((mat, index) => (
                            <div key={index} className="text-xs">
                              <span className="font-medium">{mat.material.name}</span>
                              <span className="text-muted-foreground ml-1">
                                ({mat.quantity} {mat.material.unit})
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No materials</span>
                        )}
                        {allocation.materialAllocations && allocation.materialAllocations.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{allocation.materialAllocations.length - 2} more
                          </div>
                        )}
                      </div>
                    </TableCell>
                    {(isAdmin || isTeamLeader) && (
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {allocation.status === 'draft' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => submitForApproval.mutate(allocation.id)}
                              disabled={submitForApproval.isPending}
                              data-testid={`button-submit-${allocation.id}`}
                            >
                              Submit
                            </Button>
                          )}
                          {allocation.status === 'pending' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => approveAllocation.mutate(allocation.id)}
                                disabled={approveAllocation.isPending}
                                className="text-green-600 border-green-600 hover:bg-green-50"
                                data-testid={`button-approve-${allocation.id}`}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={rejectAllocation.isPending}
                                    className="text-red-600 border-red-600 hover:bg-red-50"
                                    data-testid={`button-reject-${allocation.id}`}
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Reject
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Reject Cost Allocation</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Please provide a reason for rejecting this cost allocation. This will be recorded in the audit log.
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
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => rejectAllocation.mutate({ id: allocation.id, comments: rejectComments })}
                                      disabled={!rejectComments.trim() || rejectAllocation.isPending}
                                      className="bg-red-600 hover:bg-red-700"
                                      data-testid="button-confirm-reject"
                                    >
                                      Reject with Comments
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {searchQuery ? (
                        <div>
                          <p>No cost allocations found matching "{searchQuery}"</p>
                          <p className="text-sm mt-1">Try adjusting your search criteria</p>
                        </div>
                      ) : (
                        <div>
                          <p>No cost allocations found</p>
                          <p className="text-sm mt-1">Create cost allocations to track construction expenses</p>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {costAllocationsData && costAllocationsData.total > 0 && (
          <div className="mt-6 flex items-center justify-between">
            {renderPagination()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}