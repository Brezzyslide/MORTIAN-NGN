import { useState, useEffect } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, 
  UserPlus, 
  Users, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Copy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Create user schema - removed tenantId as backend will set companyId from auth context
const createUserSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(['admin', 'team_leader', 'user', 'viewer'], {
    errorMap: () => ({ message: "Please select a valid role" })
  }),
  temporaryPassword: z.string().min(8, "Password must be at least 8 characters"),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  mustChangePassword?: boolean;
  failedLoginCount?: number;
  lockedUntil?: string | null;
  tenantId?: string;
  companyId?: string;
  createdAt: string;
}

interface Company {
  id: string;
  name: string;
  industry?: string;
  status: string;
}

const roleDescriptions = {
  admin: {
    title: "Administrator",
    description: "Full tenant management and user administration",
    color: "bg-red-500"
  },
  team_leader: {
    title: "Team Leader", 
    description: "Project oversight and team member management",
    color: "bg-blue-500"
  },
  user: {
    title: "User",
    description: "Access to assigned projects and cost entry capabilities", 
    color: "bg-green-500"
  },
  viewer: {
    title: "Viewer",
    description: "Read-only access to project information and reports",
    color: "bg-gray-500"
  }
};

const statusColors = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  inactive: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", 
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
};

export default function AdminUsers() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    document.title = "User Management - ProjectFund";
  }, []);

  // Get current user from auth context
  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/auth/user'],
    staleTime: 60_000,
  });

  // Get available roles based on current user's role
  const getAvailableRoles = () => {
    switch (currentUser?.role) {
      case 'console_manager':
        return ['admin', 'team_leader', 'user', 'viewer'];
      case 'admin':
        return ['team_leader', 'user', 'viewer'];
      default:
        return []; // Other roles cannot create users
    }
  };

  const availableRoles = getAvailableRoles();

  // Generate secure password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Fetch current user's company for display only
  const { data: currentCompany } = useQuery<Company>({
    queryKey: ['/api/auth/company'],
    enabled: !!currentUser,
    staleTime: 60_000,
  });

  // Fetch users
  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    staleTime: 30_000,
  });

  // Create user form
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      role: "user",
      temporaryPassword: ""
    }
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormValues) => {
      // Remove any tenantId/companyId from payload - backend will set from auth context
      const { ...payloadData } = data;
      const response = await apiRequest('POST', '/api/admin/users', payloadData);
      return response as unknown as User;
    },
    onSuccess: (response: User) => {
      toast({
        title: "User Created Successfully",
        description: `${response.firstName} ${response.lastName} has been added to the system.`,
      });
      setCreateDialogOpen(false);
      form.reset();
      setGeneratedPassword("");
      refetchUsers();
    },
    onError: (error: any) => {
      const errorMessage = error?.errors?.length > 0 
        ? error.errors.map((e: any) => e.message).join(", ")
        : error.message || "Failed to create user. Please try again.";
      toast({
        title: "User Creation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string, data: any }) => 
      apiRequest('PATCH', `/api/admin/users/${userId}`, data),
    onSuccess: () => {
      toast({
        title: "User Updated",
        description: "User has been updated successfully.",
      });
      refetchUsers();
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update user.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: CreateUserFormValues) => {
    createUserMutation.mutate(data);
  };

  const handleGeneratePassword = () => {
    const password = generatePassword();
    setGeneratedPassword(password);
    form.setValue('temporaryPassword', password);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: "Password has been copied to clipboard.",
    });
  };

  const toggleUserStatus = (user: User) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    updateUserMutation.mutate({
      userId: user.id,
      data: { status: newStatus }
    });
  };

  const resetPassword = (user: User) => {
    updateUserMutation.mutate({
      userId: user.id,
      data: { resetPassword: true }
    });
  };

  const isAccountLocked = (user: User) => {
    return user.lockedUntil && new Date() < new Date(user.lockedUntil);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Users className="w-8 h-8 mr-3" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Create and manage user accounts for your organization
          </p>
        </div>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-user">
              <UserPlus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="user@company.com" 
                          {...field} 
                          data-testid="input-create-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} data-testid="input-create-firstName" />
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
                          <Input placeholder="Doe" {...field} data-testid="input-create-lastName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={availableRoles.length === 0}>
                        <FormControl>
                          <SelectTrigger data-testid="select-create-role">
                            <SelectValue placeholder={availableRoles.length === 0 ? "No permission to create users" : "Select role"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableRoles.map((roleKey) => {
                            const role = roleDescriptions[roleKey as keyof typeof roleDescriptions];
                            return (
                              <SelectItem key={roleKey} value={roleKey}>
                                <div className="flex items-center space-x-2">
                                  <div className={`w-3 h-3 rounded-full ${role.color}`} />
                                  <div>
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
                      {availableRoles.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          You don't have permission to create users
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                {/* Company Display - Auto-populated from current user context */}
                <div className="space-y-2">
                  <Label>Company</Label>
                  <div className="px-3 py-2 bg-muted/30 border border-dashed rounded-md text-sm flex items-center justify-between" data-testid="text-current-company">
                    <div className="flex items-center space-x-2">
                      <span>{currentCompany?.name || "Loading..."}</span>
                      {currentCompany?.industry && (
                        <span className="text-muted-foreground">({currentCompany.industry})</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-sm">Auto-populated</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    New users will be added to your company automatically
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="temporaryPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between">
                        Temporary Password
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleGeneratePassword}
                          data-testid="button-generate-password"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Generate
                        </Button>
                      </FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input 
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter temporary password"
                            {...field}
                            data-testid="input-create-password"
                          />
                        </FormControl>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex space-x-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowPassword(!showPassword)}
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </Button>
                          {field.value && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(field.value)}
                              data-testid="button-copy-password"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createUserMutation.isPending || availableRoles.length === 0}
                    data-testid="button-submit-create-user"
                  >
                    {createUserMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create User"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  User Accounts
                </div>
                <Badge variant="secondary" data-testid="badge-user-count">
                  {users.length} Users
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  Loading users...
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No users found</h3>
                  <p className="text-muted-foreground">Create your first user to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Security</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                          <TableCell>
                            <div>
                              <div className="font-medium" data-testid={`text-username-${user.id}`}>
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={roleDescriptions[user.role as keyof typeof roleDescriptions]?.color}
                              data-testid={`badge-role-${user.id}`}
                            >
                              {roleDescriptions[user.role as keyof typeof roleDescriptions]?.title || user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col space-y-1">
                              <Badge 
                                className={statusColors[user.status as keyof typeof statusColors]}
                                data-testid={`badge-status-${user.id}`}
                              >
                                {user.status}
                              </Badge>
                              {isAccountLocked(user) && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Locked
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col space-y-1 text-xs">
                              {user.mustChangePassword && (
                                <Badge variant="outline" className="text-xs">
                                  Must Change Password
                                </Badge>
                              )}
                              {user.failedLoginCount && user.failedLoginCount > 0 && (
                                <span className="text-amber-600">
                                  {user.failedLoginCount} failed attempts
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleUserStatus(user)}
                                disabled={updateUserMutation.isPending}
                                data-testid={`button-toggle-status-${user.id}`}
                              >
                                {user.status === 'active' ? (
                                  <>
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Activate
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resetPassword(user)}
                                disabled={updateUserMutation.isPending}
                                data-testid={`button-reset-password-${user.id}`}
                              >
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Reset Password
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Activity logs will be shown here in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}