import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { AuditLog as AuditLogType } from "@shared/schema";

export default function AuditLog() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: auditLogs, isLoading, error } = useQuery<AuditLogType[]>({
    queryKey: ["/api/audit-logs"],
    retry: false,
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

  const formatTimestamp = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return '-';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(numAmount);
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      project_created: 'Project Creation',
      project_updated: 'Project Update',
      fund_allocated: 'Fund Allocation',
      expense_submitted: 'Expense Submission',
      fund_transferred: 'Fund Transfer',
      user_created: 'User Creation',
      user_updated: 'User Update',
      revenue_added: 'Revenue Addition'
    };
    return labels[action] || action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusBadge = (action: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      project_created: { color: 'bg-blue-100 text-blue-800', label: 'Active' },
      project_updated: { color: 'bg-blue-100 text-blue-800', label: 'Updated' },
      fund_allocated: { color: 'bg-green-100 text-green-800', label: 'Approved' },
      expense_submitted: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      fund_transferred: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      user_created: { color: 'bg-purple-100 text-purple-800', label: 'Active' },
      user_updated: { color: 'bg-purple-100 text-purple-800', label: 'Updated' },
      revenue_added: { color: 'bg-green-100 text-green-800', label: 'Completed' }
    };

    const config = statusConfig[action] || { color: 'bg-gray-100 text-gray-800', label: 'Unknown' };
    return config;
  };

  const getUserInitials = (details: any) => {
    if (details?.fromUser || details?.toUser) {
      return 'TF'; // Transfer
    }
    if (details?.category) {
      return 'FA'; // Fund Allocation
    }
    return 'SJ'; // Default
  };

  const getUserColor = (action: string) => {
    const colors: Record<string, string> = {
      project_created: 'bg-blue-500',
      project_updated: 'bg-blue-500',
      fund_allocated: 'bg-primary',
      expense_submitted: 'bg-orange-500',
      fund_transferred: 'bg-green-500',
      user_created: 'bg-purple-500',
      user_updated: 'bg-purple-500',
      revenue_added: 'bg-green-500'
    };
    return colors[action] || 'bg-gray-500';
  };

  const getProjectTitle = (details: any) => {
    if (details?.title) return details.title;
    if (details?.projectName) return details.projectName;
    return 'Unknown Project';
  };

  const filteredLogs = auditLogs?.filter((log: any) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      getActionLabel(log.action).toLowerCase().includes(searchLower) ||
      log.entityType.toLowerCase().includes(searchLower) ||
      getProjectTitle(log.details).toLowerCase().includes(searchLower)
    );
  }) || [];

  if (isLoading) {
    return (
      <Card className="card-shadow border border-border">
        <div className="p-6 border-b border-border">
          <div className="h-6 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-muted rounded w-80"></div>
        </div>
        <div className="overflow-x-auto">
          <div className="w-full">
            <div className="bg-accent/50 border-b border-border p-4">
              <div className="grid grid-cols-6 gap-4">
                {['Timestamp', 'User', 'Action', 'Project', 'Amount', 'Status'].map((header) => (
                  <div key={header} className="h-4 bg-muted rounded"></div>
                ))}
              </div>
            </div>
            <div className="divide-y divide-border">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-4 animate-pulse">
                  <div className="grid grid-cols-6 gap-4">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="card-shadow border border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Audit Log</h3>
          <div className="flex items-center space-x-2">
            <Input
              type="search"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
              data-testid="input-search-logs"
            />
            <Button
              variant="outline"
              size="icon"
              data-testid="button-filter-logs"
            >
              <i className="fas fa-filter text-muted-foreground"></i>
            </Button>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-accent/50 border-b border-border">
            <tr>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Timestamp</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">User</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Action</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Project</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Amount</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {!filteredLogs || filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  <div className="mb-4">
                    <i className="fas fa-clipboard-list text-4xl opacity-50"></i>
                  </div>
                  <p>No audit logs found</p>
                  <p className="text-sm mt-1">System activities will appear here</p>
                </td>
              </tr>
            ) : (
              filteredLogs.map((log: any) => {
                const statusBadge = getStatusBadge(log.action);
                const userColor = getUserColor(log.action);
                const userInitials = getUserInitials(log.details);
                
                return (
                  <tr key={log.id} className="hover:bg-accent/30 transition-colors" data-testid={`audit-log-${log.id}`}>
                    <td className="p-4 text-sm" data-testid={`text-log-timestamp-${log.id}`}>
                      {formatTimestamp(log.createdAt)}
                    </td>
                    <td className="p-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <div className={`w-6 h-6 ${userColor} rounded-full flex items-center justify-center`}>
                          <span className="text-xs text-white" data-testid={`text-log-user-initials-${log.id}`}>
                            {userInitials}
                          </span>
                        </div>
                        <span data-testid={`text-log-user-${log.id}`}>System User</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm" data-testid={`text-log-action-${log.id}`}>
                      {getActionLabel(log.action)}
                    </td>
                    <td className="p-4 text-sm" data-testid={`text-log-project-${log.id}`}>
                      {getProjectTitle(log.details)}
                    </td>
                    <td className="p-4 text-sm font-medium" data-testid={`text-log-amount-${log.id}`}>
                      {formatCurrency(log.amount)}
                    </td>
                    <td className="p-4 text-sm">
                      <span 
                        className={`px-2 py-1 ${statusBadge.color} rounded-full text-xs`}
                        data-testid={`text-log-status-${log.id}`}
                      >
                        {statusBadge.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {filteredLogs && filteredLogs.length > 0 && (
        <div className="p-4 border-t border-border flex items-center justify-between">
          <div className="text-sm text-muted-foreground" data-testid="text-log-pagination-info">
            Showing 1-{Math.min(filteredLogs.length, 10)} of {filteredLogs.length} entries
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={true}
              data-testid="button-log-prev"
            >
              <i className="fas fa-chevron-left text-xs"></i>
            </Button>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground"
              data-testid="button-log-page-1"
            >
              1
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={filteredLogs.length <= 10}
              data-testid="button-log-page-2"
            >
              2
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={filteredLogs.length <= 10}
              data-testid="button-log-page-3"
            >
              3
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={filteredLogs.length <= 10}
              data-testid="button-log-next"
            >
              <i className="fas fa-chevron-right text-xs"></i>
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
