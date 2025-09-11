import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Landing() {
  useEffect(() => {
    document.title = "ProjectFund - Multi-Tenant Project Management";
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <i className="fas fa-project-diagram text-white text-lg"></i>
            </div>
            <h1 className="text-4xl font-bold text-foreground">ProjectFund</h1>
          </div>
          <p className="text-xl text-muted-foreground mb-8">
            Multi-Tenant Hierarchical Budgeting System
          </p>
        </div>

        <Card className="max-w-md mx-auto card-shadow">
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold mb-4">Welcome</h2>
                <p className="text-muted-foreground">
                  Manage your projects and fund allocations with hierarchical role-based access control.
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center text-sm text-muted-foreground">
                  <i className="fas fa-check text-green-600 mr-3"></i>
                  <span>Manager → Team Leader → User hierarchy</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <i className="fas fa-check text-green-600 mr-3"></i>
                  <span>Project-based fund allocations</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <i className="fas fa-check text-green-600 mr-3"></i>
                  <span>Real-time analytics dashboard</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <i className="fas fa-check text-green-600 mr-3"></i>
                  <span>Complete audit trail</span>
                </div>
              </div>

              <Button
                onClick={() => window.location.href = '/api/login'}
                className="w-full"
                data-testid="button-login"
              >
                <i className="fas fa-sign-in-alt mr-2"></i>
                Sign In to Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
