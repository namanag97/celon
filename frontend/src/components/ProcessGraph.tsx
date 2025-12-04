import CytoscapeComponent from "react-cytoscapejs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ElementDefinition, StylesheetStyle } from "cytoscape";

interface ProcessGraphProps {
    elements?: ElementDefinition[];
}

const defaultElements: ElementDefinition[] = [
    // Placeholder nodes
    { data: { id: "start", label: "Start" } },
    { data: { id: "activity1", label: "Activity 1" } },
    { data: { id: "activity2", label: "Activity 2" } },
    { data: { id: "end", label: "End" } },
    // Placeholder edges
    { data: { source: "start", target: "activity1", label: "10" } },
    { data: { source: "activity1", target: "activity2", label: "8" } },
    { data: { source: "activity2", target: "end", label: "8" } },
    { data: { source: "activity1", target: "end", label: "2" } },
];

const stylesheet: StylesheetStyle[] = [
    {
        selector: "node",
        style: {
            "background-color": "#6366f1",
            label: "data(label)",
            color: "#1e293b",
            "text-valign": "center" as const,
            "text-halign": "center" as const,
            "font-size": 12,
            width: 80,
            height: 40,
            shape: "round-rectangle" as const,
        },
    },
    {
        selector: "edge",
        style: {
            width: 2,
            "line-color": "#94a3b8",
            "target-arrow-color": "#94a3b8",
            "target-arrow-shape": "triangle" as const,
            "curve-style": "bezier" as const,
            label: "data(label)",
            "font-size": 10,
            color: "#64748b",
            "text-background-color": "#ffffff",
            "text-background-opacity": 1,
            "text-background-padding": "2px",
        },
    },
];

export function ProcessGraph({ elements = defaultElements }: ProcessGraphProps) {
    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Process Model</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px]">
                <CytoscapeComponent
                    elements={elements}
                    stylesheet={stylesheet}
                    style={{ width: "100%", height: "100%" }}
                    layout={{ name: "breadthfirst", directed: true }}
                    className="rounded-lg border"
                />
            </CardContent>
        </Card>
    );
}
