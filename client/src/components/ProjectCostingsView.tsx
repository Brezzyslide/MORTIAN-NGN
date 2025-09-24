import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Building2, 
  Calculator, 
  Users, 
  Package, 
  Calendar,
  DollarSign,
  Filter,
  Eye
} from "lucide-react";

interface CostAllocation {
  id: string;
  projectId: string;
  lineItemId: string;
  labourCost: string;
  materialCost: string;
  totalCost: string;
  dateIncurred: string;
  enteredBy: string;
  status: string;
  createdAt: string;
  lineItemName: string;
  lineItemCategory: string;
  projectTitle: string;
  enteredByName: string;
  changeOrderId?: string | null;
  changeOrderDescription?: string | null;
  materialAllocations: Array<{
    id: string;
    materialId: string;
    quantity: string;
    unitPrice: string;
    total: string;
    material: {
      name: string;
      unit: string;
      supplier: string;
    };
  }>;
}

interface CostAllocationsResponse {
  allocations: CostAllocation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ProjectCostGroup {
  projectId: string;
  projectTitle: string;
  costAllocations: CostAllocation[];
  totals: {
    labourCost: number;
    materialCost: number;
    totalCost: number;
    entryCount: number;
  };
}

export default function ProjectCostingsView() {
  const { toast } = useToast();
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // Fetch all cost allocations
  const { data: costAllocationsData, isLoading, error } = useQuery<CostAllocationsResponse>({
    queryKey: ["/api/cost-allocations-filtered", tenantId, "all"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/cost-allocations-filtered?tenantId=${tenantId}&status=all`);
      return await response.json();
    },
    enabled: Boolean(tenantId),
    retry: false,
  });

  // Handle authentication errors
  useEffect(() => {
    if (error && isUnauthorizedError(error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  // Group cost allocations by project
  const projectGroups = useMemo(() => {
    if (!costAllocationsData?.allocations) return [];

    const groups: { [projectId: string]: ProjectCostGroup } = {};

    costAllocationsData.allocations.forEach((allocation: CostAllocation) => {
      const projectId = allocation.projectId;
      
      if (!groups[projectId]) {
        groups[projectId] = {
          projectId,
          projectTitle: allocation.projectTitle,
          costAllocations: [],
          totals: {
            labourCost: 0,
            materialCost: 0,
            totalCost: 0,
            entryCount: 0,
          },
        };
      }

      groups[projectId].costAllocations.push(allocation);
      groups[projectId].totals.labourCost += parseFloat(allocation.labourCost) || 0;
      groups[projectId].totals.materialCost += parseFloat(allocation.materialCost) || 0;
      groups[projectId].totals.totalCost += parseFloat(allocation.totalCost) || 0;
      groups[projectId].totals.entryCount += 1;
    });

    return Object.values(groups);
  }, [costAllocationsData]);

  // Filter projects based on search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projectGroups;

    return projectGroups.filter((project) =>
      project.projectTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.costAllocations.some((allocation) =>
        allocation.lineItemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        allocation.enteredByName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [projectGroups, searchQuery]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <Card className="card-shadow border border-border">
        <CardHeader>
          <CardTitle>Project Costings Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-16 bg-gray-100 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="card-shadow border border-border">
        <CardHeader>
          <CardTitle>Project Costings Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Unable to load project costings. Please try again.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-shadow border border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">Project Costings Overview</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Cost entries organized by project ({filteredProjects.length} projects)
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpandedProjects(new Set(filteredProjects.map(p => p.projectId)))}
              data-testid="button-expand-all"
            >
              <Eye className="w-4 h-4 mr-2" />
              Expand All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpandedProjects(new Set())}
              data-testid="button-collapse-all"
            >
              <Filter className="w-4 h-4 mr-2" />
              Collapse All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search Input */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search projects or cost entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-projects"
            />
          </div>
        </div>

        {/* Projects List */}
        <div className="space-y-4">
          {filteredProjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No costings found</p>
              <p className="text-sm">
                {searchQuery ? "Try adjusting your search query" : "No cost entries have been created yet"}
              </p>
            </div>
          ) : (
            filteredProjects.map((project) => (
              <Collapsible
                key={project.projectId}
                open={expandedProjects.has(project.projectId)}
                onOpenChange={() => toggleProject(project.projectId)}
              >
                <Card className="border border-border hover:shadow-md transition-shadow">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Building2 className="w-5 h-5 text-primary" />
                          <div>
                            <h3 className="font-semibold text-lg" data-testid={`text-project-title-${project.projectId}`}>
                              {project.projectTitle}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {project.totals.entryCount} cost entries
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Total Cost</p>
                            <p className="font-semibold text-lg" data-testid={`text-project-total-${project.projectId}`}>
                              {formatCurrency(project.totals.totalCost)}
                            </p>
                          </div>
                          {expandedProjects.has(project.projectId) ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {/* Project Summary */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-muted/20 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-blue-600" />
                          <div>
                            <p className="text-sm text-muted-foreground">Labour Cost</p>
                            <p className="font-medium" data-testid={`text-labour-total-${project.projectId}`}>
                              {formatCurrency(project.totals.labourCost)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Package className="w-4 h-4 text-green-600" />
                          <div>
                            <p className="text-sm text-muted-foreground">Material Cost</p>
                            <p className="font-medium" data-testid={`text-material-total-${project.projectId}`}>
                              {formatCurrency(project.totals.materialCost)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calculator className="w-4 h-4 text-purple-600" />
                          <div>
                            <p className="text-sm text-muted-foreground">Grand Total</p>
                            <p className="font-semibold text-primary" data-testid={`text-grand-total-${project.projectId}`}>
                              {formatCurrency(project.totals.totalCost)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Cost Entries */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-muted-foreground mb-3">Cost Entries</h4>
                        {project.costAllocations.map((allocation) => (
                          <Card key={allocation.id} className="border-l-4 border-l-primary/30">
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <h5 className="font-medium" data-testid={`text-line-item-${allocation.id}`}>
                                      {allocation.lineItemName}
                                    </h5>
                                    <Badge className={`text-xs ${getStatusColor(allocation.status)}`}>
                                      {allocation.status}
                                    </Badge>
                                    {allocation.changeOrderDescription && (
                                      <Badge variant="outline" className="text-xs">
                                        Change Order
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                    <div>
                                      <p className="text-muted-foreground">Labour</p>
                                      <p className="font-medium">{formatCurrency(parseFloat(allocation.labourCost))}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Materials</p>
                                      <p className="font-medium">{formatCurrency(parseFloat(allocation.materialCost))}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Total</p>
                                      <p className="font-semibold text-primary">{formatCurrency(parseFloat(allocation.totalCost))}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Date</p>
                                      <p className="font-medium">{formatDate(allocation.dateIncurred)}</p>
                                    </div>
                                  </div>

                                  {/* Material Details */}
                                  {allocation.materialAllocations.length > 0 && (
                                    <div className="mt-3 pt-3 border-t">
                                      <p className="text-sm text-muted-foreground mb-2">Materials Used:</p>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {allocation.materialAllocations.map((material) => (
                                          <div key={material.id} className="flex items-center justify-between text-xs bg-muted/30 p-2 rounded">
                                            <span className="font-medium">
                                              {material.material.name} ({material.quantity} {material.material.unit})
                                            </span>
                                            <span className="text-primary">
                                              {formatCurrency(parseFloat(material.total))}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center justify-between mt-3 pt-2 border-t text-xs text-muted-foreground">
                                    <span>Entered by: {allocation.enteredByName}</span>
                                    <span className="flex items-center space-x-1">
                                      <Calendar className="w-3 h-3" />
                                      <span>{formatDate(allocation.createdAt)}</span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}