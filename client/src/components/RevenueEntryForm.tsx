import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DollarSign, ShieldAlert } from "lucide-react";
import type { Project } from "@shared/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const revenueSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number",
  }),
  description: z.string().min(3, "Description must be at least 3 characters"),
  category: z.string().default("miscellaneous"),
});

type RevenueFormData = z.infer<typeof revenueSchema>;

export default function RevenueEntryForm() {
  const { toast } = useToast();
  const { user } = useAuth();
  const tenantId = user?.tenantId;

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: Boolean(tenantId),
  });

  const form = useForm<RevenueFormData>({
    resolver: zodResolver(revenueSchema),
    defaultValues: {
      projectId: "",
      amount: "",
      description: "",
      category: "miscellaneous",
    },
  });

  const createRevenue = useMutation({
    mutationFn: async (data: RevenueFormData) => {
      const response = await apiRequest("POST", "/api/transactions", {
        projectId: data.projectId,
        type: "revenue",
        amount: data.amount,
        category: data.category,
        description: data.description,
        status: "completed",
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Revenue recorded successfully",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/tenant"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record revenue",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RevenueFormData) => {
    createRevenue.mutate(data);
  };

  // Check if user has permission to enter revenue (admin or team_leader only)
  const canEnterRevenue = user?.role === 'admin' || user?.role === 'team_leader';

  return (
    <Card className="border border-border">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <CardTitle>Revenue Entry</CardTitle>
            <CardDescription>Record building sales and other revenue</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!canEnterRevenue ? (
          <Alert variant="destructive" data-testid="alert-access-denied">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              Only team leaders and admins can record revenue. Please contact your manager if you need to record revenue.
            </AlertDescription>
          </Alert>
        ) : (
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
                        {projects?.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.title}
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
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₦)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Enter revenue amount"
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="E.g., Sale of Building Unit A5, Floor 2"
                        {...field}
                        data-testid="textarea-description"
                        className="min-h-[80px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={createRevenue.isPending}
                data-testid="button-submit-revenue"
              >
                {createRevenue.isPending ? "Recording..." : "Record Revenue"}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
