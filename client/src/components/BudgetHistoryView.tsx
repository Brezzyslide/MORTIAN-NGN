import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { History, TrendingUp, DollarSign, Calendar, User, FileText, Layers, AlertTriangle } from "lucide-react";

interface BudgetHistoryItem {
  id: string;
  type: 'initial' | 'amendment' | 'change_order';
  projectId: string;
  projectTitle: string;
  amount: string;
  description: string;
  proposedBy?: string;
  proposedByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  status: string;
  createdAt: string;
  approvedAt?: string;
  runningTotal: number;
}

interface BudgetHistoryViewProps {
  projectId?: string; // Optional filter for specific project
  showProjectColumn?: boolean; // Show project column when viewing all projects
}

export default function BudgetHistoryView({ 
  projectId, 
  showProjectColumn = true 
}: BudgetHistoryViewProps) {
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Since we don't have a dedicated budget history endpoint, 
  // we'll fetch budget amendments and change orders separately and combine them
  const { data: budgetAmendments, isLoading: amendmentsLoading } = useQuery({
    queryKey: ["/api/budget-amendments", projectId ? { projectId } : {}],
    retry: false,
  });

  const { data: changeOrders, isLoading: changeOrdersLoading } = useQuery({
    queryKey: ["/api/change-orders", projectId ? { projectId } : {}],
    retry: false,
  });

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
    retry: false,
  });

  const isLoading = amendmentsLoading || changeOrdersLoading || projectsLoading;

  // Combine and process budget history data
  const budgetHistory = useMemo(() => {
    if (!budgetAmendments || !changeOrders || !projects) return [];

    const historyItems: BudgetHistoryItem[] = [];
    const projectMap = new Map(projects.map((p: any) => [p.id, p]));

    // Add initial budget entries for projects
    if (!projectId) {
      projects.forEach((project: any) => {
        historyItems.push({
          id: `initial-${project.id}`,
          type: 'initial',
          projectId: project.id,
          projectTitle: project.title,
          amount: project.budget,
          description: `Initial project budget`,
          status: 'approved',
          createdAt: project.createdAt,
          runningTotal: parseFloat(project.budget),
        });
      });
    } else {
      const project = projectMap.get(projectId);
      if (project) {
        historyItems.push({
          id: `initial-${project.id}`,
          type: 'initial',
          projectId: project.id,
          projectTitle: project.title,
          amount: project.budget,
          description: `Initial project budget`,
          status: 'approved',
          createdAt: project.createdAt,
          runningTotal: parseFloat(project.budget),
        });
      }
    }

    // Add budget amendments
    budgetAmendments.forEach((amendment: any) => {
      const project = projectMap.get(amendment.projectId);
      if (project) {
        historyItems.push({
          id: amendment.id,
          type: 'amendment',
          projectId: amendment.projectId,
          projectTitle: project.title,
          amount: amendment.amountAdded,
          description: amendment.reason,
          proposedBy: amendment.proposedBy,
          proposedByName: amendment.proposedByName,
          approvedBy: amendment.approvedBy,
          approvedByName: amendment.approvedByName,
          status: amendment.status,
          createdAt: amendment.createdAt,
          approvedAt: amendment.approvedAt,
          runningTotal: 0, // Will be calculated below
        });
      }
    });

    // Add change orders with cost impact
    changeOrders.forEach((changeOrder: any) => {
      const project = projectMap.get(changeOrder.projectId);
      if (project && parseFloat(changeOrder.costImpact) !== 0) {
        historyItems.push({
          id: changeOrder.id,
          type: 'change_order',
          projectId: changeOrder.projectId,
          projectTitle: project.title,
          amount: changeOrder.costImpact,
          description: changeOrder.description,
          proposedBy: changeOrder.proposedBy,
          proposedByName: changeOrder.proposedByName,
          approvedBy: changeOrder.approvedBy,
          approvedByName: changeOrder.approvedByName,
          status: changeOrder.status,
          createdAt: changeOrder.createdAt,
          approvedAt: changeOrder.approvedAt,
          runningTotal: 0, // Will be calculated below
        });
      }
    });

    // Sort by creation date and calculate running totals
    historyItems.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Calculate running totals by project
    const projectTotals = new Map<string, number>();
    
    historyItems.forEach(item => {
      if (item.type === 'initial') {
        projectTotals.set(item.projectId, parseFloat(item.amount));
        item.runningTotal = parseFloat(item.amount);
      } else if (item.status === 'approved') {
        const currentTotal = projectTotals.get(item.projectId) || 0;
        const newTotal = currentTotal + parseFloat(item.amount);
        projectTotals.set(item.projectId, newTotal);
        item.runningTotal = newTotal;
      } else {
        // For non-approved items, use the current project total
        item.runningTotal = projectTotals.get(item.projectId) || 0;
      }
    });

    return historyItems;
  }, [budgetAmendments, changeOrders, projects, projectId]);

  // Apply filters
  const filteredHistory = useMemo(() => {
    let filtered = budgetHistory;

    if (typeFilter) {
      filtered = filtered.filter(item => item.type === typeFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    return filtered;
  }, [budgetHistory, typeFilter, statusFilter]);

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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'initial':
        return <DollarSign className="h-4 w-4 text-blue-600" />;
      case 'amendment':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'change_order':
        return <Layers className="h-4 w-4 text-purple-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'initial':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Initial Budget</Badge>;
      case 'amendment':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Amendment</Badge>;
      case 'change_order':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">Change Order</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Draft</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getAmountDisplay = (item: BudgetHistoryItem) => {
    const amount = parseFloat(item.amount);
    if (item.type === 'initial') {
      return <span className="font-semibold text-blue-600">{formatCurrency(amount)}</span>;
    }
    
    const isIncrease = amount > 0;
    return (
      <span className={`font-semibold ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
        {isIncrease ? '+' : ''}{formatCurrency(amount)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="h-5 w-5 text-gray-600" />
            <span>Budget History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Loading budget history...</span>
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
            <History className="h-5 w-5 text-gray-600" />
            <span>Budget History</span>
            {filteredHistory.length > 0 && (
              <Badge variant="outline">
                {filteredHistory.length} {filteredHistory.length === 1 ? 'Entry' : 'Entries'}
              </Badge>
            )}
          </div>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {projectId ? "Budget change timeline for this project" : "Chronological budget changes across all projects"}
        </p>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex items-center space-x-4 mb-6">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48" data-testid="select-type-filter">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              <SelectItem value="initial">Initial Budget</SelectItem>
              <SelectItem value="amendment">Budget Amendments</SelectItem>
              <SelectItem value="change_order">Change Orders</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48" data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Timeline */}
        {filteredHistory.length === 0 ? (
          <div className="text-center py-12">
            <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {typeFilter || statusFilter ? "No budget history matches your filters" : "No budget history found"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map((item, index) => (
              <div 
                key={item.id} 
                className="relative pl-8 pb-6 border-l-2 border-gray-200 last:border-l-0 last:pb-0"
                data-testid={`history-item-${item.id}`}
              >
                {/* Timeline dot */}
                <div className="absolute left-0 top-0 -translate-x-1/2 flex items-center justify-center w-8 h-8 bg-white border-2 border-gray-300 rounded-full">
                  {getTypeIcon(item.type)}
                </div>

                {/* Content */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getTypeBadge(item.type)}
                      {getStatusBadge(item.status)}
                      {showProjectColumn && (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700">
                          {item.projectTitle}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </div>
                      {item.approvedAt && item.status === 'approved' && (
                        <div className="text-xs text-green-600">
                          Approved: {formatDate(item.approvedAt)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <div className="text-lg">{getAmountDisplay(item)}</div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Running Total</p>
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(item.runningTotal)}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {item.type === 'initial' ? 'Project Manager' : 'Proposed By'}
                      </p>
                      <div className="flex items-center space-x-2">
                        <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-3 w-3 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium">
                          {item.proposedByName || 'System'}
                        </span>
                      </div>
                      {item.approvedByName && item.status === 'approved' && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Approved by: {item.approvedByName}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="text-sm mt-1">{item.description}</p>
                  </div>

                  {item.status === 'rejected' && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                      <div className="flex items-center space-x-2 text-red-700">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">Rejected</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}