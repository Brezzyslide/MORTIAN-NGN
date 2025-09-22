import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function ProjectsList() {
  const { toast } = useToast();
  const { user } = useAuth();
  const tenantId = user?.tenantId || user?.companyId;

  const { data: projects = [] as any[], isLoading, error } = useQuery({
    queryKey: ["/api/projects", tenantId],
    enabled: Boolean(tenantId),
    retry: false,
  });

  // Handle errors in useEffect to prevent infinite loops
  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
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

  const calculateDaysDifference = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isOverdue = (endDate: string) => {
    return new Date(endDate) < new Date();
  };

  if (isLoading) {
    return (
      <Card className="card-shadow border border-border">
        <div className="p-6 border-b border-border">
          <div className="h-6 bg-muted rounded w-1/3 mb-2"></div>
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 animate-pulse">
              <div className="h-5 bg-muted rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-muted rounded w-full mb-3"></div>
              <div className="flex space-x-4">
                <div className="h-3 bg-muted rounded w-20"></div>
                <div className="h-3 bg-muted rounded w-20"></div>
                <div className="h-3 bg-muted rounded w-16"></div>
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
          <h3 className="text-lg font-semibold">Recent Projects</h3>
          <Button variant="link" className="text-primary text-sm font-medium p-0" data-testid="button-view-all-projects">
            View All
          </Button>
        </div>
      </div>
      <div className="divide-y divide-border">
        {(projects as any[]).length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <div className="mb-4">
              <i className="fas fa-folder-open text-4xl opacity-50"></i>
            </div>
            <p>No projects found</p>
            <p className="text-sm mt-1">Create your first project to get started</p>
          </div>
        ) : (
          (projects as any[]).slice(0, 3).map((project: any) => {
            const progress = calculateProgress(project.startDate, project.endDate);
            const duration = calculateDaysDifference(project.startDate, project.endDate);
            const overdue = isOverdue(project.endDate);
            
            return (
              <div key={project.id} className="p-6 hover:bg-accent/50 transition-colors" data-testid={`project-item-${project.id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground" data-testid={`text-project-title-${project.id}`}>
                      {project.title}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1" data-testid={`text-project-description-${project.id}`}>
                      {project.description || "No description available"}
                    </p>
                    <div className="flex items-center space-x-4 mt-3 text-sm text-muted-foreground">
                      <span data-testid={`text-project-start-${project.id}`}>
                        Start: {formatDate(project.startDate)}
                      </span>
                      <span data-testid={`text-project-end-${project.id}`}>
                        End: {formatDate(project.endDate)}
                      </span>
                      <span 
                        className={`px-2 py-1 rounded-full text-xs ${
                          overdue 
                            ? 'bg-red-100 text-red-600' 
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                        data-testid={`text-project-status-${project.id}`}
                      >
                        {overdue ? 'Overdue' : `${duration} days`}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold" data-testid={`text-project-budget-${project.id}`}>
                      {formatCurrency(project.budget)}
                    </div>
                    <div className="flex items-center mt-2">
                      <div className="w-20 bg-secondary rounded-full h-2 mr-2">
                        <div 
                          className={`h-2 rounded-full ${
                            overdue || progress >= 90 
                              ? 'danger-progress' 
                              : 'progress-bar'
                          }`} 
                          style={{ width: `${Math.min(progress, 100)}%` }}
                          data-testid={`progress-bar-${project.id}`}
                        ></div>
                      </div>
                      <span className={`text-sm ${
                        overdue || progress >= 90 
                          ? 'text-red-600 font-medium' 
                          : 'text-muted-foreground'
                      }`} data-testid={`text-project-progress-${project.id}`}>
                        {progress}%
                      </span>
                    </div>
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
