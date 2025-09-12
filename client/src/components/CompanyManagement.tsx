import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Building2, Mail, Phone, MapPin, Calendar } from "lucide-react";
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
import { insertCompanySchema } from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";

const addCompanyFormSchema = insertCompanySchema.extend({
  name: z.string().min(1, "Company name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  address: z.string().optional(),
  industry: z.string().optional(),
  subscriptionPlan: z.enum(["basic", "professional", "enterprise"]).default("basic"),
});

type AddCompanyFormData = z.infer<typeof addCompanyFormSchema>;

export function CompanyManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch companies
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["/api/companies"],
  });

  // Add company mutation
  const addCompanyMutation = useMutation({
    mutationFn: (data: AddCompanyFormData) => apiRequest("/api/companies", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      setIsAddDialogOpen(false);
      toast({
        title: "Success",
        description: "Company created successfully",
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

  const form = useForm<AddCompanyFormData>({
    resolver: zodResolver(addCompanyFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      industry: "",
      subscriptionPlan: "basic",
    },
  });

  const handleSubmit = (data: AddCompanyFormData) => {
    addCompanyMutation.mutate(data);
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
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Company</DialogTitle>
              <DialogDescription>
                Create a new tenant company in the system
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
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
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input 
                          data-testid="input-company-email"
                          type="email"
                          placeholder="Enter contact email" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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
          </DialogContent>
        </Dialog>
      </div>

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