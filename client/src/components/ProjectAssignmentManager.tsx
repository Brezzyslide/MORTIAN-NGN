import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Users, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Project, User } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

const assignmentSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  userId: z.string().min(1, "Team leader is required"),
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

interface ProjectAssignment {
  id: string;
  projectId: string;
  userId: string;
  assignedBy: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  project: Project;
  user: User;
}

export default function ProjectAssignmentManager() {
  const { toast } = useToast();
  const { user } = useAuth();
  const tenantId = user?.tenantId;

  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      projectId: "",
      userId: "",
    },
  });

  // Fetch all projects
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    enabled: Boolean(tenantId),
    retry: false,
  });

  // Fetch all team leaders
  const { data: teamLeaders, isLoading: teamLeadersLoading } = useQuery<User[]>({
    queryKey: ['/api/users', 'team-leaders'],
    enabled: Boolean(tenantId),
    retry: false,
  });

  // Fetch all project assignments
  const { data: assignments, isLoading: assignmentsLoading } = useQuery<ProjectAssignment[]>({
    queryKey: ['/api/project-assignments'],
    enabled: Boolean(tenantId),
    retry: false,
  });

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async (data: AssignmentFormData) => {
      const response = await apiRequest("POST", "/api/project-assignments", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Team leader assigned to project successfully",
      });
      form.reset();
      // CRITICAL SECURITY: Invalidate all related cache keys for proper data consistency
      queryClient.invalidateQueries({ queryKey: ['/api/project-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] }); // May affect project assignment counts
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      // CRITICAL SECURITY: Log security-related errors for audit
      console.error('Project assignment creation failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign team leader to project",
        variant: "destructive",
      });
    },
  });

  // Remove assignment mutation
  const removeAssignmentMutation = useMutation({
    mutationFn: async ({ projectId, userId }: { projectId: string; userId: string }) => {
      const response = await apiRequest("DELETE", `/api/project-assignments/${projectId}/${userId}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Team leader removed from project successfully",
      });
      // CRITICAL SECURITY: Invalidate all related cache keys for proper data consistency
      queryClient.invalidateQueries({ queryKey: ['/api/project-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] }); // May affect project assignment counts
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      // CRITICAL SECURITY: Log security-related errors for audit
      console.error('Project assignment removal failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove team leader from project",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AssignmentFormData) => {
    createAssignmentMutation.mutate(data);
  };

  const handleRemoveAssignment = (projectId: string, userId: string) => {
    removeAssignmentMutation.mutate({ projectId, userId });
  };

  // Group assignments by project
  const assignmentsByProject = assignments?.reduce((acc, assignment) => {
    if (!acc[assignment.projectId]) {
      acc[assignment.projectId] = [];
    }
    acc[assignment.projectId].push(assignment);
    return acc;
  }, {} as Record<string, ProjectAssignment[]>) || {};

  return (
    <div className="space-y-6">
      <Card className="card-shadow border border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Project-Team Assignments
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Assign team leaders to specific projects to control fund allocation access
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        // CRITICAL SECURITY: Reset team leader selection when project changes
                        form.setValue('userId', '');
                      }} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-assignment-project">
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projectsLoading ? (
                            <div className="p-2 text-center text-muted-foreground" data-testid="loading-projects">Loading projects...</div>
                          ) : !projects || projects.length === 0 ? (
                            <div className="p-2 text-center text-muted-foreground" data-testid="no-projects">No projects available</div>
                          ) : (
                            projects.map((project) => (
                              <SelectItem key={project.id} value={project.id} data-testid={`project-option-${project.id}`}>
                                {project.title}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Leader</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-assignment-user">
                            <SelectValue placeholder="Select a team leader" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {teamLeadersLoading ? (
                            <div className="p-2 text-center text-muted-foreground" data-testid="loading-team-leaders">Loading team leaders...</div>
                          ) : !teamLeaders || teamLeaders.length === 0 ? (
                            <div className="p-2 text-center text-muted-foreground" data-testid="no-team-leaders">No team leaders available</div>
                          ) : (
                            teamLeaders.map((leader) => (
                              <SelectItem key={leader.id} value={leader.id} data-testid={`team-leader-option-${leader.id}`}>
                                {leader.firstName && leader.lastName 
                                  ? `${leader.firstName} ${leader.lastName}` 
                                  : leader.email}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button 
                type="submit" 
                disabled={createAssignmentMutation.isPending}
                data-testid="button-create-assignment"
                className="w-full md:w-auto"
              >
                {createAssignmentMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Assigning...
                  </div>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Assign Team Leader to Project
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Current Assignments */}
      <Card className="card-shadow border border-border">
        <CardHeader>
          <CardTitle>Current Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {assignmentsLoading ? (
            <div className="flex items-center justify-center py-8" data-testid="loading-assignments">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading assignments...</span>
            </div>
          ) : !assignments || assignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="no-assignments">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No project assignments found</p>
              <p className="text-sm">Assign team leaders to projects to enable hierarchical fund allocation</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projects?.map((project) => {
                const projectAssignments = assignmentsByProject[project.id] || [];
                return (
                  <div key={project.id} className="border rounded-lg p-4" data-testid={`project-assignments-${project.id}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium" data-testid={`project-title-${project.id}`}>{project.title}</h4>
                      <Badge variant="outline" data-testid={`assignment-count-${project.id}`}>
                        {projectAssignments.length} assigned
                      </Badge>
                    </div>
                    
                    {projectAssignments.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        No team leaders assigned - fund allocation will show all team leaders
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {projectAssignments.map((assignment) => (
                          <div 
                            key={assignment.id} 
                            className="flex items-center justify-between p-3 bg-muted/50 rounded border"
                            data-testid={`assignment-${assignment.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <div>
                                <div className="font-medium">
                                  {assignment.user.firstName && assignment.user.lastName 
                                    ? `${assignment.user.firstName} ${assignment.user.lastName}` 
                                    : assignment.user.email}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Assigned {new Date(assignment.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemoveAssignment(assignment.projectId, assignment.userId)}
                              disabled={removeAssignmentMutation.isPending}
                              data-testid={`button-remove-${assignment.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}