import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Users, TrendingUp } from "lucide-react";

interface UserCosting {
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  transactionTotal: number;
  costAllocationTotal: number;
  totalSpending: number;
}

interface UserCostingsResponse {
  users: UserCosting[];
  grandTotal: number;
  userCount: number;
}

export default function UserCostingsReport() {
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery<UserCostingsResponse>({
    queryKey: ["/api/reports/user-costings"],
  });

  if (error) {
    toast({
      title: "Error",
      description: "Failed to load user costings report",
      variant: "destructive",
    });
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'team_leader':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-user-costings">User Costings Report</h1>
          <p className="text-muted-foreground mt-1">
            Overview of all user spending across the tenant
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-user-count">
                  {data?.userCount || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Grand Total Spending</p>
                <p className="text-2xl font-bold mt-1 text-orange-600" data-testid="text-grand-total">
                  {formatCurrency(data?.grandTotal || 0)}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Spending Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Transaction Expenses</TableHead>
                <TableHead className="text-right">Cost Allocations</TableHead>
                <TableHead className="text-right">Total Spending</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.users && data.users.length > 0 ? (
                data.users.map((user) => (
                  <TableRow key={user.userId} data-testid={`row-user-${user.userId}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium" data-testid={`text-username-${user.userId}`}>
                          {user.userName}
                        </p>
                        <p className="text-sm text-muted-foreground">{user.userEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                        {user.role === 'team_leader' ? 'Team Leader' : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-transactions-${user.userId}`}>
                      {formatCurrency(user.transactionTotal)}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-costings-${user.userId}`}>
                      {formatCurrency(user.costAllocationTotal)}
                    </TableCell>
                    <TableCell className="text-right font-semibold" data-testid={`text-total-${user.userId}`}>
                      {formatCurrency(user.totalSpending)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              )}
              
              {/* Grand Total Row */}
              {data?.users && data.users.length > 0 && (
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={4} className="text-right">
                    GRAND TOTAL
                  </TableCell>
                  <TableCell className="text-right text-lg" data-testid="text-grand-total-row">
                    {formatCurrency(data.grandTotal)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
