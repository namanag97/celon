import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Filter, X, Calendar, Activity } from "lucide-react";

export interface FilterCriteria {
    date_start: string | null;
    date_end: string | null;
    activities: string[] | null;
    exclude_activities: string[] | null;
}

interface FilterSidebarProps {
    activities: string[];
    onApplyFilters: (filters: FilterCriteria) => void;
    onClearFilters: () => void;
    isLoading?: boolean;
}

export function FilterSidebar({
    activities,
    onApplyFilters,
    onClearFilters,
    isLoading = false,
}: FilterSidebarProps) {
    const [dateStart, setDateStart] = useState<string>("");
    const [dateEnd, setDateEnd] = useState<string>("");
    const [excludedActivities, setExcludedActivities] = useState<Set<string>>(
        new Set()
    );
    const [isOpen, setIsOpen] = useState(true);

    const toggleActivity = (activity: string) => {
        setExcludedActivities((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(activity)) {
                newSet.delete(activity);
            } else {
                newSet.add(activity);
            }
            return newSet;
        });
    };

    const handleApply = () => {
        const filters: FilterCriteria = {
            date_start: dateStart || null,
            date_end: dateEnd || null,
            activities: null,
            exclude_activities:
                excludedActivities.size > 0 ? Array.from(excludedActivities) : null,
        };
        onApplyFilters(filters);
    };

    const handleClear = () => {
        setDateStart("");
        setDateEnd("");
        setExcludedActivities(new Set());
        onClearFilters();
    };

    const hasActiveFilters =
        dateStart || dateEnd || excludedActivities.size > 0;

    return (
        <Card className={cn("transition-all", isOpen ? "w-full" : "w-14")}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        {isOpen && "Filters"}
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsOpen(!isOpen)}
                        className="h-8 w-8"
                    >
                        {isOpen ? <X className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
                    </Button>
                </div>
                {isOpen && hasActiveFilters && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {dateStart && (
                            <Badge variant="secondary" className="text-xs">
                                From: {dateStart}
                            </Badge>
                        )}
                        {dateEnd && (
                            <Badge variant="secondary" className="text-xs">
                                To: {dateEnd}
                            </Badge>
                        )}
                        {excludedActivities.size > 0 && (
                            <Badge variant="destructive" className="text-xs">
                                Excluding: {excludedActivities.size}
                            </Badge>
                        )}
                    </div>
                )}
            </CardHeader>

            {isOpen && (
                <CardContent className="space-y-4">
                    {/* Date Range Filter */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Date Range
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs text-muted-foreground">Start</label>
                                <input
                                    type="date"
                                    value={dateStart}
                                    onChange={(e) => setDateStart(e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border rounded-md bg-background"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">End</label>
                                <input
                                    type="date"
                                    value={dateEnd}
                                    onChange={(e) => setDateEnd(e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border rounded-md bg-background"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Activity Filter */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Exclude Activities
                        </label>
                        <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2 bg-muted/30">
                            {activities.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-2">
                                    No activities available
                                </p>
                            ) : (
                                activities.map((activity) => (
                                    <label
                                        key={activity}
                                        className={cn(
                                            "flex items-center gap-2 p-1.5 rounded cursor-pointer text-sm",
                                            "hover:bg-muted transition-colors",
                                            excludedActivities.has(activity) && "bg-destructive/10"
                                        )}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={excludedActivities.has(activity)}
                                            onChange={() => toggleActivity(activity)}
                                            className="rounded border-gray-300"
                                        />
                                        <span
                                            className={cn(
                                                excludedActivities.has(activity) &&
                                                "line-through text-muted-foreground"
                                            )}
                                        >
                                            {activity}
                                        </span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                        <Button
                            onClick={handleApply}
                            disabled={isLoading || !hasActiveFilters}
                            className="flex-1"
                            size="sm"
                        >
                            {isLoading ? "Applying..." : "Apply Filters"}
                        </Button>
                        <Button
                            onClick={handleClear}
                            variant="outline"
                            disabled={isLoading || !hasActiveFilters}
                            size="sm"
                        >
                            Clear
                        </Button>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
