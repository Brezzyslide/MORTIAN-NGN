import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Users, Crown, Shield, User, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  tenantId: z.string().min(1, "Please select a company"),
  role: z.enum(['team_leader', 'user', 'viewer'], {
    errorMap: () => ({ message: "Please select a valid role" })
  })
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface Company {
  id: string;
  name: string;
  industry?: string;
  status: string;
}

const roleDescriptions = {
  team_leader: {
    title: "Team Leader",
    description: "Project oversight and team member management",
    icon: Users,
    color: "bg-blue-500"
  },
  user: {
    title: "User",
    description: "Access to assigned projects and cost entry capabilities",
    icon: User,
    color: "bg-green-500"
  },
  viewer: {
    title: "Viewer",
    description: "Read-only access to project information and reports",
    icon: Eye,
    color: "bg-gray-500"
  }
};

export default function Landing() {
  const [loginError, setLoginError] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Check if manual login is enabled (for development/demo only)
  const isManualLoginEnabled = import.meta.env.VITE_ENABLE_MANUAL_LOGIN === 'true';
  const isProduction = import.meta.env.PROD;

  useEffect(() => {
    document.title = "ProjectFund - Login";
  }, []);

  // Fetch available companies
  const { data: companies = [], isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ['/api/auth/companies'],
    staleTime: 60_000,
  });

  // Form setup
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      tenantId: "",
      role: "user"
    }
  });

  // Manual login mutation
  const loginMutation = useMutation({
    mutationFn: (data: LoginFormValues) => apiRequest('POST', '/api/auth/manual-login', data),
    onSuccess: () => {
      toast({
        title: "Login Successful",
        description: "Welcome to ProjectFund!",
      });
      // Invalidate auth query to trigger redirect
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      window.location.reload();
    },
    onError: (error: any) => {
      const errorMessage = error?.errors?.length > 0 
        ? error.errors.map((e: any) => e.message).join(", ")
        : error.message || "Login failed. Please try again.";
      setLoginError(errorMessage);
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: LoginFormValues) => {
    setLoginError("");
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-foreground">ProjectFund</h1>
          </div>
          <p className="text-xl text-muted-foreground">
            Multi-Tenant Hierarchical Budgeting System
          </p>
        </div>

        <div className={`grid grid-cols-1 ${isManualLoginEnabled ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-8 max-w-5xl mx-auto`}>
          {/* Manual Login Form - Development/Demo Only */}
          {isManualLoginEnabled && (
            <Card className="w-full border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
              <CardHeader>
                <CardTitle className="text-2xl text-center text-amber-800 dark:text-amber-200">
                  ⚠️ Development Access
                </CardTitle>
                <div className="text-center space-y-2">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Quick access for development and demonstration only
                  </p>
                  {isProduction && (
                    <Alert variant="destructive" className="text-left">
                      <AlertDescription className="text-xs">
                        ⚠️ Manual login should not be used in production environments
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Company Selection */}
                  <FormField
                    control={form.control}
                    name="tenantId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={companiesLoading}>
                          <FormControl>
                            <SelectTrigger data-testid="select-company">
                              <SelectValue placeholder={companiesLoading ? "Loading companies..." : "Select your company"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {companies.map((company) => (
                              <SelectItem key={company.id} value={company.id}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{company.name}</span>
                                  {company.industry && (
                                    <Badge variant="outline" className="ml-2">
                                      {company.industry}
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Role Selection */}
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-role">
                              <SelectValue placeholder="Select your role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(roleDescriptions).map(([key, role]) => {
                              const IconComponent = role.icon;
                              return (
                                <SelectItem key={key} value={key}>
                                  <div className="flex items-center space-x-3">
                                    <div className={`w-4 h-4 rounded-full ${role.color} flex items-center justify-center`}>
                                      <IconComponent className="w-2.5 h-2.5 text-white" />
                                    </div>
                                    <div className="text-left">
                                      <div className="font-medium">{role.title}</div>
                                      <div className="text-xs text-muted-foreground">{role.description}</div>
                                    </div>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Name Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="John" 
                              {...field} 
                              data-testid="input-firstName"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Doe" 
                              {...field} 
                              data-testid="input-lastName"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Email Field */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="john.doe@company.com" 
                            {...field} 
                            data-testid="input-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Error Display */}
                  {loginError && (
                    <Alert variant="destructive">
                      <AlertDescription>{loginError}</AlertDescription>
                    </Alert>
                  )}

                  {/* Submit Button */}
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loginMutation.isPending}
                    data-testid="button-manual-login"
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      <>
                        <User className="w-4 h-4 mr-2" />
                        Continue with Quick Access
                      </>
                    )}
                  </Button>
                </form>
              </Form>
              {/* Security Notice for Manual Login */}
              {!isProduction && (
                <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                  <AlertDescription className="text-xs text-blue-700 dark:text-blue-300">
                    💡 Manual login restricted to safe roles: Team Leader, User, and Viewer only.
                    For administrative access, use OIDC authentication.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
          )}

          {/* OIDC Login & Features */}
          <div className="space-y-6">
            {/* OIDC Login Card - Primary Method */}
            <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
              <CardHeader>
                <CardTitle className="text-2xl text-center text-green-800 dark:text-green-200">
                  🔐 Recommended: Secure Login
                </CardTitle>
                <p className="text-sm text-green-700 dark:text-green-300 text-center">
                  {isProduction 
                    ? "Use your Replit account for secure production access"
                    : "Use your Replit account for secure authentication with full access controls"
                  }
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <Button
                  onClick={() => window.location.href = '/api/login'}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  data-testid="button-oidc-login"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Sign In with Replit
                </Button>
                {!isManualLoginEnabled && (
                  <p className="text-xs text-muted-foreground text-center">
                    Secure authentication with automatic role assignment and access controls
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Features Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Security & Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span>Hierarchical role-based access control</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span>Multi-tenant project management</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span>Real-time budget tracking & analytics</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span>Complete audit trail & compliance</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span>Advanced cost allocation & reporting</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}