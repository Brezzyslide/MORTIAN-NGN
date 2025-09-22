import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Team form schema
const teamFormSchema = z.object({
  name: z.string().min(1, "Team name is required").max(100, "Team name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  leaderId: z.string().optional(),
});

type TeamFormValues = z.infer<typeof teamFormSchema>;

interface Team {
  id: string;
  name: string;
  description?: string;
  leaderId?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface TeamFormProps {
  team?: Team;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TeamForm({ team, onSuccess, onCancel }: TeamFormProps) {
  const { toast } = useToast();
  const isEditing = !!team;

  // Fetch potential team leaders (admin and team_leader roles)
  const { data: users = [] as User[] } = useQuery({
    queryKey: ["/api/users/team-leaders-with-hierarchy"],
    retry: false,
  });

  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      name: team?.name || "",
      description: team?.description || "",
      leaderId: team?.leaderId || "",
    },
  });

  // Create or update team mutation
  const teamMutation = useMutation({
    mutationFn: (data: TeamFormValues) => {
      if (isEditing) {
        return apiRequest("PUT", `/api/teams/${team.id}`, data);
      } else {
        return apiRequest("POST", "/api/teams", data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Team ${isEditing ? "updated" : "created"} successfully`,
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditing ? "update" : "create"} team`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TeamFormValues) => {
    // Remove empty fields
    const cleanData = {
      ...data,
      description: data.description?.trim() || undefined,
      leaderId: data.leaderId || undefined,
    };
    teamMutation.mutate(cleanData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-team">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Name *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter team name"
                  {...field}
                  data-testid="input-team-name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter team description (optional)"
                  className="resize-none"
                  rows={3}
                  {...field}
                  data-testid="input-team-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="leaderId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Leader</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-team-leader">
                    <SelectValue placeholder="Select a team leader (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="" data-testid="option-no-leader">No team leader</SelectItem>
                  {users.filter((user: User) => ['admin', 'team_leader'].includes(user.role)).map((user: User) => (
                    <SelectItem 
                      key={user.id} 
                      value={user.id}
                      data-testid={`option-leader-${user.id}`}
                    >
                      {user.firstName} {user.lastName} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {teamMutation.error && (
          <Alert variant="destructive">
            <AlertDescription>
              {(teamMutation.error as any)?.message || `Failed to ${isEditing ? "update" : "create"} team`}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={teamMutation.isPending}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={teamMutation.isPending}
            data-testid="button-submit"
          >
            {teamMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {isEditing ? "Updating..." : "Creating..."}
              </>
            ) : (
              isEditing ? "Update Team" : "Create Team"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}