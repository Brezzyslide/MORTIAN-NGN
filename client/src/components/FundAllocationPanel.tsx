import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Project, User } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

const allocationSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  toUserId: z.string().min(1, "Team leader is required"),
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

export default function FundAllocationPanel() {
  const { toast } = useToast();
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const [selectedTeamLeaderId, setSelectedTeamLeaderId] = useState<string>("");
  const [isTeamMembersExpanded, setIsTeamMembersExpanded] = useState(false);

  const form = useForm<AllocationFormData>({
    resolver: zodResolver(allocationSchema),
    defaultValues: {
      projectId: "",
      toUserId: "",
      amount: "",
      category: "development_resources",
      description: "",
    },
  });

  const { data: projects, isLoading: projectsLoading, error: projectsError } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: Boolean(tenantId),
    retry: false,
  });

  // Get project-specific team leaders if a project is selected, otherwise get all team leaders
  const selectedProjectId = form.watch("projectId");
  
  const { data: teamLeaders, isLoading: teamLeadersLoading, error: teamLeadersError } = useQuery<User[]>({
    queryKey: selectedProjectId ? ["/api/projects", selectedProjectId, "team-leaders"] : ["/api/users/team-leaders"],
    queryFn: async () => {
      if (selectedProjectId) {
        // Fetch team leaders assigned to the specific project
        const response = await fetch(`/api/projects/${selectedProjectId}/team-leaders`, {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error('Failed to fetch assigned team leaders');
        }
        return response.json();
      } else {
        // Fallback to all team leaders if no project is selected
        const response = await fetch(`/api/users/team-leaders`, {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error('Failed to fetch team leaders');
        }
        return response.json();
      }
    },
    enabled: Boolean(tenantId),
    retry: false,
  });

  // Fetch team members when team leader is selected
  const { data: teamMembers, isLoading: teamMembersLoading, error: teamMembersError } = useQuery<User[]>({
    queryKey: ["/api/users/subordinates", selectedTeamLeaderId],
    queryFn: async () => {
      if (!selectedTeamLeaderId) return [];
      const response = await fetch(`/api/users/subordinates/${selectedTeamLeaderId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }
      return response.json();
    },
    enabled: Boolean(tenantId) && Boolean(selectedTeamLeaderId),
    retry: false,
  });

  // Handle authentication errors
  useEffect(() => {
    if (projectsError && isUnauthorizedError(projectsError)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [projectsError, toast]);

  useEffect(() => {
    if (teamLeadersError && isUnauthorizedError(teamLeadersError)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [teamLeadersError, toast]);

  useEffect(() => {
    if (teamMembersError && isUnauthorizedError(teamMembersError)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [teamMembersError, toast]);

  // Handle project selection change  
  const handleProjectChange = (value: string) => {
    form.setValue("projectId", value);
    // Reset team leader selection when project changes since available leaders might be different
    setSelectedTeamLeaderId("");
    form.setValue("toUserId", "");
    setIsTeamMembersExpanded(false);
  };

  // Handle team leader selection change
  const handleTeamLeaderChange = (value: string) => {
    setSelectedTeamLeaderId(value);
    setIsTeamMembersExpanded(Boolean(value));
    form.setValue("toUserId", value);
  };

  const allocationMutation = useMutation({
    mutationFn: async (data: AllocationFormData) => {
      const response = await apiRequest("POST", "/api/fund-allocations", {
        ...data,
        // Keep amount as string for backend validation
        amount: data.amount,
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Fund allocation created successfully",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/fund-allocations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/tenant"] });
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
        description: "Failed to create fund allocation",
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
        <p className="text-sm text-muted-foreground mt-1">Distribute funds to team leaders</p>
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
                  <Select onValueChange={handleProjectChange} value={field.value}>
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
                        projects.map((project: any) => (
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

            <FormField
              control={form.control}
              name="toUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Team Leader
                    {selectedProjectId && (
                      <Badge variant="secondary" className="text-xs">
                        Project-specific
                      </Badge>
                    )}
                  </FormLabel>
                  <Select onValueChange={handleTeamLeaderChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-team-leader">
                        <SelectValue placeholder={
                          selectedProjectId 
                            ? "Select an assigned team leader" 
                            : "Select a team leader"
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teamLeadersLoading ? (
                        <div className="p-2 text-center text-muted-foreground">Loading team leaders...</div>
                      ) : !teamLeaders || teamLeaders.length === 0 ? (
                        <div className="p-2 text-center text-muted-foreground">
                          {selectedProjectId 
                            ? "No team leaders assigned to this project" 
                            : "No team leaders available"}
                        </div>
                      ) : (
                        teamLeaders.map((leader: any) => (
                          <SelectItem key={leader.id} value={leader.id}>
                            {leader.firstName && leader.lastName 
                              ? `${leader.firstName} ${leader.lastName}` 
                              : leader.email}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {selectedProjectId && teamLeaders && teamLeaders.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      💡 No team leaders are assigned to this project. Contact your administrator to assign team leaders.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Team Members Section */}
            {selectedTeamLeaderId && (
              <Collapsible 
                open={isTeamMembersExpanded} 
                onOpenChange={setIsTeamMembersExpanded}
                className="w-full"
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md cursor-pointer hover:bg-muted transition-colors" data-testid="team-members-toggle">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="text-sm font-medium">Team Members</span>
                      {teamMembers && (
                        <Badge variant="secondary" className="text-xs">
                          {teamMembers.length}
                        </Badge>
                      )}
                    </div>
                    {isTeamMembersExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <Card className="border-dashed">
                    <CardContent className="p-4">
                      {teamMembersLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-muted-foreground"></div>
                          Loading team members...
                        </div>
                      ) : teamMembersError ? (
                        <div className="text-sm text-destructive">Failed to load team members</div>
                      ) : !teamMembers || teamMembers.length === 0 ? (
                        <div className="text-sm text-muted-foreground italic">No team members found for this team leader</div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reports to selected team leader</div>
                          {teamMembers.map((member: any) => (
                            <div 
                              key={member.id} 
                              className="flex items-center justify-between py-2 px-3 bg-background rounded border border-border/50"
                              data-testid={`team-member-${member.id}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-primary/60 rounded-full"></div>
                                <div>
                                  <div className="text-sm font-medium">
                                    {member.firstName && member.lastName 
                                      ? `${member.firstName} ${member.lastName}` 
                                      : member.email}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {member.firstName && member.lastName && member.email}
                                  </div>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs capitalize">
                                {member.role?.replace('_', ' ') || 'User'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
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
                  <FormLabel>Line Item Category</FormLabel>
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

            <Button 
              type="submit" 
              className="w-full" 
              disabled={allocationMutation.isPending}
              data-testid="button-allocate-funds"
            >
              {allocationMutation.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Allocating...
                </div>
              ) : (
                <>
                  <i className="fas fa-paper-plane mr-2"></i>
                  Allocate Funds
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
