import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Building2, Mail, Phone, MapPin, Calendar, Shield, Edit, Key } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCompanySchema, Company } from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";

const addCompanyFormSchema = insertCompanySchema.extend({
  name: z.string().min(1, "Company name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  address: z.string().optional(),
  industry: z.string().optional(),
  subscriptionPlan: z.enum(["basic", "professional", "enterprise"]).default("basic"),
  adminPassword: z.string().min(8, "Password must be at least 8 characters long")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  confirmPassword: z.string(),
}).refine((data) => data.adminPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const editCompanyFormSchema = insertCompanySchema.omit({ createdBy: true }).extend({
  name: z.string().min(1, "Company name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  address: z.string().optional(),
  industry: z.string().optional(),
  subscriptionPlan: z.enum(["basic", "professional", "enterprise"]).default("basic"),
});

const changePasswordFormSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters long")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AddCompanyFormData = z.infer<typeof addCompanyFormSchema>;
type EditCompanyFormData = z.infer<typeof editCompanyFormSchema>;
type ChangePasswordFormData = z.infer<typeof changePasswordFormSchema>;

export function CompanyManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { permissions } = usePermissions();

  // Check if user has permission to manage companies (console managers only)
  if (!permissions.canManageCompanies()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-600 mb-2">Access Denied</h2>
          <p className="text-gray-500">You don't have permission to manage companies.</p>
        </div>
      </div>
    );
  }

  // Fetch companies
  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  // Add company mutation
  const addCompanyMutation = useMutation({
    mutationFn: (data: AddCompanyFormData) => apiRequest("POST", "/api/companies", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      setIsAddDialogOpen(false);
      addForm.reset();
      toast({
        title: "Success",
        description: "Company and admin account created successfully",
      });
    },
    onError: (error: any) => {
      console.error("Error creating company:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create company",
        variant: "destructive",
      });
    },
  });

  // Edit company mutation
  const editCompanyMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditCompanyFormData }) => 
      apiRequest("PATCH", `/api/companies/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      setIsEditDialogOpen(false);
      setSelectedCompany(null);
      toast({
        title: "Success",
        description: "Company updated successfully",
      });
    },
    onError: (error: any) => {
      console.error("Error updating company:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update company",
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: ({ companyId, data }: { companyId: string; data: ChangePasswordFormData }) => 
      apiRequest("POST", `/api/companies/${companyId}/change-password`, data),
    onSuccess: () => {
      setIsPasswordDialogOpen(false);
      setSelectedCompany(null);
      passwordForm.reset();
      toast({
        title: "Success",
        description: "Company admin password changed successfully",
      });
    },
    onError: (error: any) => {
      console.error("Error changing password:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  // Populate industry templates mutation
  const populateIndustryMutation = useMutation({
    mutationFn: ({ companyId, industry }: { companyId: string; industry: string }) => 
      apiRequest("POST", `/api/companies/${companyId}/populate-industry`, { industry }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/line-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      toast({
        title: "Success",
        description: `Industry templates populated: ${data.lineItemsCreated} line items and ${data.materialsCreated} materials created`,
      });
    },
    onError: (error: any) => {
      console.error("Error populating industry templates:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to populate industry templates",
        variant: "destructive",
      });
    },
  });

  const addForm = useForm<AddCompanyFormData>({
    resolver: zodResolver(addCompanyFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      industry: "",
      subscriptionPlan: "basic",
      adminPassword: "",
      confirmPassword: "",
    },
  });

  const editForm = useForm<EditCompanyFormData>({
    resolver: zodResolver(editCompanyFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      industry: "",
      subscriptionPlan: "basic",
    },
  });

  const passwordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const handleAddSubmit = (data: AddCompanyFormData) => {
    addCompanyMutation.mutate(data);
  };

  const handleEditSubmit = (data: EditCompanyFormData) => {
    if (!selectedCompany) return;
    editCompanyMutation.mutate({ id: selectedCompany.id, data });
  };

  const handlePasswordSubmit = (data: ChangePasswordFormData) => {
    if (!selectedCompany) return;
    changePasswordMutation.mutate({ companyId: selectedCompany.id, data });
  };

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company);
    editForm.reset({
      name: company.name,
      email: company.email,
      phone: company.phone || "",
      address: company.address || "",
      industry: company.industry || "",
      subscriptionPlan: company.subscriptionPlan as "basic" | "professional" | "enterprise",
      status: company.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleChangePassword = (company: Company) => {
    setSelectedCompany(company);
    passwordForm.reset();
    setIsPasswordDialogOpen(true);
  };


  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Company Management</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Company Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage tenant companies and their subscription plans
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-company" className="gap-2">
              <Plus className="h-4 w-4" />
              Add New Company
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Add New Company</DialogTitle>
              <DialogDescription>
                Create a new tenant company in the system
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto flex-1 pr-2">
              <Form {...addForm}>
                <form onSubmit={addForm.handleSubmit(handleAddSubmit)} className="space-y-4">
                <FormField
                  control={addForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input 
                          data-testid="input-company-name"
                          placeholder="Enter company name" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin Email (Login)</FormLabel>
                      <FormControl>
                        <Input 
                          data-testid="input-company-email"
                          type="email"
                          placeholder="Enter admin email for login" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="adminPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin Password</FormLabel>
                      <FormControl>
                        <Input 
                          data-testid="input-admin-password"
                          type="password"
                          placeholder="Enter admin password" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input 
                          data-testid="input-confirm-password"
                          type="password"
                          placeholder="Confirm admin password" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input 
                          data-testid="input-company-phone"
                          placeholder="Enter phone number" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <FormControl>
                        <Input 
                          data-testid="input-company-industry"
                          placeholder="e.g., Construction, Real Estate" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea 
                          data-testid="input-company-address"
                          placeholder="Enter company address" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="subscriptionPlan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subscription Plan</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-subscription-plan">
                            <SelectValue placeholder="Select a subscription plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddDialogOpen(false)}
                    data-testid="button-cancel-company"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={addCompanyMutation.isPending}
                    data-testid="button-submit-company"
                  >
                    {addCompanyMutation.isPending ? "Creating..." : "Create Company"}
                  </Button>
                </div>
              </form>
            </Form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Company Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>
              Update company information
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input 
                        data-testid="input-edit-company-name"
                        placeholder="Enter company name" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Email</FormLabel>
                    <FormControl>
                      <Input 
                        data-testid="input-edit-company-email"
                        type="email"
                        placeholder="Enter admin email" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input 
                        data-testid="input-edit-company-phone"
                        placeholder="Enter phone number" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-company-industry">
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="construction">Construction</SelectItem>
                        <SelectItem value="real_estate">Real Estate</SelectItem>
                        <SelectItem value="manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="software_development">Software Development</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {field.value && (
                      <div className="mt-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            if (!selectedCompany) return;
                            populateIndustryMutation.mutate({ 
                              companyId: selectedCompany.id, 
                              industry: field.value 
                            });
                          }}
                          disabled={populateIndustryMutation.isPending}
                          data-testid="button-populate-industry"
                        >
                          {populateIndustryMutation.isPending ? "Populating..." : "Load Industry Templates"}
                        </Button>
                        <p className="text-sm text-muted-foreground mt-1">
                          Click to populate line items and materials for this industry
                        </p>
                      </div>
                    )}
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea 
                        data-testid="input-edit-company-address"
                        placeholder="Enter company address" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="subscriptionPlan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subscription Plan</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-subscription-plan">
                          <SelectValue placeholder="Select a subscription plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  data-testid="button-cancel-edit-company"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={editCompanyMutation.isPending}
                  data-testid="button-submit-edit-company"
                >
                  {editCompanyMutation.isPending ? "Updating..." : "Update Company"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Change Admin Password</DialogTitle>
            <DialogDescription>
              {selectedCompany ? `Change admin password for ${selectedCompany.name}` : "Change admin password"}
            </DialogDescription>
          </DialogHeader>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input 
                        data-testid="input-new-password"
                        type="password"
                        placeholder="Enter new password" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input 
                        data-testid="input-confirm-new-password"
                        type="password"
                        placeholder="Confirm new password" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsPasswordDialogOpen(false)}
                  data-testid="button-cancel-change-password"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={changePasswordMutation.isPending}
                  data-testid="button-submit-change-password"
                >
                  {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies.map((company: any) => (
          <Card key={company.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <span data-testid={`text-company-name-${company.id}`}>{company.name}</span>
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Badge 
                  variant={company.status === 'active' ? 'default' : 'secondary'}
                  data-testid={`badge-company-status-${company.id}`}
                >
                  {company.status}
                </Badge>
                <Badge 
                  variant="outline"
                  data-testid={`badge-company-plan-${company.id}`}
                >
                  {company.subscriptionPlan}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {company.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Mail className="h-4 w-4" />
                    <span data-testid={`text-company-email-${company.id}`}>{company.email}</span>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Phone className="h-4 w-4" />
                    <span data-testid={`text-company-phone-${company.id}`}>{company.phone}</span>
                  </div>
                )}
                {company.address && (
                  <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    <span data-testid={`text-company-address-${company.id}`} className="line-clamp-2">{company.address}</span>
                  </div>
                )}
                {company.industry && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <span data-testid={`text-company-industry-${company.id}`}>Industry: {company.industry}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                  <Calendar className="h-3 w-3" />
                  <span data-testid={`text-company-created-${company.id}`}>
                    Created {new Date(company.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditCompany(company)}
                  className="flex-1 gap-2"
                  data-testid={`button-edit-company-${company.id}`}
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleChangePassword(company)}
                  className="flex-1 gap-2"
                  data-testid={`button-change-password-${company.id}`}
                >
                  <Key className="h-4 w-4" />
                  Password
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {companies.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Companies Found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Get started by creating your first company tenant.
          </p>
          <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-first-company">
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Company
          </Button>
        </div>
      )}
    </div>
  );
}