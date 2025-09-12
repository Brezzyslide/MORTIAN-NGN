import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { Transaction } from "@shared/schema";

export default function TransactionsList() {
  const { toast } = useToast();

  const { data: transactions, isLoading, error } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
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

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(numAmount);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Less than 1 hour ago";
    if (diffInHours === 1) return "1 hour ago";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "1 day ago";
    return `${diffInDays} days ago`;
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'allocation':
        return { icon: 'fa-arrow-down', bgColor: 'bg-green-100', iconColor: 'text-green-600' };
      case 'expense':
        return { icon: 'fa-arrow-up', bgColor: 'bg-red-100', iconColor: 'text-red-600' };
      case 'transfer':
        return { icon: 'fa-exchange-alt', bgColor: 'bg-blue-100', iconColor: 'text-blue-600' };
      case 'revenue':
        return { icon: 'fa-plus', bgColor: 'bg-green-100', iconColor: 'text-green-600' };
      default:
        return { icon: 'fa-circle', bgColor: 'bg-gray-100', iconColor: 'text-gray-600' };
    }
  };

  const getAmountColor = (type: string) => {
    switch (type) {
      case 'allocation':
      case 'revenue':
        return 'text-green-600';
      case 'expense':
        return 'text-red-600';
      default:
        return 'text-foreground';
    }
  };

  const getAmountPrefix = (type: string) => {
    switch (type) {
      case 'allocation':
      case 'revenue':
        return '+';
      case 'expense':
        return '-';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <Card className="card-shadow border border-border">
        <div className="p-6 border-b border-border">
          <div className="h-6 bg-muted rounded w-1/2 mb-2"></div>
        </div>
        <div className="divide-y divide-border max-h-80 overflow-y-auto">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-muted rounded-full w-8 h-8"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-32"></div>
                    <div className="h-3 bg-muted rounded w-24"></div>
                    <div className="h-3 bg-muted rounded w-20"></div>
                  </div>
                </div>
                <div className="h-4 bg-muted rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="card-shadow border border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent Transactions</h3>
          <Button variant="link" className="text-primary text-sm font-medium p-0" data-testid="button-view-all-transactions">
            View All
          </Button>
        </div>
      </div>
      <div className="divide-y divide-border max-h-80 overflow-y-auto">
        {!transactions || transactions.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <div className="mb-4">
              <i className="fas fa-receipt text-4xl opacity-50"></i>
            </div>
            <p>No transactions found</p>
            <p className="text-sm mt-1">Transactions will appear here once fund allocations are made</p>
          </div>
        ) : (
          transactions.slice(0, 4).map((transaction: any) => {
            const { icon, bgColor, iconColor } = getTransactionIcon(transaction.type);
            const amountColor = getAmountColor(transaction.type);
            const amountPrefix = getAmountPrefix(transaction.type);

            return (
              <div key={transaction.id} className="p-4 hover:bg-accent/50 transition-colors" data-testid={`transaction-item-${transaction.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 ${bgColor} rounded-full`}>
                      <i className={`fas ${icon} ${iconColor} text-xs`}></i>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm" data-testid={`text-transaction-description-${transaction.id}`}>
                        {transaction.description || `${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)} Transaction`}
                      </h4>
                      <p className="text-xs text-muted-foreground" data-testid={`text-transaction-category-${transaction.id}`}>
                        {transaction.category?.replace('_', ' ')?.replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`text-transaction-time-${transaction.id}`}>
                        {formatTimeAgo(transaction.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold text-sm ${amountColor}`} data-testid={`text-transaction-amount-${transaction.id}`}>
                      {amountPrefix}{formatCurrency(transaction.amount)}
                    </div>
                    {transaction.receiptUrl && (
                      <i className="fas fa-receipt text-muted-foreground text-xs ml-1" title="Receipt attached"></i>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
