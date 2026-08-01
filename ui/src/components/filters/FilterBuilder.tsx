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
    <div className="w-full space-y-3 mb-6">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Add Filter Dropdown */}
          <Select
            value={selectedAttribute}
            onValueChange={(value) => {
              addFilter(value);
            }}
          >
            <SelectTrigger className="h-8 text-xs border border-border/80 bg-background/60 hover:bg-accent/40 rounded-lg px-2.5 min-w-[180px] max-w-[240px]">
              <SelectValue placeholder="+ Filter by attribute..." />
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

          {/* Templates Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs font-medium px-2.5 bg-background/60 hover:bg-accent/40 border-border/80 text-muted-foreground hover:text-foreground">
                Templates
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[240px] border border-border bg-popover rounded-xl shadow-md p-1.5">
              <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 px-2 py-1">Filter Templates</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/60 my-1" />
              {filterTemplates.map((template) => (
                <DropdownMenuItem
                  key={template.id}
                  onClick={() => applyTemplate(template)}
                  className="rounded-lg px-2 py-1.5 cursor-pointer focus:bg-accent/60"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-foreground">{template.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {template.description}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Auto-refresh toggle */}
          {onAutoRefreshChange && (
            <div className="flex items-center space-x-1.5 ml-2 border-l border-border/40 pl-3">
              <Switch
                checked={autoRefresh}
                onCheckedChange={onAutoRefreshChange}
                id="auto-refresh"
                className="scale-90 data-[state=checked]:bg-cta"
              />
              <label htmlFor="auto-refresh" className="text-xs text-muted-foreground/80 cursor-pointer select-none">
                Live (5s)
              </label>
              {autoRefresh && (
                <RefreshCw className="h-3 w-3 text-muted-foreground/60 animate-spin" />
              )}
            </div>
          )}
        </div>

        {/* Action Buttons on Right */}
        {(activeFilters.length > 0 || hasAppliedFilters) && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-8 text-xs rounded-lg font-medium text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
            <Button
              onClick={onApplyFilters}
              disabled={(activeFilters.length > 0 && !allFiltersValid) || isExecuting}
              title={"Apply filters"}
              className="h-8 text-xs rounded-lg font-semibold bg-cta hover:bg-cta/90 text-cta-foreground px-3"
            >
              {isExecuting ? "Applying..." : "Apply Filters"}
            </Button>
          </div>
        )}
      </div>

      {/* Active Filter Cards / Pills */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
          {activeFilters.map((filter, index) => (
            <div
              key={index}
              className={`border rounded-lg text-xs transition-all ${
                filter.isValid
                  ? "border-border/80 bg-background/80"
                  : "border-rose-500/40 bg-rose-500/[0.04]"
              }`}
            >
              <div
                className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-accent/40 rounded-lg"
                onClick={() => toggleFilterExpanded(index)}
              >
                <div className="text-muted-foreground">
                  {getFilterIcon(filter.attribute.type)}
                </div>
                <span className="font-semibold text-foreground">{filter.attribute.label}:</span>
                {!expandedFilters.has(index) && (
                  <span className="text-muted-foreground font-medium">
                    {getFilterSummary(filter)}
                  </span>
                )}
                {!filter.isValid && (
                  <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground -mr-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFilter(index);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              {expandedFilters.has(index) && (
                <div className="border-t border-border/60 bg-popover/90 p-3 rounded-b-lg">
                  {renderFilterInput(filter, index)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
