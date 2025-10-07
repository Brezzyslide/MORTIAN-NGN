import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Project, User } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

// Schema for team
interface Team {
  id: string;
  name: string;
  description?: string;
  leaderId?: string;
  tenantId: string;
}

// Schema for team member with user details
interface TeamMember {
  teamId: string;
  userId: string;
  roleInTeam: string;
  user: User;
}

const allocationSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  teamId: z.string().optional(), // Optional for admins
  toUserId: z.string().min(1, "User is required"),
  amount: z.string().min(1, "Amount is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a positive number",
  }),
  category: z.enum([
    "development_resources",
    "design_tools",
    "testing_qa", 
    "infrastructure",
    "marketing",
    "operations",
    "miscellaneous"
  ]),
  description: z.string().optional(),
});

type AllocationFormData = z.infer<typeof allocationSchema>;

const categoryLabels: Record<string, string> = {
  development_resources: "Development Resources",
  design_tools: "Design Tools", 
  testing_qa: "Testing & QA",
  infrastructure: "Infrastructure",
  marketing: "Marketing",
  operations: "Operations",
  miscellaneous: "Miscellaneous",
};

// Helper function to format user display name
const formatUserDisplayName = (user: User): string => {
  return user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : user.email;
};

export default function FundAllocationPanel() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const tenantId = user?.tenantId;

  const form = useForm<AllocationFormData>({
    resolver: zodResolver(allocationSchema),
    defaultValues: {
      projectId: "",
      teamId: "",
      toUserId: "",
      amount: "",
      category: "development_resources",
      description: "",
    },
  });

  const selectedTeamId = form.watch("teamId");

  // Fetch projects
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: Boolean(tenantId),
    retry: false,
  });

  // Fetch all users (for admins only)
  const { data: allUsers, isLoading: usersLoading, error: usersError } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: Boolean(tenantId) && isAdmin,
    retry: false,
  });

  // Fetch teams led by current user (for team leaders only)
  const { data: teams, isLoading: teamsLoading, error: teamsError } = useQuery<Team[]>({
    queryKey: ["/api/teams/my-teams"],
    enabled: Boolean(tenantId) && !isAdmin,
    retry: false,
  });

  // Fetch members of selected team (for team leaders only)
  const { data: teamMembers, isLoading: membersLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/teams", selectedTeamId, "members"],
    queryFn: async () => {
      if (!selectedTeamId) return [];
      const response = await fetch(`/api/teams/${selectedTeamId}/members`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }
      return response.json();
    },
    enabled: Boolean(selectedTeamId) && !isAdmin,
    retry: false,
  });

  // Handle authentication errors
  useEffect(() => {
    const errors = [projectsError, isAdmin ? usersError : teamsError];
    const unauthorizedError = errors.find(err => err && isUnauthorizedError(err));
    
    if (unauthorizedError) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [projectsError, teamsError, toast]);

  // Handle team selection change
  const handleTeamChange = (value: string) => {
    form.setValue("teamId", value);
    // Reset team member selection when team changes
    form.setValue("toUserId", "");
  };

  // Allocation mutation
  const allocationMutation = useMutation({
    mutationFn: async (data: AllocationFormData) => {
      // Allocate funds
      const response = await apiRequest("POST", "/api/fund-allocations", {
        ...data,
        amount: data.amount,
      });
      const allocationResult = await response.json();
      
      // Assign the team member to the project
      try {
        await apiRequest("POST", "/api/project-assignments", {
          projectId: data.projectId,
          userId: data.toUserId,
        });
      } catch (assignmentError: any) {
        // Ignore if already assigned
        if (!assignmentError.message?.includes("already assigned")) {
          console.error("Project assignment error:", assignmentError);
        }
      }
      
      return allocationResult;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Funds allocated and team member assigned to project",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/fund-allocations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/tenant"] });
      queryClient.invalidateQueries({ queryKey: ["/api/project-assignments"] });
    },
    onError: (error: Error) => {
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
      toast({
        title: "Error",
        description: error.message || "Failed to create fund allocation",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AllocationFormData) => {
    allocationMutation.mutate(data);
  };

  return (
    <Card className="card-shadow border border-border">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold">Fund Allocation</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {isAdmin ? "Allocate project funds to users" : "Distribute funds to your team members"}
        </p>
      </div>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-project">
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projectsLoading ? (
                        <div className="p-2 text-center text-muted-foreground">Loading projects...</div>
                      ) : !projects || projects.length === 0 ? (
                        <div className="p-2 text-center text-muted-foreground">No projects available</div>
                      ) : (
                        projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
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

            {/* Admin Flow: Select user directly */}
            {isAdmin ? (
              <FormField
                control={form.control}
                name="toUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allocate to User</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-user">
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {usersLoading ? (
                          <div className="p-2 text-center text-muted-foreground">Loading users...</div>
                        ) : !allUsers || allUsers.length === 0 ? (
                          <div className="p-2 text-center text-muted-foreground">No users available</div>
                        ) : (
                          allUsers.map((usr) => (
                            <SelectItem key={usr.id} value={usr.id}>
                              {formatUserDisplayName(usr)} ({usr.role})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              /* Team Leader Flow: Select team then team member */
              <>
                <FormField
                  control={form.control}
                  name="teamId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team</FormLabel>
                      <Select onValueChange={handleTeamChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-team">
                            <SelectValue placeholder="Select your team" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {teamsLoading ? (
                            <div className="p-2 text-center text-muted-foreground">Loading teams...</div>
                          ) : !teams || teams.length === 0 ? (
                            <div className="p-2 text-center text-muted-foreground">
                              No teams found. Create a team first.
                            </div>
                          ) : (
                            teams.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
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
                  name="toUserId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Member</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!selectedTeamId}>
                        <FormControl>
                          <SelectTrigger data-testid="select-team-member">
                            <SelectValue placeholder={selectedTeamId ? "Select a team member" : "Select a team first"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {membersLoading ? (
                            <div className="p-2 text-center text-muted-foreground">Loading members...</div>
                          ) : !teamMembers || teamMembers.length === 0 ? (
                            <div className="p-2 text-center text-muted-foreground">
                              No members in this team
                            </div>
                          ) : (
                            teamMembers.map((member) => (
                              <SelectItem key={member.userId} value={member.userId}>
                                {formatUserDisplayName(member.user)} ({member.roleInTeam})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₦)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      {...field}
                      data-testid="input-amount"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-category">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add allocation details"
                      {...field}
                      data-testid="textarea-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={allocationMutation.isPending}
              data-testid="button-allocate"
            >
              {allocationMutation.isPending ? "Allocating..." : "Allocate Funds"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
