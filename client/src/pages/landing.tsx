import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Building2, Shield, Users, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  mustChangePassword?: boolean;
}

export default function Landing() {
  const [loginError, setLoginError] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    document.title = "ProjectFund - Login";
  }, []);

  // Form setup
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (data: LoginFormValues) => apiRequest('POST', '/api/auth/login', data),
    onSuccess: (response: any) => {
      toast({
        title: "Login Successful",
        description: "Welcome to ProjectFund!",
      });
      
      // Check if user must change password
      if (response?.user?.mustChangePassword) {
        // Store login state and redirect to password change
        sessionStorage.setItem('pendingPasswordChange', 'true');
        sessionStorage.setItem('pendingUser', JSON.stringify(response.user));
        window.location.href = '/change-password';
        return;
      }
      
      // Normal login flow - invalidate auth query to trigger redirect
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* User Login Form */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-2xl text-center">
                🔐 User Login
              </CardTitle>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Sign in to your account
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Email Field */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="your.email@company.com" 
                            {...field} 
                            data-testid="input-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Password Field */}
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Enter your password" 
                            {...field} 
                            data-testid="input-password"
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
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* OIDC Login & Features */}
          <div className="space-y-6">
            {/* OIDC Login Card - Primary Method */}
            <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
              <CardHeader>
                <CardTitle className="text-2xl text-center text-green-800 dark:text-green-200">
                  🔐 Alternative: Secure Login
                </CardTitle>
                <p className="text-sm text-green-700 dark:text-green-300 text-center">
                  Use your Replit account for secure authentication with full access controls
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
                <p className="text-xs text-muted-foreground text-center">
                  Secure authentication with automatic role assignment and access controls
                </p>
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
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Secure Authentication</p>
                      <p className="text-xs text-muted-foreground">BCrypt password hashing and session management</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Multi-Tenant Support</p>
                      <p className="text-xs text-muted-foreground">Isolated data and role-based access controls</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Project Budget Management</p>
                      <p className="text-xs text-muted-foreground">Track allocations, expenses, and financial analytics</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Admin Control</p>
                      <p className="text-xs text-muted-foreground">User creation and management by administrators</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Need access?</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Contact your system administrator to create an account for you.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}