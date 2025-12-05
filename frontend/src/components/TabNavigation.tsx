import { cn } from "@/lib/utils";
import {
    Network,
    BarChart3,
    AlertTriangle,
    GitBranch,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type TabId = "graph" | "metrics" | "bottlenecks" | "variants";

interface Tab {
    id: TabId;
    label: string;
    icon: LucideIcon;
}

const tabs: Tab[] = [
    { id: "graph", label: "Process Map", icon: Network },
    { id: "metrics", label: "Metrics", icon: BarChart3 },
    { id: "bottlenecks", label: "Bottlenecks", icon: AlertTriangle },
    { id: "variants", label: "Variants", icon: GitBranch },
];

interface TabNavigationProps {
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
    disabled?: boolean;
}

export function TabNavigation({
    activeTab,
    onTabChange,
    disabled = false,
}: TabNavigationProps) {
    return (
        <div className="w-full border-b bg-card">
            <nav className="container mx-auto px-4">
                <div className="flex gap-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => !disabled && onTabChange(tab.id)}
                                disabled={disabled}
                                className={cn(
                                    "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200",
                                    "hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                                    disabled && "opacity-50 cursor-not-allowed",
                                    isActive
                                        ? "text-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{tab.label}</span>

                                {/* Active indicator */}
                                {isActive && (
                                    <span
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"
                                        style={{
                                            animation: "slideIn 200ms ease-out",
                                        }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
