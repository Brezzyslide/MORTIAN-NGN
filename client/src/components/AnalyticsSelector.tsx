import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Building2, BarChart3, Globe } from "lucide-react";
import type { Project } from "@shared/schema";

interface AnalyticsSelectorProps {
  selectedProjectId: string | null;
  onProjectChange: (projectId: string | null) => void;
}

export default function AnalyticsSelector({ selectedProjectId, onProjectChange }: AnalyticsSelectorProps) {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const [, setLocation] = useLocation();

  // Fetch accessible projects for the dropdown
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects", tenantId],
    enabled: Boolean(tenantId),
    retry: false,
  });

  const selectedProject = projects?.find(p => p.id === selectedProjectId);

  const handleProjectChange = (value: string) => {
    const newProjectId = value === "all" ? null : value;
    onProjectChange(newProjectId);

    // Update URL with query parameter
    const searchParams = new URLSearchParams(window.location.search);
    if (newProjectId) {
      searchParams.set("projectId", newProjectId);
    } else {
      searchParams.delete("projectId");
    }
    
    const newUrl = `/analytics${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    setLocation(newUrl);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency', 
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="border border-border mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Budget Analytics</h2>
              <p className="text-sm text-muted-foreground">
                {selectedProject 
                  ? `Viewing analytics for ${selectedProject.title}`
                  : "Organizational overview across all accessible projects"
                }
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Analytics Mode Badge */}
            <Badge 
              variant={selectedProject ? "default" : "secondary"}
              className="text-xs"
              data-testid="analytics-mode-badge"
            >
              <div className="flex items-center space-x-1">
                {selectedProject ? (
                  <>
                    <Building2 className="w-3 h-3" />
                    <span>Project Analytics</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3 h-3" />
                    <span>Organizational Overview</span>
                  </>
                )}
              </div>
            </Badge>

            {/* Project Selector */}
            <div className="min-w-[250px]">
              <Select
                value={selectedProjectId || "all"}
                onValueChange={handleProjectChange}
                disabled={isLoading}
              >
                <SelectTrigger data-testid="project-selector">
                  <SelectValue placeholder="Select project scope..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="option-all-projects">
                    <div className="flex items-center space-x-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span>All Projects (Organizational View)</span>
                    </div>
                  </SelectItem>
                  {projects && projects.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-t">
                        Available Projects
                      </div>
                      {projects.map((project) => (
                        <SelectItem 
                          key={project.id} 
                          value={project.id}
                          data-testid={`option-project-${project.id}`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-2">
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                              <span className="truncate max-w-[150px]" title={project.title}>
                                {project.title}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <span>{formatCurrency(parseFloat(project.budget))}</span>
                              <Badge 
                                variant={project.status === 'active' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {project.status}
                              </Badge>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Selected Project Summary */}
        {selectedProject && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Budget:</span>
                <p className="font-medium">{formatCurrency(parseFloat(selectedProject.budget))}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Revenue:</span>
                <p className="font-medium">{formatCurrency(parseFloat(selectedProject.revenue || "0"))}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Period:</span>
                <p className="font-medium">
                  {new Date(selectedProject.startDate).toLocaleDateString()} - {new Date(selectedProject.endDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <Badge 
                  variant={selectedProject.status === 'active' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {selectedProject.status}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}