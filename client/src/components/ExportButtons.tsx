import { Button } from "@/components/ui/button";
import { Download, FileText, DollarSign, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ExportButtonsProps {
  projectId?: string;
  userId?: string;
  showProjectExport?: boolean;
  showUserSpendExport?: boolean;
  showProfitStatementExport?: boolean;
  startDate?: string;
  endDate?: string;
}

export function ExportButtons({
  projectId,
  userId,
  showProjectExport = false,
  showUserSpendExport = false,
  showProfitStatementExport = false,
  startDate,
  endDate
}: ExportButtonsProps) {
  const { user } = useAuth();

  const downloadFile = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleProjectExport = () => {
    if (!projectId) return;
    const url = `/api/export/project/${projectId}/pdf`;
    downloadFile(url, `project-${projectId}-summary.pdf`);
  };

  const handleUserSpendExport = () => {
    if (!userId) return;
    let url = `/api/export/user-spend/${userId}/pdf`;
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }
    downloadFile(url, `user-${userId}-spend-report.pdf`);
  };

  const handleProfitStatementExport = () => {
    let url = '/api/export/profit-statement/pdf';
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }
    downloadFile(url, 'profit-statement.pdf');
  };

  const canExportUserSpend = (user as any)?.role === 'manager' || (user as any)?.role === 'team_leader';
  const canExportProfitStatement = (user as any)?.role === 'manager';

  return (
    <div className="flex gap-2 flex-wrap">
      {showProjectExport && projectId && (
        <Button 
          onClick={handleProjectExport}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          data-testid="button-export-project-pdf"
        >
          <FileText className="w-4 h-4" />
          Export Project PDF
        </Button>
      )}

      {showUserSpendExport && userId && canExportUserSpend && (
        <Button 
          onClick={handleUserSpendExport}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          data-testid="button-export-user-spend-pdf"
        >
          <User className="w-4 h-4" />
          Export User Spend PDF
        </Button>
      )}

      {showProfitStatementExport && canExportProfitStatement && (
        <Button 
          onClick={handleProfitStatementExport}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          data-testid="button-export-profit-statement-pdf"
        >
          <DollarSign className="w-4 h-4" />
          Export Profit Statement PDF
        </Button>
      )}
    </div>
  );
}