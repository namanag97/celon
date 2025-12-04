import type { StylesheetStyle } from "cytoscape";

// Professional styling for process mining visualization
export const cytoscapeStylesheet: StylesheetStyle[] = [
  // Activity nodes - rounded rectangles with gradient
  {
    selector: "node[!isSpecial]",
    style: {
      "background-color": "#3b82f6",
      "background-opacity": 0.9,
      label: "data(label)",
      color: "#1e293b",
      "text-valign": "center",
      "text-halign": "center",
      "font-size": 11,
      "font-weight": 500,
      width: "mapData(frequency, 1, 100, 60, 120)",
      height: "mapData(frequency, 1, 100, 35, 55)",
      shape: "round-rectangle",
      "border-width": 2,
      "border-color": "#2563eb",
      "text-wrap": "wrap",
      "text-max-width": "100px",
    },
  },
  // Start activity indicator (activities that are start points)
  {
    selector: "node[isStart][!isSpecial]",
    style: {
      "border-color": "#22c55e",
      "border-width": 3,
    },
  },
  // End activity indicator (activities that are end points)
  {
    selector: "node[isEnd][!isSpecial]",
    style: {
      "border-color": "#ef4444",
      "border-width": 3,
    },
  },
  // Start node - green circle
  {
    selector: "node[id = '__start__']",
    style: {
      "background-color": "#22c55e",
      width: 45,
      height: 45,
      shape: "ellipse",
      label: "Start",
      "font-size": 10,
      "font-weight": 600,
      color: "#166534",
      "border-width": 3,
      "border-color": "#16a34a",
    },
  },
  // End node - red circle
  {
    selector: "node[id = '__end__']",
    style: {
      "background-color": "#ef4444",
      width: 45,
      height: 45,
      shape: "ellipse",
      label: "End",
      "font-size": 10,
      "font-weight": 600,
      color: "#991b1b",
      "border-width": 3,
      "border-color": "#dc2626",
    },
  },
  // Edges - curved bezier with weight-based thickness
  {
    selector: "edge",
    style: {
      width: "mapData(weight, 1, 50, 1, 6)",
      "line-color": "#94a3b8",
      "target-arrow-color": "#64748b",
      "target-arrow-shape": "triangle",
      "arrow-scale": 1.2,
      "curve-style": "bezier",
      label: "data(weight)",
      "font-size": 9,
      color: "#475569",
      "text-background-color": "#ffffff",
      "text-background-opacity": 0.9,
      "text-background-padding": "3px",
      "text-background-shape": "roundrectangle",
    },
  },
  // Edges from start node
  {
    selector: "edge[source = '__start__']",
    style: {
      "line-color": "#86efac",
      "target-arrow-color": "#22c55e",
      "line-style": "solid",
    },
  },
  // Edges to end node
  {
    selector: "edge[target = '__end__']",
    style: {
      "line-color": "#fca5a5",
      "target-arrow-color": "#ef4444",
      "line-style": "solid",
    },
  },
  // Selected node
  {
    selector: "node:selected",
    style: {
      "border-width": 4,
      "border-color": "#f59e0b",
      "background-color": "#fbbf24",
    },
  },
  // Highlighted node (for variant highlighting)
  {
    selector: "node.highlighted",
    style: {
      "background-color": "#8b5cf6",
      "border-color": "#7c3aed",
      "border-width": 3,
    },
  },
  // Highlighted edge
  {
    selector: "edge.highlighted",
    style: {
      "line-color": "#8b5cf6",
      "target-arrow-color": "#7c3aed",
      width: 4,
    },
  },
  // Dimmed elements (when something else is highlighted)
  {
    selector: ".dimmed",
    style: {
      opacity: 0.3,
    },
  },
];

// Dagre layout configuration for hierarchical left-to-right flow
export const dagreLayoutOptions = {
  name: "dagre" as const,
  rankDir: "LR", // Left to right
  nodeSep: 50, // Separation between nodes
  rankSep: 80, // Separation between ranks
  edgeSep: 10,
  animate: true,
  animationDuration: 500,
  fit: true,
  padding: 30,
};

// Breadthfirst layout as fallback
export const breadthfirstLayoutOptions = {
  name: "breadthfirst" as const,
  directed: true,
  spacingFactor: 1.5,
  animate: true,
  animationDuration: 500,
  fit: true,
  padding: 30,
};

// Grid layout for comparison view
export const gridLayoutOptions = {
  name: "grid" as const,
  fit: true,
  padding: 30,
  animate: true,
  animationDuration: 500,
};
