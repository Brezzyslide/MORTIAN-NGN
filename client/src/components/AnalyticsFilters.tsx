import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar as CalendarIcon, 
  Filter, 
  X, 
  ChevronDown,
  Building,
  Clock
} from "lucide-react";
import { format, subDays, startOfMonth, subMonths } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

interface Project {
  id: string;
  title: string;
  budget: string;
  status: string;
}

interface AnalyticsFiltersProps {
  filters: {
    startDate?: Date;
    endDate?: Date;
    projectId?: string;
    categories?: string[];
  };
  onFiltersChange: (filters: {
    startDate?: Date;
    endDate?: Date;
    projectId?: string;
    categories?: string[];
  }) => void;
}

const CATEGORY_OPTIONS = [
  { value: 'land_purchase', label: 'Land Purchase' },
  { value: 'site_preparation', label: 'Site Preparation' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'structural', label: 'Structural' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'finishing', label: 'Finishing' },
  { value: 'external_works', label: 'External Works' },
  { value: 'development_resources', label: 'Development' },
  { value: 'design_tools', label: 'Design Tools' },
  { value: 'testing_qa', label: 'Testing & QA' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'operations', label: 'Operations' },
  { value: 'miscellaneous', label: 'Miscellaneous' }
];

const DATE_PRESETS = [
  {
    label: 'Last 7 days',
    value: 'last_7_days',
    getDateRange: () => ({
      startDate: subDays(new Date(), 7),
      endDate: new Date()
    })
  },
  {
    label: 'Last 30 days',
    value: 'last_30_days',
    getDateRange: () => ({
      startDate: subDays(new Date(), 30),
      endDate: new Date()
    })
  },
  {
    label: 'Last 3 months',
    value: 'last_3_months',
    getDateRange: () => ({
      startDate: subMonths(new Date(), 3),
      endDate: new Date()
    })
  },
  {
    label: 'This month',
    value: 'this_month',
    getDateRange: () => ({
      startDate: startOfMonth(new Date()),
      endDate: new Date()
    })
  },
  {
    label: 'Last month',
    value: 'last_month',
    getDateRange: () => ({
      startDate: startOfMonth(subMonths(new Date(), 1)),
      endDate: subDays(startOfMonth(new Date()), 1)
    })
  }
];

export default function AnalyticsFilters({ filters, onFiltersChange }: AnalyticsFiltersProps) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<{from?: Date; to?: Date}>({
    from: filters.startDate,
    to: filters.endDate
  });
  const { user } = useAuth();
  const tenantId = user?.tenantId;

  // Fetch projects for project filter
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects", tenantId],
    enabled: Boolean(tenantId),
    retry: false,
  });

  // Update local date range when filters change
  useEffect(() => {
    setSelectedDateRange({
      from: filters.startDate,
      to: filters.endDate
    });
  }, [filters.startDate, filters.endDate]);

  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    setSelectedDateRange(range);
    onFiltersChange({
      ...filters,
      startDate: range.from,
      endDate: range.to
    });
  };

  const handleDatePresetSelect = (preset: string) => {
    const presetData = DATE_PRESETS.find(p => p.value === preset);
    if (presetData) {
      const { startDate, endDate } = presetData.getDateRange();
      handleDateRangeChange({ from: startDate, to: endDate });
      setIsDatePickerOpen(false);
    }
  };

  const handleProjectChange = (projectId: string) => {
    onFiltersChange({
      ...filters,
      projectId: projectId === 'all' ? undefined : projectId
    });
  };

  const handleCategoryToggle = (categoryValue: string, checked: boolean) => {
    const currentCategories = filters.categories || [];
    let newCategories;

    if (checked) {
      newCategories = [...currentCategories, categoryValue];
    } else {
      newCategories = currentCategories.filter(cat => cat !== categoryValue);
    }

    onFiltersChange({
      ...filters,
      categories: newCategories.length > 0 ? newCategories : undefined
    });
  };

  const handleSelectAllCategories = () => {
    onFiltersChange({
      ...filters,
      categories: CATEGORY_OPTIONS.map(opt => opt.value)
    });
  };

  const handleClearAllCategories = () => {
    onFiltersChange({
      ...filters,
      categories: undefined
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      startDate: undefined,
      endDate: undefined,
      projectId: undefined,
      categories: undefined
    });
    setSelectedDateRange({ from: undefined, to: undefined });
  };

  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.startDate || 
      filters.endDate || 
      filters.projectId || 
      (filters.categories && filters.categories.length > 0)
    );
  }, [filters]);

  const getSelectedCategoriesText = () => {
    if (!filters.categories || filters.categories.length === 0) {
      return "All categories";
    }
    if (filters.categories.length === 1) {
      const category = CATEGORY_OPTIONS.find(opt => opt.value === filters.categories![0]);
      return category?.label || "1 category";
    }
    return `${filters.categories.length} categories`;
  };

  const formatDateRange = () => {
    if (!selectedDateRange.from) return "Select date range";
    if (!selectedDateRange.to) return format(selectedDateRange.from, "MMM dd, yyyy");
    return `${format(selectedDateRange.from, "MMM dd")} - ${format(selectedDateRange.to, "MMM dd, yyyy")}`;
  };

  return (
    <Card className="card-shadow border border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Analytics Filters</span>
          </span>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              data-testid="button-clear-all-filters"
            >
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Filter analytics data by date range, project, and categories
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Date Range Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Date Range</label>
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  data-testid="button-date-range"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatDateRange()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3 border-b">
                  <div className="flex flex-wrap gap-2">
                    {DATE_PRESETS.map((preset) => (
                      <Button
                        key={preset.value}
                        variant="outline"
                        size="sm"
                        onClick={() => handleDatePresetSelect(preset.value)}
                        data-testid={`button-preset-${preset.value}`}
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={selectedDateRange.from}
                  selected={{
                    from: selectedDateRange.from,
                    to: selectedDateRange.to
                  }}
                  onSelect={(range) => {
                    handleDateRangeChange({
                      from: range?.from,
                      to: range?.to
                    });
                  }}
                  numberOfMonths={2}
                />
                <div className="p-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleDateRangeChange({ from: undefined, to: undefined });
                      setIsDatePickerOpen(false);
                    }}
                    className="w-full"
                  >
                    Clear Date Range
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Project Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Project</label>
            <Select
              value={filters.projectId || 'all'}
              onValueChange={handleProjectChange}
            >
              <SelectTrigger data-testid="select-project">
                <Building className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects && projects.length > 0 ? (
                  projects
                    .filter(project => project.status === 'active')
                    .map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.title}
                      </SelectItem>
                    ))
                ) : (
                  <SelectItem value="none" disabled>
                    No projects available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Categories</label>
            <Popover open={isCategoryPickerOpen} onOpenChange={setIsCategoryPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  data-testid="button-categories"
                >
                  <span className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    {getSelectedCategoriesText()}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <div className="p-3 border-b">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Select Categories</h4>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAllCategories}
                        data-testid="button-select-all-categories"
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearAllCategories}
                        data-testid="button-clear-categories"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto p-3">
                  <div className="space-y-3">
                    {CATEGORY_OPTIONS.map((category) => (
                      <div key={category.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={category.value}
                          checked={filters.categories?.includes(category.value) || false}
                          onCheckedChange={(checked) => 
                            handleCategoryToggle(category.value, checked as boolean)
                          }
                          data-testid={`checkbox-category-${category.value}`}
                        />
                        <label
                          htmlFor={category.value}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {category.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              <span className="text-sm font-medium">Active filters:</span>
              
              {selectedDateRange.from && (
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <CalendarIcon className="h-3 w-3" />
                  <span>{formatDateRange()}</span>
                  <button
                    onClick={() => handleDateRangeChange({ from: undefined, to: undefined })}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {filters.projectId && (
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <Building className="h-3 w-3" />
                  <span>
                    {projects?.find(p => p.id === filters.projectId)?.title || 'Project'}
                  </span>
                  <button
                    onClick={() => handleProjectChange('all')}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {filters.categories && filters.categories.length > 0 && (
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <Filter className="h-3 w-3" />
                  <span>{getSelectedCategoriesText()}</span>
                  <button
                    onClick={handleClearAllCategories}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}