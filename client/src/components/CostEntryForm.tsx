import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertCostAllocationSchema } from "@shared/schema";
import { AlertTriangle, XCircle, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Material allocation schema for dynamic rows
const materialAllocationSchema = z.object({
  materialId: z.string().min(1, "Material is required"),
  quantity: z.string().min(1, "Quantity is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Quantity must be a positive number",
  }),
  unitPrice: z.string().min(1, "Unit price is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Unit price must be a positive number",
  }),
});

// Main form schema (removed redundant quantity and unitCost fields)
const costEntrySchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  lineItemId: z.string().min(1, "Line item is required"),
  changeOrderId: z.string().optional(),
  labourCost: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Labour cost must be a positive number",
  }),
  materialAllocations: z.array(materialAllocationSchema).default([]),
}).refine(data => Number(data.labourCost) > 0 || data.materialAllocations.length > 0, {
  message: "Either labour cost or at least one material allocation is required",
  path: ["labourCost"],
});

type CostEntryFormData = z.infer<typeof costEntrySchema>;

// Category labels for line items
const categoryLabels: Record<string, string> = {
  land_purchase: "Land Purchase",
  site_preparation: "Site Preparation", 
  foundation: "Foundation",
  structural: "Structural",
  roofing: "Roofing",
  electrical: "Electrical",
  plumbing: "Plumbing",
  finishing: "Finishing",
  external_works: "External Works",
  development_resources: "Development Resources",
  design_tools: "Design Tools",
  testing_qa: "Testing & QA",
  infrastructure: "Infrastructure",
  marketing: "Marketing",
  operations: "Operations",
  miscellaneous: "Miscellaneous",
};

// Budget validation interface
interface BudgetImpactValidation {
  projectId: string;
  projectTitle: string;
  proposedCost: number;
  currentSpent: number;
  totalBudget: number;
  budgetImpact: {
    spentPercentage: number;
    newSpentPercentage: number;
    remainingBudget: number;
    status: 'healthy' | 'warning' | 'critical';
    isOverBudget: boolean;
    willExceedWarning: boolean;
    willExceedCritical: boolean;
    requiresApproval: boolean;
    alertMessage: string;
    thresholds: {
      WARNING_THRESHOLD: number;
      CRITICAL_THRESHOLD: number;
      HEALTHY_MAX: number;
    };
  };
}

export default function CostEntryForm() {
  const { toast } = useToast();
  const { permissions } = usePermissions();
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const [grandTotal, setGrandTotal] = useState(0);
  const [labourTotal, setLabourTotal] = useState(0);
  const [materialTotal, setMaterialTotal] = useState(0);
  
  // Budget validation state
  const [showBudgetAlert, setShowBudgetAlert] = useState(false);
  const [budgetValidation, setBudgetValidation] = useState<BudgetImpactValidation | null>(null);
  const [pendingSubmission, setPendingSubmission] = useState(false);

  // Check if user has permission to create cost allocations
  if (!permissions.canCreateCostAllocations()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-600 mb-2">Access Denied</h2>
          <p className="text-gray-500">You don't have permission to create cost allocations.</p>
        </div>
      </div>
    );
  }

  const form = useForm<CostEntryFormData>({
    resolver: zodResolver(costEntrySchema),
    defaultValues: {
      projectId: "",
      lineItemId: "",
      changeOrderId: "",
      labourCost: "0",
      materialAllocations: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "materialAllocations",
  });

  // Watch form values for real-time calculations
  const watchedLabourCost = form.watch("labourCost");
  const watchedMaterialAllocations = form.watch("materialAllocations");
  const watchedProjectId = form.watch("projectId");

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
    enabled: Boolean(tenantId),
    retry: false,
  });

  // Fetch line items
  const { data: lineItemsData, isLoading: lineItemsLoading } = useQuery({
    queryKey: ["/api/line-items"],
    enabled: Boolean(tenantId),
    retry: false,
  });

  // Fetch materials
  const { data: materials, isLoading: materialsLoading } = useQuery({
    queryKey: ["/api/materials"],
    enabled: Boolean(tenantId),
    retry: false,
  });

  // Fetch change orders for selected project
  const { data: changeOrders, isLoading: changeOrdersLoading } = useQuery({
    queryKey: ["/api/change-orders", watchedProjectId ? `projectId=${watchedProjectId}` : ""],
    enabled: Boolean(tenantId) && !!watchedProjectId,
    retry: false,
  });

  // Budget impact validation mutation
  const validateBudgetImpact = useMutation({
    mutationFn: async (validationData: { projectId: string; proposedCost: number }) => {
      const response = await apiRequest("POST", "/api/budget/validate-impact", validationData);
      return await response.json();
    },
    onSuccess: (data: BudgetImpactValidation) => {
      setBudgetValidation(data);
      
      // Check if this allocation requires approval or warning
      if (data.budgetImpact.willExceedWarning || data.budgetImpact.willExceedCritical) {
        setShowBudgetAlert(true);
      } else {
        // If no warnings, proceed directly with submission
        proceedWithSubmission();
      }
    },
    onError: (error: any) => {
      console.error("Budget validation error:", error);
      toast({
        title: "Budget Validation Error",
        description: "Unable to validate budget impact. Please try again.",
        variant: "destructive",
      });
      setPendingSubmission(false);
    },
  });

  // Individual material save mutation
  const saveMaterial = useMutation({
    mutationFn: async (data: { materialId: string; quantity: number; unitPrice: number; projectId: string; lineItemId: string }) => {
      const response = await apiRequest("POST", "/api/cost-allocations/material", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Material saved successfully",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/cost-allocations", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/budget-summary", tenantId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save material",
        variant: "destructive",
      });
    },
  });

  // Submit mutation
  const createCostAllocation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/cost-allocations", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Cost allocation created successfully",
      });
      form.reset();
      setPendingSubmission(false);
      setShowBudgetAlert(false);
      setBudgetValidation(null);
      
      // Invalidate all analytics-related queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ["/api/cost-allocations", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/budget-summary", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/labour-material-split", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/category-spending", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/cost-allocations-filtered", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/budget-alerts", tenantId] });
      
      // Also invalidate broader analytics queries that may contain cost allocation data
      queryClient.invalidateQueries({ queryKey: ["/api/analytics", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", tenantId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create cost allocation",
        variant: "destructive",
      });
      setPendingSubmission(false);
      setShowBudgetAlert(false);
    },
  });

  // Helper function to proceed with actual submission
  const proceedWithSubmission = () => {
    if (!pendingSubmission) return;
    
    const formData = form.getValues();
    const { projectId, lineItemId, changeOrderId, labourCost, materialAllocations } = formData;

    // Prepare submission data (removed redundant quantity/unitCost)
    const submissionData = {
      projectId,
      lineItemId,
      changeOrderId: changeOrderId && changeOrderId !== "none" ? changeOrderId : undefined,
      labourCost: Number(labourCost),
      materialAllocations: materialAllocations.map((allocation) => ({
        materialId: allocation.materialId,
        quantity: Number(allocation.quantity),
        unitPrice: Number(allocation.unitPrice),
      })),
    };

    createCostAllocation.mutate(submissionData);
  };

  // Calculate labour total
  useEffect(() => {
    const labour = Number(watchedLabourCost) || 0;
    setLabourTotal(labour);
  }, [watchedLabourCost]);

  // Calculate material total
  useEffect(() => {
    const total = watchedMaterialAllocations?.reduce((sum, material) => {
      const quantity = Number(material.quantity) || 0;
      const unitPrice = Number(material.unitPrice) || 0;
      return sum + (quantity * unitPrice);
    }, 0) || 0;
    setMaterialTotal(total);
  }, [watchedMaterialAllocations]);

  // Calculate grand total
  useEffect(() => {
    setGrandTotal(labourTotal + materialTotal);
  }, [labourTotal, materialTotal]);

  const addMaterialRow = () => {
    append({
      materialId: "",
      quantity: "1",
      unitPrice: "0",
    });
  };

  // Save individual material
  const handleSaveMaterial = (index: number) => {
    const formData = form.getValues();
    const material = formData.materialAllocations[index];
    
    // Validate material data
    if (!material.materialId || !material.quantity || !material.unitPrice) {
      toast({
        title: "Validation Error",
        description: "Please fill in all material fields before saving",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.projectId || !formData.lineItemId) {
      toast({
        title: "Validation Error", 
        description: "Please select a project and line item first",
        variant: "destructive",
      });
      return;
    }

    saveMaterial.mutate({
      materialId: material.materialId,
      quantity: Number(material.quantity),
      unitPrice: Number(material.unitPrice),
      projectId: formData.projectId,
      lineItemId: formData.lineItemId,
    });
  };

  const handleMaterialSelect = (index: number, materialId: string) => {
    if (materials && Array.isArray(materials)) {
      const selectedMaterial = materials.find((m: any) => m.id === materialId);
      if (selectedMaterial) {
        form.setValue(`materialAllocations.${index}.unitPrice`, selectedMaterial.currentUnitPrice.toString());
      }
    }
  };

  // Enhanced onSubmit with budget validation
  const onSubmit = (data: CostEntryFormData) => {
    const labourCost = Number(data.labourCost);
    const materialAllocations = data.materialAllocations.map(material => ({
      materialId: material.materialId,
      quantity: Number(material.quantity),
      unitPrice: Number(material.unitPrice),
      total: Number(material.quantity) * Number(material.unitPrice),
    }));

    const materialCost = materialAllocations.reduce((sum, material) => sum + material.total, 0);
    const totalCost = labourCost + materialCost;

    // Set pending submission state
    setPendingSubmission(true);

    // First validate budget impact before creating cost allocation
    validateBudgetImpact.mutate({
      projectId: data.projectId,
      proposedCost: totalCost,
    });
  };

  if (projectsLoading || lineItemsLoading || materialsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Loading form data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <i className="fas fa-calculator text-primary"></i>
            <span>Cost Entry Form</span>
          </CardTitle>
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start space-x-2">
              <i className="fas fa-info-circle text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"></i>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Approval Workflow:</strong> New cost allocations are created as drafts and require approval from team leaders or admins before being finalized. You can view the status in the Cost Allocations table.
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Project and Line Item Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        // Reset change order when project changes
                        form.setValue("changeOrderId", "");
                      }} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-project">
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects && Array.isArray(projects) ? projects.map((project: any) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.title}
                            </SelectItem>
                          )) : null}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lineItemId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Line Item</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-line-item">
                            <SelectValue placeholder="Select a line item" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {lineItemsData && typeof lineItemsData === 'object' ? Object.entries(lineItemsData).map(([category, items]) => (
                            <div key={category}>
                              <div className="px-2 py-1 text-sm font-semibold text-muted-foreground">
                                {categoryLabels[category] || category}
                              </div>
                              {Array.isArray(items) ? items.map((item: any) => (
                                <SelectItem key={item.id} value={item.id} className="pl-4">
                                  {item.name}
                                </SelectItem>
                              )) : null}
                            </div>
                          )) : null}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Change Order Selection */}
              {watchedProjectId && (
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="changeOrderId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Change Order (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-change-order">
                              <SelectValue placeholder="Link to a change order (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No change order</SelectItem>
                            {changeOrders && Array.isArray(changeOrders) ? 
                              changeOrders
                                .filter((co: any) => co.status === 'approved') // Only show approved change orders
                                .map((changeOrder: any) => (
                                  <SelectItem key={changeOrder.id} value={changeOrder.id}>
                                    <div className="flex items-center space-x-2">
                                      <span className="truncate max-w-xs">{changeOrder.description}</span>
                                      <span className="text-xs text-muted-foreground">
                                        (${parseFloat(changeOrder.costImpact || '0').toLocaleString()})
                                      </span>
                                    </div>
                                  </SelectItem>
                                )) 
                              : null}
                          </SelectContent>
                        </Select>
                        <div className="text-xs text-muted-foreground mt-1">
                          Only approved change orders are available for linking. This helps track costs related to scope changes.
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Basic Details */}
              {/* Removed redundant Quantity and Unit Cost fields - use Materials and Labour sections instead */}

              {/* Labour Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Labour Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="labourCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Labour Cost (₦)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" data-testid="input-labour-cost" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex items-end">
                      <div className="w-full">
                        <FormLabel>Labour Total</FormLabel>
                        <div className="text-2xl font-bold text-primary" data-testid="text-labour-total">
                          ₦{labourTotal.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Materials Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-lg">Material Details</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addMaterialRow}
                      data-testid="button-add-material"
                    >
                      <i className="fas fa-plus mr-2"></i>
                      Add Material
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {fields.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead>Unit Price (₦)</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Total (₦)</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fields.map((field, index) => {
                          const quantity = Number(form.watch(`materialAllocations.${index}.quantity`)) || 0;
                          const unitPrice = Number(form.watch(`materialAllocations.${index}.unitPrice`)) || 0;
                          const rowTotal = quantity * unitPrice;

                          return (
                            <TableRow key={field.id}>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`materialAllocations.${index}.materialId`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <Select
                                        onValueChange={(value) => {
                                          field.onChange(value);
                                          handleMaterialSelect(index, value);
                                        }}
                                        value={field.value}
                                      >
                                        <FormControl>
                                          <SelectTrigger data-testid={`select-material-${index}`}>
                                            <SelectValue placeholder="Select material" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {materials && Array.isArray(materials) ? materials.map((material: any) => (
                                            <SelectItem key={material.id} value={material.id}>
                                              {material.name} ({material.unit})
                                            </SelectItem>
                                          )) : null}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`materialAllocations.${index}.unitPrice`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input {...field} type="number" step="0.01" data-testid={`input-unit-price-${index}`} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`materialAllocations.${index}.quantity`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input {...field} type="number" step="0.01" data-testid={`input-quantity-${index}`} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="font-semibold" data-testid={`text-row-total-${index}`}>
                                  ₦{rowTotal.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSaveMaterial(index)}
                                    disabled={saveMaterial.isPending}
                                    data-testid={`button-save-material-${index}`}
                                  >
                                    {saveMaterial.isPending ? (
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                                    ) : (
                                      <i className="fas fa-save text-green-600"></i>
                                    )}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => remove(index)}
                                    data-testid={`button-remove-material-${index}`}
                                  >
                                    <i className="fas fa-trash text-destructive"></i>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No materials added. Click "Add Material" to get started.
                    </div>
                  )}

                  {fields.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-end">
                        <div className="text-lg font-semibold">
                          Material Total: <span className="text-primary" data-testid="text-material-total">₦{materialTotal.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Grand Total Section */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Grand Total</div>
                      <div className="text-3xl font-bold text-primary" data-testid="text-grand-total">
                        ₦{grandTotal.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-sm text-muted-foreground">Labour: ₦{labourTotal.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</div>
                      <div className="text-sm text-muted-foreground">Materials: ₦{materialTotal.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={() => form.reset()}>
                  Reset Form
                </Button>
                <Button
                  type="submit"
                  disabled={createCostAllocation.isPending}
                  data-testid="button-save-cost-allocation"
                >
                  {createCostAllocation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save mr-2"></i>
                      Save Cost Allocation
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Budget Impact Alert Dialog */}
      <AlertDialog open={showBudgetAlert} onOpenChange={setShowBudgetAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>Budget Impact Warning</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              {budgetValidation && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Current Spent</div>
                      <div className="text-lg font-semibold">
                        ₦{budgetValidation.currentSpent.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {budgetValidation.budgetImpact.spentPercentage.toFixed(1)}% of budget
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">After This Allocation</div>
                      <div className="text-lg font-semibold text-orange-600">
                        ₦{(budgetValidation.currentSpent + budgetValidation.proposedCost).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {budgetValidation.budgetImpact.newSpentPercentage.toFixed(1)}% of budget
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <div className={`p-1 rounded-full ${
                      budgetValidation.budgetImpact.status === 'critical' ? 'bg-red-100' :
                      budgetValidation.budgetImpact.status === 'warning' ? 'bg-orange-100' : 'bg-green-100'
                    }`}>
                      {budgetValidation.budgetImpact.status === 'critical' ? 
                        <XCircle className="h-4 w-4 text-red-600" /> :
                      budgetValidation.budgetImpact.status === 'warning' ? 
                        <AlertTriangle className="h-4 w-4 text-orange-600" /> :
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      }
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{budgetValidation.budgetImpact.alertMessage}</div>
                      {budgetValidation.budgetImpact.requiresApproval && (
                        <div className="text-xs text-muted-foreground mt-1">
                          This allocation will require manager approval before being finalized.
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Progress 
                    value={budgetValidation.budgetImpact.newSpentPercentage} 
                    className="w-full"
                  />
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setPendingSubmission(false);
              setShowBudgetAlert(false);
              setBudgetValidation(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowBudgetAlert(false);
              proceedWithSubmission();
            }}>
              Proceed Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}