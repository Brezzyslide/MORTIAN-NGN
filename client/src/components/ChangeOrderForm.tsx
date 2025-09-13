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
import { insertChangeOrderSchema } from "@shared/schema";
import { FileText, DollarSign, AlertTriangle, Info, CheckCircle, Layers } from "lucide-react";

// Change order form schema
const changeOrderFormSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  description: z.string().min(20, "Please provide a detailed description (minimum 20 characters)").max(2000, "Description must be less than 2000 characters"),
  costImpact: z.string().refine((val) => {
    if (!val || val.trim() === "") return true; // Optional field
    const num = parseFloat(val);
    return !isNaN(num);
  }, {
    message: "Cost impact must be a valid number",
  }),
});

type ChangeOrderFormData = z.infer<typeof changeOrderFormSchema>;

// Cost impact interface
interface CostImpact {
  currentBudget: number;
  impactAmount: number;
  newBudget: number;
  percentageChange: number;
  currentSpent: number;
  currentUtilization: number;
  newUtilization: number;
  impactType: 'increase' | 'decrease' | 'none';
  isSignificant: boolean; // >5% change
}

export default function ChangeOrderForm() {
  const { toast } = useToast();
  const { permissions, isAdmin, isTeamLeader } = usePermissions();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [costImpact, setCostImpact] = useState<CostImpact | null>(null);

  // Check if user has permission to create change orders
  if (!isAdmin && !isTeamLeader) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-600 mb-2">Access Denied</h2>
          <p className="text-gray-500">You don't have permission to create change orders.</p>
        </div>
      </div>
    );
  }

  const form = useForm<ChangeOrderFormData>({
    resolver: zodResolver(changeOrderFormSchema),
    defaultValues: {
      projectId: "",
      description: "",
      costImpact: "",
    },
  });

  // Watch form values for real-time cost impact calculation
  const watchedProjectId = form.watch("projectId");
  const watchedCostImpact = form.watch("costImpact");

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
    retry: false,
  });

  // Fetch selected project details for cost impact
  const { data: selectedProject } = useQuery({
    queryKey: ["/api/projects", watchedProjectId],
    enabled: !!watchedProjectId,
    retry: false,
  });

  // Calculate cost impact when project or impact amount changes
  useEffect(() => {
    if (selectedProject && watchedCostImpact !== undefined && watchedCostImpact !== "") {
      const currentBudget = parseFloat(selectedProject.budget);
      const impactAmount = parseFloat(watchedCostImpact) || 0;
      const newBudget = currentBudget + impactAmount;
      const percentageChange = currentBudget > 0 ? ((impactAmount / currentBudget) * 100) : 0;
      const currentSpent = parseFloat(selectedProject.consumedAmount || '0');
      const currentUtilization = currentBudget > 0 ? (currentSpent / currentBudget) * 100 : 0;
      const newUtilization = newBudget > 0 ? (currentSpent / newBudget) * 100 : 0;

      setCostImpact({
        currentBudget,
        impactAmount,
        newBudget,
        percentageChange,
        currentSpent,
        currentUtilization,
        newUtilization,
        impactType: impactAmount > 0 ? 'increase' : impactAmount < 0 ? 'decrease' : 'none',
        isSignificant: Math.abs(percentageChange) > 5,
      });
    } else {
      setCostImpact(null);
    }
  }, [selectedProject, watchedCostImpact]);

  // Submit mutation
  const createChangeOrder = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/change-orders", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Change order proposal submitted successfully",
      });
      form.reset();
      setCostImpact(null);
      setShowConfirmDialog(false);
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/change-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
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
          description: error.message || "Failed to submit change order",
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = (data: ChangeOrderFormData) => {
    // Show confirmation dialog for cost impact changes
    if (costImpact && (costImpact.isSignificant || costImpact.impactAmount !== 0)) {
      setShowConfirmDialog(true);
    } else {
      proceedWithSubmission(data);
    }
  };

  const proceedWithSubmission = (data?: ChangeOrderFormData) => {
    const formData = data || form.getValues();
    
    const changeOrderData = {
      projectId: formData.projectId,
      description: formData.description,
      costImpact: formData.costImpact || "0",
    };

    createChangeOrder.mutate(changeOrderData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getCostImpactColor = (impact: CostImpact) => {
    if (impact.impactType === 'none') return 'text-gray-600';
    if (impact.isSignificant) {
      return impact.impactType === 'increase' ? 'text-red-600' : 'text-green-600';
    }
    return impact.impactType === 'increase' ? 'text-orange-600' : 'text-blue-600';
  };

  const getCostImpactIcon = (impact: CostImpact) => {
    if (impact.impactType === 'none') return <Info className="h-5 w-5" />;
    if (impact.isSignificant) {
      return <AlertTriangle className="h-5 w-5" />;
    }
    return <DollarSign className="h-5 w-5" />;
  };

  return (
    <>
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Layers className="h-6 w-6 text-purple-600" />
            <span>Change Order Proposal</span>
          </CardTitle>
          <p className="text-muted-foreground">
            Propose project scope changes. Changes with cost impact require approval before implementation.
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
                            projects?.map((project: any) => (
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

                {/* Cost Impact (Optional) */}
                <FormField
                  control={form.control}
                  name="costImpact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost Impact ($) <span className="text-muted-foreground text-sm">(Optional)</span></FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00 (leave empty if no cost impact)"
                          {...field}
                          data-testid="input-cost-impact"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Positive for cost increase, negative for savings, empty for no cost impact
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Change Description *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the scope change in detail. Include what's changing, why it's needed, and any impact on timeline or deliverables..."
                        className="min-h-[150px]"
                        {...field}
                        data-testid="textarea-description"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Be specific about what aspects of the project scope are changing and any dependencies.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cost Impact Preview */}
              {costImpact && costImpact.impactAmount !== 0 && (
                <Card className="border-2 border-dashed border-muted-foreground/30">
                  <CardHeader className="pb-3">
                    <CardTitle className={`flex items-center space-x-2 text-lg ${getCostImpactColor(costImpact)}`}>
                      {getCostImpactIcon(costImpact)}
                      <span>Cost Impact Preview</span>
                      {costImpact.isSignificant && (
                        <Badge variant="outline" className="ml-2 border-orange-500 text-orange-700">
                          Significant Impact
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Current Budget</p>
                        <p className="font-semibold">{formatCurrency(costImpact.currentBudget)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Cost Impact</p>
                        <p className={`font-semibold ${costImpact.impactType === 'increase' ? 'text-red-600' : costImpact.impactType === 'decrease' ? 'text-green-600' : 'text-gray-600'}`}>
                          {costImpact.impactType === 'increase' ? '+' : costImpact.impactType === 'decrease' ? '' : ''}{formatCurrency(costImpact.impactAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">New Budget</p>
                        <p className="font-semibold">{formatCurrency(costImpact.newBudget)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">% Change</p>
                        <p className={`font-semibold ${costImpact.impactType === 'increase' ? 'text-red-600' : costImpact.impactType === 'decrease' ? 'text-green-600' : 'text-gray-600'}`}>
                          {costImpact.impactType === 'increase' ? '+' : costImpact.impactType === 'decrease' ? '' : ''}{costImpact.percentageChange.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Current Spent</p>
                        <p className="font-semibold">{formatCurrency(costImpact.currentSpent)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Current Utilization</p>
                        <p className="font-semibold">{costImpact.currentUtilization.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">New Utilization</p>
                        <p className="font-semibold">{costImpact.newUtilization.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Remaining After</p>
                        <p className="font-semibold">{formatCurrency(costImpact.newBudget - costImpact.currentSpent)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* No Cost Impact Notice */}
              {costImpact && costImpact.impactAmount === 0 && (
                <Card className="border-2 border-dashed border-green-200 bg-green-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2 text-green-700">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">No Cost Impact</span>
                    </div>
                    <p className="text-sm text-green-600 mt-1">
                      This change order does not affect the project budget and can be processed without budget approval.
                    </p>
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
                    setCostImpact(null);
                  }}
                  data-testid="button-reset"
                >
                  Reset Form
                </Button>
                <Button
                  type="submit"
                  disabled={createChangeOrder.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                  data-testid="button-submit-change-order"
                >
                  {createChangeOrder.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Change Order"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent data-testid="dialog-confirm-change-order">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              {costImpact?.isSignificant ? (
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              ) : (
                <Info className="h-5 w-5 text-blue-500" />
              )}
              <span>
                {costImpact?.isSignificant ? "Significant Change Order" : "Confirm Change Order"}
              </span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              {costImpact?.isSignificant && (
                <p className="mb-4">
                  This change order has a significant cost impact ({costImpact?.percentageChange.toFixed(1)}% change) and will require management approval.
                </p>
              )}
              
              {costImpact && costImpact.impactAmount !== 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
                  <p><strong>Project:</strong> {selectedProject?.title}</p>
                  <p><strong>Current Budget:</strong> {formatCurrency(costImpact.currentBudget)}</p>
                  <p><strong>Cost Impact:</strong> <span className={costImpact.impactType === 'increase' ? 'text-red-600' : costImpact.impactType === 'decrease' ? 'text-green-600' : 'text-gray-600'}>
                    {costImpact.impactType === 'increase' ? '+' : costImpact.impactType === 'decrease' ? '' : ''}{formatCurrency(costImpact.impactAmount)}
                  </span></p>
                  <p><strong>New Budget:</strong> {formatCurrency(costImpact.newBudget)}</p>
                </div>
              )}
              
              {costImpact && costImpact.impactAmount === 0 && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <p className="text-green-700">This change order has no cost impact and can be processed immediately.</p>
                </div>
              )}
              
              <p className="mt-4">Are you sure you want to submit this change order proposal?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-change-order">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => proceedWithSubmission()}
              className="bg-purple-600 hover:bg-purple-700"
              data-testid="button-confirm-change-order"
            >
              Submit Change Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}