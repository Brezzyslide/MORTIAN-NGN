import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ImportResult {
  success: number;
  errors: Array<{
    row: number;
    data: any;
    error: string;
  }>;
}

export default function CsvImportExport() {
  const [transactionsCsv, setTransactionsCsv] = useState("");
  const [allocationsCsv, setAllocationsCsv] = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Import mutations
  const importTransactionsMutation = useMutation({
    mutationFn: async (csvData: string): Promise<ImportResult> => {
      const response = await fetch('/api/import/transactions/csv', {
        method: 'POST',
        body: JSON.stringify({ csvData }),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error('Failed to import transactions');
      }
      return response.json();
    },
    onSuccess: (result: ImportResult) => {
      setImportResult(result);
      // Invalidate related queries to refresh UI data
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/tenant'] });
      queryClient.invalidateQueries({ queryKey: ['/api/audit-logs'] });
      toast({
        title: "Import Complete",
        description: `Successfully imported ${result.success} transactions${result.errors.length > 0 ? ` with ${result.errors.length} errors` : ''}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import transactions",
        variant: "destructive",
      });
    }
  });

  const importAllocationsMutation = useMutation({
    mutationFn: async (csvData: string): Promise<ImportResult> => {
      const response = await fetch('/api/import/allocations/csv', {
        method: 'POST',
        body: JSON.stringify({ csvData }),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error('Failed to import allocations');
      }
      return response.json();
    },
    onSuccess: (result: ImportResult) => {
      setImportResult(result);
      // Invalidate all related queries since allocation imports create both allocations and transactions
      queryClient.invalidateQueries({ queryKey: ['/api/fund-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/tenant'] });
      queryClient.invalidateQueries({ queryKey: ['/api/audit-logs'] });
      toast({
        title: "Import Complete",
        description: `Successfully imported ${result.success} allocations${result.errors.length > 0 ? ` with ${result.errors.length} errors` : ''}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import allocations",
        variant: "destructive",
      });
    }
  });

  // Export handlers
  const handleExportTransactions = () => {
    window.open('/api/export/transactions/csv', '_blank');
  };

  const handleExportAllocations = () => {
    window.open('/api/export/allocations/csv', '_blank');
  };

  // Import handlers
  const handleImportTransactions = () => {
    if (!transactionsCsv.trim()) {
      toast({
        title: "No Data",
        description: "Please paste CSV data before importing",
        variant: "destructive",
      });
      return;
    }
    importTransactionsMutation.mutate(transactionsCsv);
  };

  const handleImportAllocations = () => {
    if (!allocationsCsv.trim()) {
      toast({
        title: "No Data",
        description: "Please paste CSV data before importing",
        variant: "destructive",
      });
      return;
    }
    importAllocationsMutation.mutate(allocationsCsv);
  };

  return (
    <div className="space-y-6">
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            CSV Import/Export
          </CardTitle>
          <CardDescription>
            Bulk import and export transaction and allocation data via CSV files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="export" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="export" data-testid="tab-export">Export Data</TabsTrigger>
              <TabsTrigger value="import" data-testid="tab-import">Import Data</TabsTrigger>
            </TabsList>

            <TabsContent value="export" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Export Transactions</CardTitle>
                    <CardDescription>
                      Download all transactions as CSV
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={handleExportTransactions}
                      className="w-full"
                      data-testid="button-export-transactions"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Transactions CSV
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Export Allocations</CardTitle>
                    <CardDescription>
                      Download all fund allocations as CSV
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={handleExportAllocations}
                      className="w-full"
                      data-testid="button-export-allocations"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Allocations CSV
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="import" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Import Transactions</CardTitle>
                    <CardDescription>
                      Paste CSV data with columns: projectId, type, amount, category, description
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      placeholder="projectId,type,amount,category,description&#10;proj-1,expense,150.00,office,Office supplies&#10;proj-1,revenue,2000.00,sales,Product sales"
                      value={transactionsCsv}
                      onChange={(e) => setTransactionsCsv(e.target.value)}
                      className="min-h-[120px] font-mono text-sm"
                      data-testid="textarea-transactions-csv"
                    />
                    <Button 
                      onClick={handleImportTransactions}
                      disabled={importTransactionsMutation.isPending}
                      className="w-full"
                      data-testid="button-import-transactions"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {importTransactionsMutation.isPending ? "Importing..." : "Import Transactions"}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Import Allocations</CardTitle>
                    <CardDescription>
                      Paste CSV data with columns: projectId, toUserId, amount, category, description
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      placeholder="projectId,toUserId,amount,category,description&#10;proj-1,user-123,5000.00,marketing,Initial budget allocation&#10;proj-2,user-456,3000.00,development_resources,Development budget"
                      value={allocationsCsv}
                      onChange={(e) => setAllocationsCsv(e.target.value)}
                      className="min-h-[120px] font-mono text-sm"
                      data-testid="textarea-allocations-csv"
                    />
                    <Button 
                      onClick={handleImportAllocations}
                      disabled={importAllocationsMutation.isPending}
                      className="w-full"
                      data-testid="button-import-allocations"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {importAllocationsMutation.isPending ? "Importing..." : "Import Allocations"}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {importResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {importResult.errors.length === 0 ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                      )}
                      Import Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-4">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {importResult.success} Successful
                      </Badge>
                      {importResult.errors.length > 0 && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          {importResult.errors.length} Errors
                        </Badge>
                      )}
                    </div>

                    {importResult.errors.length > 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-2">
                            <p className="font-medium">Import Errors:</p>
                            <div className="max-h-48 overflow-y-auto space-y-1">
                              {importResult.errors.map((error, index) => (
                                <div key={index} className="text-sm bg-red-50 p-2 rounded">
                                  <strong>Row {error.row}:</strong> {error.error}
                                </div>
                              ))}
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}