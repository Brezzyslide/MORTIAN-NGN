import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import AdminUsers from "@/pages/admin-users";
import ChangePassword from "@/pages/change-password";
import TeamsList from "@/components/TeamsList";

function ProtectedRoute({ component: Component }: { component: any }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return <Component />;
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/">
        {() => {
          if (isLoading) {
            return (
              <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              </div>
            );
          }
          return isAuthenticated ? <Dashboard /> : <Home />;
        }}
      </Route>
      <Route path="/login" component={Landing} />
      <Route path="/change-password" component={ChangePassword} />
      <Route path="/projects" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/allocations" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/fund-allocation" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/cost-entry" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/transactions" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/analytics" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/audit" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/users" component={() => <ProtectedRoute component={AdminUsers} />} />
      <Route path="/admin/users" component={() => <ProtectedRoute component={AdminUsers} />} />
      <Route path="/teams" component={() => <ProtectedRoute component={TeamsList} />} />
      <Route path="/companies" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/permissions" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/budget-amendments" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/change-orders" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/budget-history" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
