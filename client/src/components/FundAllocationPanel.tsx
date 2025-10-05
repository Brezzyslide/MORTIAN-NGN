import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Users, ArrowRight, Building, Crown, UserPlus, CheckCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Project, User } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

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

type UserWithManager = User & { manager?: User };

// Type definition for team hierarchy structure
type TeamHierarchy = {
  teamLeader: User;
  members: User[];
}[];

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

// Helper function to format hierarchy display for team leaders
const formatTeamLeaderHierarchy = (leader: UserWithManager): string => {
  const leaderName = formatUserDisplayName(leader);
  if (leader.manager) {
    const managerName = formatUserDisplayName(leader.manager);
    return `${leaderName} (reports to: ${managerName})`;
  }
  return `${leaderName} (top-level manager)`;
};

export default function FundAllocationPanel() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const tenantId = user?.tenantId;
  const [selectedTeamLeaderId, setSelectedTeamLeaderId] = useState<string>("");
  const [isTeamMembersExpanded, setIsTeamMembersExpanded] = useState(false);
  const [isAssignmentExpanded, setIsAssignmentExpanded] = useState(false);
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);

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

  // Always get ALL team leaders for fund allocation (regardless of project assignment)
  const selectedProjectId = form.watch("projectId");
  
  const { data: teamLeaders, isLoading: teamLeadersLoading, error: teamLeadersError } = useQuery<UserWithManager[]>({
    queryKey: ["/api/users/team-leaders-with-hierarchy"],
    queryFn: async () => {
      // Always fetch ALL team leaders with hierarchy information for fund allocation
      const response = await fetch(`/api/users/team-leaders-with-hierarchy`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch team leaders with hierarchy');
      }
      return response.json();
    },
    enabled: Boolean(tenantId),
    retry: false,
  });

  // Fetch all available team leaders for assignment (when in assignment mode)
  const { data: allTeamLeaders, isLoading: allTeamLeadersLoading } = useQuery<User[]>({
    queryKey: ["/api/users/team-leaders"],
    enabled: Boolean(tenantId) && Boolean(selectedProjectId) && isAssignmentExpanded,
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

  // Team hierarchy query for selected project
  const { data: hierarchy } = useQuery<TeamHierarchy>({
    queryKey: ['/api/projects', selectedProjectId, 'team-hierarchy'],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/projects/${selectedProjectId}/team-hierarchy`);
      return await response.json();
    },
    enabled: Boolean(selectedProjectId)
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

  // Get available team leaders for assignment (excluding already assigned ones)
  const availableForAssignment = allTeamLeaders?.filter(leader => 
    !teamLeaders?.some(assigned => assigned.id === leader.id)
  ) || [];

  // Assignment mutation
  const assignmentMutation = useMutation({
    mutationFn: async () => {
      if (selectedAssignments.length === 0) {
        throw new Error('No team leaders selected');
      }
      
      // Create assignments for each selected team leader
      const assignments = selectedAssignments.map(userId => ({
        projectId: selectedProjectId,
        userId,
      }));
      
      // Send each assignment separately
      const results = await Promise.all(
        assignments.map(assignment => 
          apiRequest("POST", "/api/project-assignments", assignment)
        )
      );
      
      return results;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${selectedAssignments.length} team leader(s) assigned successfully`,
      });
      
      // Reset assignment state
      setSelectedAssignments([]);
      setIsAssignmentExpanded(false);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "team-leaders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/team-leaders-with-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/project-assignments"] });
      // FRONTEND CACHE FIX: Invalidate team-hierarchy query after assignment mutations
      queryClient.invalidateQueries({
        queryKey: ['/api/projects', selectedProjectId, 'team-hierarchy']
      });
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
        description: error.message || "Failed to assign team leaders",
        variant: "destructive",
      });
    },
  });

  // Handle assignment checkbox toggle
  const handleAssignmentToggle = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedAssignments(prev => [...prev, userId]);
    } else {
      setSelectedAssignments(prev => prev.filter(id => id !== userId));
    }
  };

  // Handle assignment submission
  const handleAssignSubmit = () => {
    assignmentMutation.mutate();
  };

  const allocationMutation = useMutation({
    mutationFn: async (data: AllocationFormData) => {
      // First, allocate funds
      const response = await apiRequest("POST", "/api/fund-allocations", {
        ...data,
        // Keep amount as string for backend validation
        amount: data.amount,
      });
      const allocationResult = await response.json();
      
      // Then, assign the team leader to the project (if not already assigned)
      try {
        await apiRequest("POST", "/api/project-assignments", {
          projectId: data.projectId,
          userId: data.toUserId,
        });
      } catch (assignmentError: any) {
        // Ignore if already assigned - that's okay
        if (!assignmentError.message?.includes("already assigned")) {
          console.error("Project assignment error:", assignmentError);
        }
      }
      
      return allocationResult;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Funds allocated and team leader assigned to project",
      });
      form.reset();
      setSelectedTeamLeaderId("");
      setIsTeamMembersExpanded(false);
      queryClient.invalidateQueries({ queryKey: ["/api/fund-allocations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/tenant"] });
      queryClient.invalidateQueries({ queryKey: ["/api/project-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/team-leaders-with-hierarchy"] });
      // Invalidate team hierarchy for the project
      if (selectedProjectId) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/projects', selectedProjectId, 'team-hierarchy'] 
        });
        queryClient.invalidateQueries({ 
          queryKey: ["/api/projects", selectedProjectId, "team-leaders"] 
        });
      }
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

  // Helper to check if assignment interface should be shown
  const shouldShowAssignmentInterface = () => {
    // Show assignment interface when admin, project selected, and there are team leaders available to assign
    return isAdmin && selectedProjectId && availableForAssignment.length > 0;
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
                        <SelectValue placeholder="Select a team leader" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teamLeadersLoading ? (
                        <div className="p-2 text-center text-muted-foreground">Loading team leaders...</div>
                      ) : !teamLeaders || teamLeaders.length === 0 ? (
                        <div className="p-2 text-center text-muted-foreground">
                          No team leaders available
                        </div>
                      ) : (
                        teamLeaders.map((leader: UserWithManager) => (
                          <SelectItem key={leader.id} value={leader.id}>
                            <div className="flex items-center gap-2 py-1">
                              <div className="flex items-center gap-1">
                                {leader.manager ? (
                                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                ) : (
                                  <Crown className="h-3 w-3 text-amber-500" />
                                )}
                                <span className="font-medium">
                                  {formatUserDisplayName(leader)} - {leader.role?.replace('_', ' ') || 'Team Leader'}
                                </span>
                              </div>
                              {leader.manager && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <ArrowRight className="h-2 w-2" />
                                  <span>{formatUserDisplayName(leader.manager)}</span>
                                </div>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {/* Assignment interface for admins when no team leaders are assigned */}
                  {shouldShowAssignmentInterface() && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            Assign Team Leaders
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsAssignmentExpanded(!isAssignmentExpanded)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          data-testid="button-toggle-assignment"
                        >
                          {isAssignmentExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-1" />
                              Hide
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-1" />
                              Show
                            </>
                          )}
                        </Button>
                      </div>
                      
                      <Collapsible open={isAssignmentExpanded} onOpenChange={setIsAssignmentExpanded}>
                        <CollapsibleContent className="space-y-3">
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            Select team leaders to assign to this project:
                          </p>
                          
                          {allTeamLeadersLoading ? (
                            <div className="flex items-center gap-2 p-2">
                              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                              <span className="text-sm text-blue-700">Loading available team leaders...</span>
                            </div>
                          ) : availableForAssignment.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              All available team leaders are already assigned to this project.
                            </p>
                          ) : (
                            <>
                              <div className="max-h-40 overflow-y-auto space-y-2 p-2 bg-white dark:bg-gray-900/50 rounded border">
                                {availableForAssignment.map((leader) => (
                                  <div key={leader.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`assign-${leader.id}`}
                                      checked={selectedAssignments.includes(leader.id)}
                                      onCheckedChange={(checked) => 
                                        handleAssignmentToggle(leader.id, checked as boolean)
                                      }
                                      data-testid={`checkbox-assign-${leader.id}`}
                                    />
                                    <label
                                      htmlFor={`assign-${leader.id}`}
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                                    >
                                      {formatUserDisplayName(leader)}
                                    </label>
                                  </div>
                                ))}
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                  {selectedAssignments.length} team leader(s) selected
                                </p>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedAssignments([])}
                                    disabled={selectedAssignments.length === 0}
                                    data-testid="button-clear-assignments"
                                  >
                                    Clear
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={handleAssignSubmit}
                                    disabled={selectedAssignments.length === 0 || assignmentMutation.isPending}
                                    data-testid="button-assign-submit"
                                  >
                                    {assignmentMutation.isPending ? (
                                      <>
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        Assigning...
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Assign {selectedAssignments.length > 1 ? `${selectedAssignments.length} Leaders` : 'Leader'}
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  )}
                  
                  {/* Fallback message for non-admin users */}
                  {selectedProjectId && teamLeaders && teamLeaders.length === 0 && !shouldShowAssignmentInterface() && (
                    <p className="text-sm text-muted-foreground mt-2">
                      💡 No team leaders are assigned to this project. Contact your administrator to assign team leaders.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Team Hierarchy Section */}
            {selectedTeamLeaderId && (
              <Collapsible 
                open={isTeamMembersExpanded} 
                onOpenChange={setIsTeamMembersExpanded}
                className="w-full"
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-muted/30 to-muted/50 rounded-md cursor-pointer hover:from-muted/50 hover:to-muted/70 transition-all duration-200 border border-border/50" data-testid="team-members-toggle">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Team Hierarchy</span>
                      {teamMembers && (
                        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                          {teamMembers.length} {teamMembers.length === 1 ? 'member' : 'members'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">View structure</span>
                      {isTeamMembersExpanded ? (
                        <ChevronUp className="h-4 w-4 text-primary" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <Card className="border-dashed border-primary/20 bg-gradient-to-br from-background to-muted/20">
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
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            <Building className="h-3 w-3" />
                            Reporting Structure
                          </div>
                          
                          {/* Show selected team leader info */}
                          {(() => {
                            const selectedLeader = teamLeaders?.find(leader => leader.id === selectedTeamLeaderId);
                            return selectedLeader && (
                              <div className="mb-4 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/30 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                  <Crown className="h-4 w-4 text-primary" />
                                  <span className="text-sm font-semibold text-primary">Team Leader</span>
                                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                </div>
                                <div className="pl-6 space-y-2">
                                  <div className="text-sm font-medium text-foreground">
                                    {formatUserDisplayName(selectedLeader)}
                                  </div>
                                  {selectedLeader.manager ? (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <div className="flex items-center gap-1">
                                        <ArrowRight className="h-3 w-3" />
                                        <span>Reports to:</span>
                                      </div>
                                      <Badge variant="outline" className="text-xs bg-background/50">
                                        {formatUserDisplayName(selectedLeader.manager)}
                                      </Badge>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 text-xs text-amber-600">
                                      <Crown className="h-3 w-3" />
                                      <span>Senior Leadership</span>
                                    </div>
                                  )}
                                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                                    {selectedLeader.role?.replace('_', ' ') || 'Team Leader'}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })()}
                          
                          {/* Show team members */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                Direct Reports ({teamMembers.length})
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Organizational Structure
                              </div>
                            </div>
                            {teamMembers.map((member: any, index: number) => (
                              <div 
                                key={member.id} 
                                className="flex items-center justify-between py-3 px-4 bg-background rounded-lg border border-border/50 hover:border-primary/30 hover:shadow-sm transition-all duration-200"
                                data-testid={`team-member-${member.id}`}
                              >
                                <div className="flex items-center gap-3">
                                  {/* Hierarchy connector */}
                                  <div className="flex items-center">
                                    <div className="w-8 flex justify-center relative">
                                      <div className="w-3 h-3 bg-gradient-to-r from-primary/60 to-primary/40 rounded-full border-2 border-background shadow-sm"></div>
                                      {index < teamMembers.length - 1 && (
                                        <div className="absolute top-3 w-px h-4 bg-border"></div>
                                      )}
                                    </div>
                                    <div className="w-4 h-px bg-gradient-to-r from-border to-transparent"></div>
                                  </div>
                                  
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">
                                      {formatUserDisplayName(member)}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      {member.firstName && member.lastName && (
                                        <div className="text-xs text-muted-foreground">
                                          {member.email}
                                        </div>
                                      )}
                                      <ArrowRight className="h-2 w-2 text-muted-foreground" />
                                      <div className="text-xs text-muted-foreground">
                                        Reports to: {(() => {
                                          const leader = teamLeaders?.find(l => l.id === selectedTeamLeaderId);
                                          return leader ? formatUserDisplayName(leader) : 'Team Leader';
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {member.role?.replace('_', ' ') || 'User'}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Team Hierarchy Display from new endpoint */}
            {selectedTeamLeaderId && hierarchy && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Team Hierarchy ({hierarchy?.find((h: TeamHierarchy[0]) => h.teamLeader.id === selectedTeamLeaderId)?.members.length || 0} members)
                </h4>
                <ul className="space-y-1">
                  {hierarchy?.find((h: TeamHierarchy[0]) => h.teamLeader.id === selectedTeamLeaderId)?.members.map((m: User) => (
                    <li key={m.id} className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2" data-testid={`hierarchy-member-${m.id}`}>
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      {m.firstName} {m.lastName} ({m.role})
                    </li>
                  ))}
                </ul>
              </div>
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
                  Allocate Funds / to Project
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
