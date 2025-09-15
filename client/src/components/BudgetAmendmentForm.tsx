import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertBudgetAmendmentSchema } from "@shared/schema";
import type { Project } from "@shared/schema";
import { DollarSign, TrendingUp, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Budget amendment form schema
const budgetAmendmentFormSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  amountAdded: z.string().min(1, "Amendment amount is required").refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num !== 0;
  }, {
    message: "Amendment amount must be a non-zero number",
  }),
  reason: z.string().min(10, "Please provide a detailed reason (minimum 10 characters)").max(1000, "Reason must be less than 1000 characters"),
});

type BudgetAmendmentFormData = z.infer<typeof budgetAmendmentFormSchema>;

// Budget impact interface
interface BudgetImpact {
  currentBudget: number;
  proposedAmount: number;
  newBudget: number;
  percentageIncrease: number;
  currentSpent: number;
  currentUtilization: number;
  newUtilization: number;
  impactType: 'increase' | 'decrease';
  isSignificant: boolean; // >10% change
}

export default function BudgetAmendmentForm() {
  const { toast } = useToast();
  const { permissions, isAdmin, isTeamLeader } = usePermissions();
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [budgetImpact, setBudgetImpact] = useState<BudgetImpact | null>(null);

  // Check if user has permission to create budget amendments
  if (!isAdmin && !isTeamLeader) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-600 mb-2">Access Denied</h2>
          <p className="text-gray-500">You don't have permission to create budget amendments.</p>
        </div>
      </div>
    );
  }

  const form = useForm<BudgetAmendmentFormData>({
    resolver: zodResolver(budgetAmendmentFormSchema),
    defaultValues: {
      projectId: "",
      amountAdded: "",
      reason: "",
    },
  });

  // Watch form values for real-time budget impact calculation
  const watchedProjectId = form.watch("projectId");
  const watchedAmountAdded = form.watch("amountAdded");

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects", tenantId],
    enabled: Boolean(tenantId),
    retry: false,
  });

  // Fetch selected project details for budget impact
  const { data: selectedProject } = useQuery<Project>({
    queryKey: ["/api/projects", tenantId, watchedProjectId],
    enabled: Boolean(tenantId) && !!watchedProjectId,
    retry: false,
  });

  // Calculate budget impact when project or amount changes
  useEffect(() => {
    if (selectedProject && watchedAmountAdded && !isNaN(parseFloat(watchedAmountAdded))) {
      const currentBudget = parseFloat(selectedProject.budget);
      const proposedAmount = parseFloat(watchedAmountAdded);
      const newBudget = currentBudget + proposedAmount;
      const percentageIncrease = ((proposedAmount / currentBudget) * 100);
      const currentSpent = parseFloat(selectedProject.consumedAmount || '0');
      const currentUtilization = (currentSpent / currentBudget) * 100;
      const newUtilization = (currentSpent / newBudget) * 100;

      setBudgetImpact({
        currentBudget,
        proposedAmount,
        newBudget,
        percentageIncrease,
        currentSpent,
        currentUtilization,
        newUtilization,
        impactType: proposedAmount > 0 ? 'increase' : 'decrease',
        isSignificant: Math.abs(percentageIncrease) > 10,
      });
    } else {
      setBudgetImpact(null);
    }
  }, [selectedProject, watchedAmountAdded]);

  // Submit mutation
  const createBudgetAmendment = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/budget-amendments", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Budget amendment proposal submitted successfully",
      });
      form.reset();
      setBudgetImpact(null);
      setShowConfirmDialog(false);
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/budget-amendments", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/tenant", tenantId] });
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
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to submit budget amendment",
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = (data: BudgetAmendmentFormData) => {
    if (!budgetImpact) {
      toast({
        title: "Error",
        description: "Please select a project and enter an amendment amount",
        variant: "destructive",
      });
      return;
    }

    // Show confirmation dialog for significant changes
    if (budgetImpact.isSignificant) {
      setShowConfirmDialog(true);
    } else {
      proceedWithSubmission(data);
    }
  };

  const proceedWithSubmission = (data?: BudgetAmendmentFormData) => {
    const formData = data || form.getValues();
    
    const amendmentData = {
      projectId: formData.projectId,
      amountAdded: formData.amountAdded,
      reason: formData.reason,
    };

    createBudgetAmendment.mutate(amendmentData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getBudgetImpactColor = (impact: BudgetImpact) => {
    if (impact.isSignificant) {
      return impact.impactType === 'increase' ? 'text-red-600' : 'text-green-600';
    }
    return impact.impactType === 'increase' ? 'text-orange-600' : 'text-blue-600';
  };

  const getBudgetImpactIcon = (impact: BudgetImpact) => {
    if (impact.isSignificant) {
      return <AlertTriangle className="h-5 w-5" />;
    }
    return impact.impactType === 'increase' ? <TrendingUp className="h-5 w-5" /> : <Info className="h-5 w-5" />;
  };

  return (
    <>
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-6 w-6 text-blue-600" />
            <span>Budget Amendment Proposal</span>
          </CardTitle>
          <p className="text-muted-foreground">
            Propose changes to project budgets. All amendments require approval before taking effect.
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Project Selection */}
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={projectsLoading}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-project">
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projectsLoading ? (
                            <SelectItem value="loading" disabled>Loading projects...</SelectItem>
                          ) : (
                            projects?.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.title} - {formatCurrency(parseFloat(project.budget))}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Amendment Amount */}
                <FormField
                  control={form.control}
                  name="amountAdded"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amendment Amount ($) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Enter amount (positive to increase, negative to decrease)"
                          {...field}
                          data-testid="input-amendment-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Reason */}
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Amendment *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide a detailed explanation for this budget amendment..."
                        className="min-h-[120px]"
                        {...field}
                        data-testid="textarea-reason"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Budget Impact Preview */}
              {budgetImpact && (
                <Card className="border-2 border-dashed border-muted-foreground/30">
                  <CardHeader className="pb-3">
                    <CardTitle className={`flex items-center space-x-2 text-lg ${getBudgetImpactColor(budgetImpact)}`}>
                      {getBudgetImpactIcon(budgetImpact)}
                      <span>Budget Impact Preview</span>
                      {budgetImpact.isSignificant && (
                        <Badge variant="outline" className="ml-2 border-orange-500 text-orange-700">
                          Significant Change
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Current Budget</p>
                        <p className="font-semibold">{formatCurrency(budgetImpact.currentBudget)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Amendment</p>
                        <p className={`font-semibold ${budgetImpact.impactType === 'increase' ? 'text-red-600' : 'text-green-600'}`}>
                          {budgetImpact.impactType === 'increase' ? '+' : ''}{formatCurrency(budgetImpact.proposedAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">New Budget</p>
                        <p className="font-semibold">{formatCurrency(budgetImpact.newBudget)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">% Change</p>
                        <p className={`font-semibold ${budgetImpact.impactType === 'increase' ? 'text-red-600' : 'text-green-600'}`}>
                          {budgetImpact.impactType === 'increase' ? '+' : ''}{budgetImpact.percentageIncrease.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Current Spent</p>
                        <p className="font-semibold">{formatCurrency(budgetImpact.currentSpent)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Current Utilization</p>
                        <p className="font-semibold">{budgetImpact.currentUtilization.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">New Utilization</p>
                        <p className="font-semibold">{budgetImpact.newUtilization.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Remaining After</p>
                        <p className="font-semibold">{formatCurrency(budgetImpact.newBudget - budgetImpact.currentSpent)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    setBudgetImpact(null);
                  }}
                  data-testid="button-reset"
                >
                  Reset Form
                </Button>
                <Button
                  type="submit"
                  disabled={createBudgetAmendment.isPending || !budgetImpact}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-submit-amendment"
                >
                  {createBudgetAmendment.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Amendment"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent data-testid="dialog-confirm-amendment">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>Significant Budget Change</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              This amendment represents a significant change ({budgetImpact?.percentageIncrease.toFixed(1)}% {budgetImpact?.impactType}) to the project budget.
              
              {budgetImpact && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
                  <p><strong>Current Budget:</strong> {formatCurrency(budgetImpact.currentBudget)}</p>
                  <p><strong>Proposed Amendment:</strong> <span className={budgetImpact.impactType === 'increase' ? 'text-red-600' : 'text-green-600'}>
                    {budgetImpact.impactType === 'increase' ? '+' : ''}{formatCurrency(budgetImpact.proposedAmount)}
                  </span></p>
                  <p><strong>New Total Budget:</strong> {formatCurrency(budgetImpact.newBudget)}</p>
                </div>
              )}
              
              <p className="mt-4">Are you sure you want to proceed with this amendment? It will require management approval.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-amendment">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => proceedWithSubmission()}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-confirm-amendment"
            >
              Proceed with Amendment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}