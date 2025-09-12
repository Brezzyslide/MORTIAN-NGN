import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertCostAllocationSchema } from "@shared/schema";

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

// Main form schema
const costEntrySchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  lineItemId: z.string().min(1, "Line item is required"),
  labourCost: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Labour cost must be a positive number",
  }),
  quantity: z.string().min(1, "Quantity is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Quantity must be a positive number",
  }),
  unitCost: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Unit cost must be a positive number",
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

export default function CostEntryForm() {
  const { toast } = useToast();
  const [grandTotal, setGrandTotal] = useState(0);
  const [labourTotal, setLabourTotal] = useState(0);
  const [materialTotal, setMaterialTotal] = useState(0);

  const form = useForm<CostEntryFormData>({
    resolver: zodResolver(costEntrySchema),
    defaultValues: {
      projectId: "",
      lineItemId: "",
      labourCost: "0",
      quantity: "1",
      unitCost: "0",
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

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
    retry: false,
  });

  // Fetch line items
  const { data: lineItemsData, isLoading: lineItemsLoading } = useQuery({
    queryKey: ["/api/line-items"],
    retry: false,
  });

  // Fetch materials
  const { data: materials, isLoading: materialsLoading } = useQuery({
    queryKey: ["/api/materials"],
    retry: false,
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
      
      // Invalidate all analytics-related queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ["/api/cost-allocations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/budget-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/labour-material-split"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/category-spending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cost-allocations-filtered"] });
      
      // Also invalidate broader analytics queries that may contain cost allocation data
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create cost allocation",
        variant: "destructive",
      });
    },
  });

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

  const handleMaterialSelect = (index: number, materialId: string) => {
    if (materials && Array.isArray(materials)) {
      const selectedMaterial = materials.find((m: any) => m.id === materialId);
      if (selectedMaterial) {
        form.setValue(`materialAllocations.${index}.unitPrice`, selectedMaterial.currentUnitPrice.toString());
      }
    }
  };

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

    const payload = {
      projectId: data.projectId,
      lineItemId: data.lineItemId,
      labourCost: labourCost,
      materialCost: materialCost,
      quantity: Number(data.quantity),
      unitCost: Number(data.unitCost),
      totalCost: totalCost,
      materialAllocations: materialAllocations,
    };

    createCostAllocation.mutate(payload);
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
                      <Select onValueChange={field.onChange} value={field.value}>
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

              {/* Basic Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-quantity" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unitCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Cost ($)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-unit-cost" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                          <FormLabel>Labour Cost ($)</FormLabel>
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
                          ${labourTotal.toFixed(2)}
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
                          <TableHead>Unit Price ($)</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Total ($)</TableHead>
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
                                  ${rowTotal.toFixed(2)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => remove(index)}
                                  data-testid={`button-remove-material-${index}`}
                                >
                                  <i className="fas fa-trash text-destructive"></i>
                                </Button>
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
                          Material Total: <span className="text-primary" data-testid="text-material-total">${materialTotal.toFixed(2)}</span>
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
                        ${grandTotal.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-sm text-muted-foreground">Labour: ${labourTotal.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">Materials: ${materialTotal.toFixed(2)}</div>
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
    </div>
  );
}