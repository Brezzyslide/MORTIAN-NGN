import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useLocation } from "wouter";
import { Edit, DollarSign } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProjectsListProps {
  onEditProject?: (project: any) => void;
}

export default function ProjectsList({ onEditProject }: ProjectsListProps = {}) {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { permissions, normalizedRole, isAdmin, isTeamLeader } = usePermissions();
  const [, setLocation] = useLocation();
  const tenantId = user?.tenantId || user?.companyId;
  
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectAssignments, setProjectAssignments] = useState<Record<string, any[]>>({});
  const [editBudgetProject, setEditBudgetProject] = useState<any | null>(null);
  const [newBudget, setNewBudget] = useState<string>("");
  const [isUpdatingBudget, setIsUpdatingBudget] = useState(false);

  // Direct fetch to bypass React Query issues
  useEffect(() => {
    if (tenantId && isAuthenticated && !authLoading) {
      setIsLoading(true);
      setError(null);
      
      console.log("Fetching projects directly...");
      fetch('/api/projects', { credentials: 'include' })
        .then(async (res) => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        })
        .then((data) => {
          console.log("Direct fetch success:", data);
          setProjects(data || []);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Direct fetch error:", err);
          setError(err.message);
          setIsLoading(false);
          
          if (err.message.includes('401')) {
            toast({
              title: "Unauthorized", 
              description: "You are logged out. Logging in again...",
              variant: "destructive",
            });
            setTimeout(() => {
              window.location.href = "/api/login";
            }, 500);
          } else if (err.message.includes('403')) {
            toast({
              title: "Access Denied", 
              description: "You don't have permission to view projects.",
              variant: "destructive",
            });
          }
        });
    }
  }, [tenantId, isAuthenticated, authLoading, toast]);

  // Fetch team leaders for each project
  useEffect(() => {
    if (projects.length > 0) {
      projects.forEach((project) => {
        fetch(`/api/projects/${project.id}/team-leaders`, { credentials: 'include' })
          .then(async (res) => {
            if (res.ok) {
              return res.json();
            }
            return [];
          })
          .then((teamLeaders) => {
            setProjectAssignments((prev) => ({
              ...prev,
              [project.id]: teamLeaders || [],
            }));
          })
          .catch((err) => {
            console.error(`Error fetching team leaders for project ${project.id}:`, err);
          });
      });
    }
  }, [projects]);

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

  const handleProjectClick = (projectId: string) => {
    setLocation(`/projects/${projectId}`);
  };

  const handleEditBudgetClick = (project: any) => {
    setEditBudgetProject(project);
    setNewBudget(project.budget);
  };

  const handleUpdateBudget = async () => {
    if (!editBudgetProject || !newBudget) return;
    
    setIsUpdatingBudget(true);
    try {
      const response = await fetch(`/api/projects/${editBudgetProject.id}/budget`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ budget: newBudget }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update budget');
      }

      const updatedProject = await response.json();
      
      // Update local state
      setProjects(prev => prev.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      ));

      toast({
        title: "Success",
        description: "Project budget updated successfully",
      });

      setEditBudgetProject(null);
      setNewBudget("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update budget",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingBudget(false);
    }
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
            {isAdmin || permissions.canCreateProjects() ? (
              <>
                <p>No projects found</p>
                <p className="text-sm mt-1">Create your first project to get started</p>
              </>
            ) : isTeamLeader ? (
              <>
                <p>No assigned projects</p>
                <p className="text-sm mt-1">You haven't been assigned to any projects yet</p>
              </>
            ) : (
              <>
                <p>No accessible projects</p>
                <p className="text-sm mt-1">You don't have access to any projects or haven't been involved in any project activities</p>
              </>
            )}
          </div>
        ) : (
          (projects as any[]).slice(0, 3).map((project: any) => {
            const progress = calculateProgress(project.startDate, project.endDate);
            const duration = calculateDaysDifference(project.startDate, project.endDate);
            const overdue = isOverdue(project.endDate);
            
            return (
              <div 
                key={project.id} 
                className="p-6 hover:bg-accent/50 transition-colors" 
                data-testid={`project-card-${project.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 cursor-pointer" onClick={() => handleProjectClick(project.id)}>
                    <div className="flex items-center gap-3 justify-between">
                      <h4 className="font-semibold text-foreground" data-testid={`text-project-title-${project.id}`}>
                        {project.title}
                      </h4>
                      {isAdmin && (
                        <div className="flex gap-2">
                          {onEditProject && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditProject(project);
                              }}
                              data-testid={`button-edit-project-${project.id}`}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditBudgetClick(project);
                            }}
                            data-testid={`button-edit-budget-${project.id}`}
                          >
                            <span className="mr-1 font-semibold">₦</span>
                            Budget
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1" data-testid={`text-project-description-${project.id}`}>
                      {project.description || "No description available"}
                    </p>
                    {projectAssignments[project.id] && projectAssignments[project.id].length > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="font-medium">Team Leaders:</span>
                        <span data-testid={`text-team-leaders-${project.id}`}>
                          {projectAssignments[project.id].map((tl: any) => `${tl.firstName} ${tl.lastName}`).join(', ')}
                        </span>
                      </div>
                    )}
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
      
      {/* Budget Edit Dialog */}
      <Dialog open={!!editBudgetProject} onOpenChange={(open) => !open && setEditBudgetProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project Budget</DialogTitle>
            <DialogDescription>
              Update the budget for {editBudgetProject?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="budget">New Budget (₦)</Label>
              <Input
                id="budget"
                type="number"
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
                placeholder="Enter new budget amount"
                data-testid="input-new-budget"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditBudgetProject(null)}
                disabled={isUpdatingBudget}
                data-testid="button-cancel-budget"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateBudget}
                disabled={isUpdatingBudget || !newBudget}
                data-testid="button-save-budget"
              >
                {isUpdatingBudget ? "Updating..." : "Update Budget"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
