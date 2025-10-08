import Sidebar from "@/components/Sidebar";
import FundAllocationPanel from "@/components/FundAllocationPanel";
import CsvImportExport from "@/components/CsvImportExport";
import { usePermissions } from "@/hooks/usePermissions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function AllocationsPage() {
  const { isAdmin, isTeamLeader } = usePermissions();

  if (!isAdmin && !isTeamLeader) {
    return (
      <div className="min-h-screen flex bg-background">
        <Sidebar />
        
        <div className="flex-1 ml-64 p-6">
          <Alert variant="destructive" data-testid="alert-access-denied">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Access Denied: You don't have permission to access fund allocations. Only administrators and team leaders can access this page.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
      <div className="flex-1 ml-64 p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              Fund Allocation
            </h2>
            <p className="text-muted-foreground mt-1">
              Allocate funds to projects and team members
            </p>
          </div>
        </div>

        <div className="mb-8">
          <FundAllocationPanel />
        </div>
        <div className="mb-8">
          <CsvImportExport />
        </div>
      </div>
    </div>
  );
}
