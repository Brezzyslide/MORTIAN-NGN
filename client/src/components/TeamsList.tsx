import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, UserPlus, Edit, Trash2, Eye, Loader2, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import TeamForm from "./TeamForm";

interface Team {
  id: string;
  name: string;
  description?: string;
  leaderId?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

interface TeamMember {
  teamId: string;
  userId: string;
  roleInTeam: string;
  tenantId: string;
  joinedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

export default function TeamsList() {
  const { toast } = useToast();
  const { permissions } = usePermissions();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [viewingTeam, setViewingTeam] = useState<Team | null>(null);

  // Fetch teams
  const { data: teams = [] as Team[], isLoading, error } = useQuery({
    queryKey: ["/api/teams"],
    enabled: permissions.canViewTeams(),
    retry: false,
  });

  // Fetch team members for viewing
  const { data: teamMembers = [] as TeamMember[], isLoading: loadingMembers } = useQuery({
    queryKey: [`/api/teams/${viewingTeam?.id}/members`],
    enabled: !!viewingTeam?.id,
    retry: false,
  });

  // Delete team mutation
  const deleteTeamMutation = useMutation({
    mutationFn: (teamId: string) => apiRequest("DELETE", `/api/teams/${teamId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({
        title: "Success",
        description: "Team deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete team",
        variant: "destructive",
      });
    },
  });

  const handleDeleteTeam = (team: Team) => {
    if (window.confirm(`Are you sure you want to delete "${team.name}"? This action cannot be undone.`)) {
      deleteTeamMutation.mutate(team.id);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!permissions.canViewTeams()) {
    return (
      <Alert>
        <AlertDescription>
          You don't have permission to view teams.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading teams...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load teams. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6" data-testid="teams-list">
      {/* Home Button */}
      <div className="flex justify-start">
        <Button variant="outline" data-testid="button-home" asChild>
          <Link href="/">
            <Home className="h-4 w-4 mr-2" />
            Home
          </Link>
        </Button>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="text-teams-title">Teams</h2>
          <p className="text-muted-foreground">
            Manage teams and their members
          </p>
        </div>
        {permissions.canManageTeams() && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-team">
                <UserPlus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
              </DialogHeader>
              <TeamForm
                onSuccess={() => {
                  setShowCreateDialog(false);
                  queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
                }}
                onCancel={() => setShowCreateDialog(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {teams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No teams found</h3>
            <p className="text-muted-foreground text-center mb-4">
              Get started by creating your first team.
            </p>
            {permissions.canManageTeams() && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-first-team">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Your First Team
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Team</DialogTitle>
                  </DialogHeader>
                  <TeamForm
                    onSuccess={() => {
                      setShowCreateDialog(false);
                      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
                    }}
                    onCancel={() => setShowCreateDialog(false)}
                  />
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team: Team) => (
            <Card key={team.id} className="hover:shadow-md transition-shadow" data-testid={`card-team-${team.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg" data-testid={`text-team-name-${team.id}`}>
                    {team.name}
                  </CardTitle>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewingTeam(team)}
                      data-testid={`button-view-${team.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {permissions.canManageTeams() && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTeam(team)}
                        data-testid={`button-edit-${team.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {permissions.canDeleteTeams() && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTeam(team)}
                        disabled={deleteTeamMutation.isPending}
                        data-testid={`button-delete-${team.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
                {team.description && (
                  <p className="text-sm text-muted-foreground" data-testid={`text-team-description-${team.id}`}>
                    {team.description}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Created:</span>
                    <span data-testid={`text-team-created-${team.id}`}>{formatDate(team.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Team ID:</span>
                    <Badge variant="outline" className="font-mono text-xs" data-testid={`badge-team-id-${team.id}`}>
                      {team.id.slice(0, 8)}...
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Team Dialog */}
      {editingTeam && (
        <Dialog open={!!editingTeam} onOpenChange={() => setEditingTeam(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Team</DialogTitle>
            </DialogHeader>
            <TeamForm
              team={editingTeam}
              onSuccess={() => {
                setEditingTeam(null);
                queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
              }}
              onCancel={() => setEditingTeam(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* View Team Dialog */}
      {viewingTeam && (
        <Dialog open={!!viewingTeam} onOpenChange={() => setViewingTeam(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle data-testid={`text-viewing-team-${viewingTeam.id}`}>
                {viewingTeam.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {viewingTeam.description && (
                <div>
                  <h4 className="font-semibold mb-1">Description</h4>
                  <p className="text-muted-foreground" data-testid={`text-viewing-description-${viewingTeam.id}`}>
                    {viewingTeam.description}
                  </p>
                </div>
              )}
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Team Members</h4>
                  {permissions.canManageTeamMembers() && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      asChild
                      data-testid="button-add-team-member"
                    >
                      <Link href="/users">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Team Member
                      </Link>
                    </Button>
                  )}
                </div>
                {loadingMembers ? (
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading members...
                  </div>
                ) : teamMembers.length === 0 ? (
                  <p className="text-muted-foreground">No members found.</p>
                ) : (
                  <div className="space-y-2">
                    {teamMembers.map((member: TeamMember) => (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between p-2 border rounded"
                        data-testid={`row-member-${member.userId}`}
                      >
                        <div>
                          <p className="font-medium" data-testid={`text-member-name-${member.userId}`}>
                            {member.user.firstName} {member.user.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">{member.user.email}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" data-testid={`badge-member-role-${member.userId}`}>
                            {member.roleInTeam}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            Joined {formatDate(member.joinedAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setViewingTeam(null)}>
                  Close
                </Button>
                {permissions.canManageTeams() && (
                  <Button onClick={() => {
                    setEditingTeam(viewingTeam);
                    setViewingTeam(null);
                  }}>
                    Edit Team
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}