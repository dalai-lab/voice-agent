import { AlertCircle, Calendar, CheckSquare, Hash, ListFilter, Radio, RefreshCw, Tag, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { DateRangeFilter } from "@/components/filters/DateRangeFilter";
import { MultiSelectFilter } from "@/components/filters/MultiSelectFilter";
import { NumberFilter } from "@/components/filters/NumberFilter";
import { NumberRangeFilter } from "@/components/filters/NumberRangeFilter";
import { NumberSelectFilter } from "@/components/filters/NumberSelectFilter";
import { RadioFilter } from "@/components/filters/RadioFilter";
import { TagInputFilter } from "@/components/filters/TagInputFilter";
import { TextFilter } from "@/components/filters/TextFilter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatDateRange, formatNumberRange, getDefaultValue, validateFilter } from "@/lib/filters";
import { ActiveFilter, DateRangeValue, FilterAttribute, FilterTemplate, filterTemplates, FilterValue, MultiSelectValue, NumberRangeValue, NumberValue, RadioValue, TextValue } from "@/types/filters";

interface FilterBuilderProps {
  availableAttributes: FilterAttribute[];
  activeFilters: ActiveFilter[];
  onFiltersChange: (filters: ActiveFilter[]) => void;
  onApplyFilters: () => void;
  onClearFilters?: () => void;
  isExecuting?: boolean;
  autoRefresh?: boolean;
  onAutoRefreshChange?: (enabled: boolean) => void;
  hasAppliedFilters?: boolean;
}

export const FilterBuilder: React.FC<FilterBuilderProps> = ({
  availableAttributes,
  activeFilters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
  isExecuting = false,
  autoRefresh = false,
  onAutoRefreshChange,
  hasAppliedFilters = false,
}) => {
  const [selectedAttribute, setSelectedAttribute] = useState<string>("");
  const [expandedFilters, setExpandedFilters] = useState<Set<number>>(new Set());

  // Auto-expand new filters
  useEffect(() => {
    if (activeFilters.length > 0) {
      setExpandedFilters(new Set([activeFilters.length - 1]));
    }
  }, [activeFilters.length]);

  // Handle Command+Enter (Mac) or Ctrl+Enter (Windows/Linux) to apply filters
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
      const isModifierPressed = isMac ? event.metaKey : event.ctrlKey;

      if (isModifierPressed && event.key === 'Enter') {
        event.preventDefault();
        const allFiltersValid = activeFilters.every(f => f.isValid);
        const canApply = (activeFilters.length > 0 && allFiltersValid) || (activeFilters.length === 0 && hasAppliedFilters);
        if (canApply && !isExecuting) {
          onApplyFilters();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeFilters, isExecuting, onApplyFilters, hasAppliedFilters]);

  const addFilter = useCallback((attributeId: string) => {
    const attribute = availableAttributes.find(attr => attr.id === attributeId);
    if (!attribute) return;

    const defaultValue = getDefaultValue(attribute.type);
    const newFilter: ActiveFilter = {
      attribute,
      value: defaultValue,
      isValid: false,
    };

    onFiltersChange([...activeFilters, newFilter]);
    setSelectedAttribute("");
  }, [availableAttributes, activeFilters, onFiltersChange]);

  const updateFilter = useCallback((index: number, value: FilterValue) => {
    const newFilters = [...activeFilters];
    newFilters[index].value = value;
    newFilters[index].isValid = validateFilter(newFilters[index]) === null;
    onFiltersChange(newFilters);
  }, [activeFilters, onFiltersChange]);

  const removeFilter = useCallback((index: number) => {
    onFiltersChange(activeFilters.filter((_, i) => i !== index));
    setExpandedFilters(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
  }, [activeFilters, onFiltersChange]);

  const clearAllFilters = useCallback(() => {
    onFiltersChange([]);
    setExpandedFilters(new Set());
    if (onClearFilters) {
      onClearFilters();
    }
  }, [onFiltersChange, onClearFilters]);

  const applyTemplate = useCallback((template: FilterTemplate) => {
    const newFilters: ActiveFilter[] = template.filters.map(filterConfig => {
      const attribute = availableAttributes.find(attr => attr.id === filterConfig.attributeId);
      if (!attribute) {
        console.warn(`Attribute ${filterConfig.attributeId} not found`);
        return null;
      }

      const filter: ActiveFilter = {
        attribute,
        value: filterConfig.value,
        isValid: false,
      };
      filter.isValid = validateFilter(filter) === null;
      return filter;
    }).filter((f): f is ActiveFilter => f !== null);

    onFiltersChange(newFilters);
    setExpandedFilters(new Set());
  }, [availableAttributes, onFiltersChange]);

  const toggleFilterExpanded = (index: number) => {
    setExpandedFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const getFilterIcon = (type: FilterAttribute["type"]) => {
    switch (type) {
      case "dateRange":
        return <Calendar className="h-4 w-4" />;
      case "multiSelect":
        return <CheckSquare className="h-4 w-4" />;
      case "number":
      case "numberRange":
        return <Hash className="h-4 w-4" />;
      case "numberSelect":
        return <ListFilter className="h-4 w-4" />;
      case "radio":
        return <Radio className="h-4 w-4" />;
      case "tags":
        return <Tag className="h-4 w-4" />;
      case "text":
        return <Hash className="h-4 w-4" />;
    }
  };

  const getFilterSummary = (filter: ActiveFilter): string => {
    switch (filter.attribute.type) {
      case "dateRange":
        return formatDateRange(filter.value as DateRangeValue);
      case "multiSelect": {
        const value = filter.value as MultiSelectValue;
        if (value.codes.length === 0) return "No options selected";
        if (value.codes.length <= 3) return value.codes.join(", ");
        return `${value.codes.slice(0, 3).join(", ")} +${value.codes.length - 3} more`;
      }
      case "number": {
        const value = filter.value as NumberValue;
        return value.value !== null ? value.value.toString() : "No value";
      }
      case "numberSelect": {
        const value = filter.value as NumberValue;
        if (value.value === null) return "No value";
        return filter.attribute.config.numberSelectOptions?.find(option => option.value === value.value)?.label
          || value.value.toString();
      }
      case "numberRange":
        return formatNumberRange(filter.value as NumberRangeValue, filter.attribute.config.unit);
      case "radio": {
        const value = filter.value as RadioValue;
        const option = filter.attribute.config.radioOptions?.find(opt => opt.value === value.status);
        return option?.label || value.status;
      }
      case "tags": {
        const value = filter.value as MultiSelectValue;
        if (value.codes.length === 0) return "No tags";
        if (value.codes.length <= 3) return value.codes.join(", ");
        return `${value.codes.slice(0, 3).join(", ")} +${value.codes.length - 3} more`;
      }
      case "text": {
        const value = filter.value as TextValue;
        return value.value || "No value";
      }
    }
  };

  const renderFilterInput = (filter: ActiveFilter, index: number) => {
    const error = filter.isValid ? undefined : validateFilter(filter) || undefined;

    switch (filter.attribute.type) {
      case "dateRange":
        return (
          <DateRangeFilter
            value={filter.value as DateRangeValue}
            onChange={(value) => updateFilter(index, value)}
            error={error}
            presets={filter.attribute.config.datePresets}
          />
        );
      case "multiSelect":
        return (
          <MultiSelectFilter
            options={filter.attribute.config.options || []}
            value={filter.value as MultiSelectValue}
            onChange={(value) => updateFilter(index, value)}
            error={error}
            showSelectAll={filter.attribute.config.showSelectAll}
            searchable={filter.attribute.config.searchable}
          />
        );
      case "number":
        return (
          <NumberFilter
            value={filter.value as NumberValue}
            onChange={(value) => updateFilter(index, value)}
            error={error}
            placeholder={filter.attribute.config.placeholder}
            min={filter.attribute.config.min}
            max={filter.attribute.config.max}
            step={filter.attribute.config.step}
          />
        );
      case "numberSelect":
        return (
          <NumberSelectFilter
            value={filter.value as NumberValue}
            onChange={(value) => updateFilter(index, value)}
            error={error}
            label={filter.attribute.config.numberSelectLabel}
            placeholder={filter.attribute.config.placeholder}
            options={filter.attribute.config.numberSelectOptions || []}
            isLoading={filter.attribute.config.numberSelectOptionsLoading}
          />
        );
      case "numberRange":
        return (
          <NumberRangeFilter
            value={filter.value as NumberRangeValue}
            onChange={(value) => updateFilter(index, value)}
            error={error}
            unit={filter.attribute.config.unit}
            min={filter.attribute.config.min}
            max={filter.attribute.config.max}
            step={filter.attribute.config.step}
            presets={filter.attribute.config.numberPresets}
          />
        );
      case "radio":
        return (
          <RadioFilter
            value={filter.value as RadioValue}
            onChange={(value) => updateFilter(index, value)}
            error={error}
            options={filter.attribute.config.radioOptions || []}
          />
        );
      case "tags":
        return (
          <TagInputFilter
            value={filter.value as MultiSelectValue}
            onChange={(value) => updateFilter(index, value)}
            error={error}
          />
        );
      case "text":
        return (
          <TextFilter
            value={filter.value as TextValue}
            onChange={(value) => updateFilter(index, value)}
            error={error}
            placeholder={filter.attribute.config.placeholder}
            maxLength={filter.attribute.config.maxLength}
          />
        );
    }
  };

  const allFiltersValid = activeFilters.every(f => f.isValid);
  const availableAttributesForAdding = availableAttributes.filter(
    attr => !activeFilters.some(f => f.attribute.id === attr.id)
  );

  return (
    <div className="border border-border bg-card/30 rounded-xl p-5 shadow-xs mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4 mb-4">
        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground">Filter Workflow Runs</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Build custom filters to find specific workflow runs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs font-semibold px-3 bg-card/40 hover:bg-muted border-border">
                Templates
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[250px] border border-border bg-popover rounded-xl shadow-md p-1.5">
              <DropdownMenuLabel className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/60 px-2 py-1.5">Filter Templates</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/60 my-1" />
              {filterTemplates.map((template) => (
                <DropdownMenuItem
                  key={template.id}
                  onClick={() => applyTemplate(template)}
                  className="rounded-lg px-2 py-1.5 cursor-pointer focus:bg-muted/80"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-foreground">{template.name}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      {template.description}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="space-y-4">
        {/* Add Filter Row */}
        <div className="flex gap-2">
          <Select value={selectedAttribute} onValueChange={(value) => {
            addFilter(value);
          }}>
            <SelectTrigger className="flex-1 h-9 rounded-lg text-xs border border-border bg-card/30">
              <SelectValue placeholder="Select attribute to filter by" />
            </SelectTrigger>
            <SelectContent className="border border-border bg-popover rounded-xl shadow-md">
              {availableAttributesForAdding.map((attr) => (
                <SelectItem key={attr.id} value={attr.id} className="rounded-lg text-xs cursor-pointer">
                  <div className="flex items-center gap-2">
                    {getFilterIcon(attr.type)}
                    <span>{attr.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground/80">Active Filters</h4>
              {activeFilters.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-7 text-[10px] font-bold text-muted-foreground hover:text-foreground"
                >
                  Clear All
                </Button>
              )}
            </div>

            {activeFilters.map((filter, index) => (
              <div
                key={index}
                className={`border border-border/80 bg-card/25 rounded-lg transition-all overflow-hidden ${
                  filter.isValid ? "" : "border-rose-500/30 bg-rose-500/[0.02]"
                }`}
              >
                <div
                  className="flex items-center justify-between cursor-pointer px-4 py-3 hover:bg-muted/10 transition-colors"
                  onClick={() => toggleFilterExpanded(index)}
                >
                  <div className="flex items-center gap-2">
                    <div className="text-muted-foreground">
                      {getFilterIcon(filter.attribute.type)}
                    </div>
                    <span className="text-xs font-bold text-foreground">{filter.attribute.label}</span>
                    {!filter.isValid && (
                      <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2.5">
                    {!expandedFilters.has(index) && (
                      <span className="text-xs font-semibold text-muted-foreground/80">
                        {getFilterSummary(filter)}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFilter(index);
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {expandedFilters.has(index) && (
                  <div className="border-t border-border/60 bg-card/10 px-4 py-4.5">
                    {renderFilterInput(filter, index)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Apply Filters Button */}
        {(activeFilters.length > 0 || hasAppliedFilters) && (
          <div className="flex justify-between items-center gap-2 pt-2 border-t border-border/40 mt-4">
            {/* Auto-refresh toggle on the left */}
            {onAutoRefreshChange && (
              <div className="flex items-center space-x-2">
                <Switch
                  checked={autoRefresh}
                  onCheckedChange={onAutoRefreshChange}
                  id="auto-refresh"
                  className="data-[state=checked]:bg-cta"
                />
                <label htmlFor="auto-refresh" className="text-xs font-bold text-muted-foreground/85 cursor-pointer">
                  Auto-refresh every 5s
                </label>
                {autoRefresh && (
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground/60 animate-spin" />
                )}
              </div>
            )}

            {/* Buttons on the right */}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                onClick={clearAllFilters}
                className="h-8 text-xs rounded-lg font-semibold border-border hover:bg-muted"
              >
                Clear All
              </Button>
              <Button
                onClick={onApplyFilters}
                disabled={(activeFilters.length > 0 && !allFiltersValid) || isExecuting}
                title={"Apply filters"}
                className="h-8 text-xs rounded-lg font-bold bg-cta hover:bg-cta/90 text-white"
              >
                {isExecuting ? "Applying..." : `Apply (${navigator.userAgent.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'}+Enter)`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
