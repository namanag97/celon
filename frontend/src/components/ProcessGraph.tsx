import { useRef, useEffect, useCallback, useState } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import cytoscape from "cytoscape";
import type { Core, NodeSingular } from "cytoscape";
import dagre from "cytoscape-dagre";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";
import {
  cytoscapeStylesheet,
  dagreLayoutOptions,
  breadthfirstLayoutOptions,
} from "@/lib/cytoscape-config";

// Register dagre layout
cytoscape.use(dagre);

interface GraphData {
  nodes: Array<{ data: { id: string; label: string; frequency: number; isStart?: boolean; isEnd?: boolean; isSpecial?: boolean } }>;
  edges: Array<{ data: { source: string; target: string; weight: number } }>;
}

interface ProcessGraphProps {
  sessionId: string | null;
  onNodeSelect?: (nodeData: { id: string; label: string; frequency: number }) => void;
}

interface NodeTooltip {
  visible: boolean;
  x: number;
  y: number;
  data: { id: string; label: string; frequency: number } | null;
}

export function ProcessGraph({ sessionId, onNodeSelect }: ProcessGraphProps) {
  const cyRef = useRef<Core | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<NodeTooltip>({ visible: false, x: 0, y: 0, data: null });

  // Fetch graph data when sessionId changes
  useEffect(() => {
    if (!sessionId) {
      setGraphData(null);
      return;
    }

    const fetchGraphData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:8000/discover/${sessionId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch graph data: ${response.statusText}`);
        }
        const data = await response.json();
        setGraphData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load process graph");
        console.error("Error fetching graph:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGraphData();
  }, [sessionId]);

  // Set up cytoscape instance reference and event handlers
  const setCytoscape = useCallback((cy: Core) => {
    cyRef.current = cy;

    // Node click handler
    cy.on("tap", "node", (event) => {
      const node = event.target as NodeSingular;
      const data = node.data();
      if (onNodeSelect && !data.isSpecial) {
        onNodeSelect({ id: data.id, label: data.label, frequency: data.frequency });
      }
    });

    // Node hover for tooltip
    cy.on("mouseover", "node", (event) => {
      const node = event.target as NodeSingular;
      const data = node.data();
      const renderedPosition = node.renderedPosition();

      setTooltip({
        visible: true,
        x: renderedPosition.x,
        y: renderedPosition.y - 40,
        data: { id: data.id, label: data.label, frequency: data.frequency || 0 },
      });
    });

    cy.on("mouseout", "node", () => {
      setTooltip({ visible: false, x: 0, y: 0, data: null });
    });

    // Run layout after elements are added
    cy.ready(() => {
      try {
        cy.layout(dagreLayoutOptions).run();
      } catch {
        // Fallback to breadthfirst if dagre fails
        cy.layout(breadthfirstLayoutOptions).run();
      }
    });
  }, [onNodeSelect]);

  // Zoom controls
  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.2);
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() / 1.2);
    }
  };

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 30);
    }
  };

  const handleReset = () => {
    if (cyRef.current) {
      try {
        cyRef.current.layout(dagreLayoutOptions).run();
      } catch {
        cyRef.current.layout(breadthfirstLayoutOptions).run();
      }
      cyRef.current.fit(undefined, 30);
    }
  };

  // Convert graph data to cytoscape elements
  const elements = graphData
    ? [...graphData.nodes, ...graphData.edges]
    : [];

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Process Model (DFG)</CardTitle>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={handleZoomIn} title="Zoom In">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomOut} title="Zoom Out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleFit} title="Fit to View">
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleReset} title="Reset Layout">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="h-[500px] relative" ref={containerRef}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Discovering process...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-destructive">
              <p className="font-medium">Error loading graph</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {!sessionId && !loading && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
            <p>Upload an event log to discover the process model</p>
          </div>
        )}

        {sessionId && !loading && !error && elements.length > 0 && (
          <>
            <CytoscapeComponent
              elements={elements}
              stylesheet={cytoscapeStylesheet}
              style={{ width: "100%", height: "100%" }}
              cy={setCytoscape}
              className="rounded-lg border bg-slate-50"
              wheelSensitivity={0.3}
              minZoom={0.2}
              maxZoom={3}
            />

            {/* Tooltip */}
            {tooltip.visible && tooltip.data && (
              <div
                className="absolute bg-popover text-popover-foreground border rounded-md shadow-md px-3 py-2 pointer-events-none z-20"
                style={{
                  left: tooltip.x,
                  top: tooltip.y,
                  transform: "translate(-50%, -100%)",
                }}
              >
                <p className="font-medium text-sm">{tooltip.data.label}</p>
                <p className="text-xs text-muted-foreground">
                  Frequency: {tooltip.data.frequency}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
