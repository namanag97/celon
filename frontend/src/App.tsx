import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { ProcessGraph } from "@/components/ProcessGraph";
import { MetricsPanel } from "@/components/MetricsPanel";
import { VariantList } from "@/components/VariantList";
import { FilterSidebar } from "@/components/FilterSidebar";
import type { FilterCriteria } from "@/components/FilterSidebar";
import { BottleneckList } from "@/components/BottleneckList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, FileText, Hash } from "lucide-react";
import "./App.css";

interface UploadStats {
  session_id: string;
  case_count: number;
  event_count: number;
  activities: string[];
}

function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [uploadStats, setUploadStats] = useState<UploadStats | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string[] | null>(null);
  const [selectedNode, setSelectedNode] = useState<{
    id: string;
    label: string;
    frequency: number;
  } | null>(null);
  const [activeFilters, setActiveFilters] = useState<FilterCriteria | null>(null);
  const [filterLoading, setFilterLoading] = useState(false);

  const handleUploadSuccess = (data: UploadStats) => {
    setSessionId(data.session_id);
    setUploadStats(data);
    setSelectedVariant(null);
    setSelectedNode(null);
    setActiveFilters(null);
  };

  const handleVariantSelect = (variant: string[]) => {
    // Toggle selection if clicking the same variant
    if (
      selectedVariant &&
      variant.length === selectedVariant.length &&
      variant.every((v, i) => v === selectedVariant[i])
    ) {
      setSelectedVariant(null);
    } else {
      setSelectedVariant(variant);
    }
  };

  const handleNodeSelect = (nodeData: {
    id: string;
    label: string;
    frequency: number;
  }) => {
    setSelectedNode(nodeData);
  };

  const handleApplyFilters = async (filters: FilterCriteria) => {
    setFilterLoading(true);
    setActiveFilters(filters);
    // The ProcessGraph will refetch based on activeFilters prop
    setTimeout(() => setFilterLoading(false), 500);
  };

  const handleClearFilters = () => {
    setActiveFilters(null);
  };

  const handleBottleneckSelect = (source: string, target: string) => {
    // Could be used to highlight the bottleneck edge on the graph
    console.log("Bottleneck selected:", source, "->", target);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">
            Process Mining Dashboard
          </h1>
          <p className="text-muted-foreground">
            Upload event logs and discover process models
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
          {/* Left Sidebar - Upload, Filters & Quick Stats */}
          <aside className="space-y-6">
            <FileUpload onUploadSuccess={handleUploadSuccess} />

            {/* Filters */}
            {uploadStats && (
              <FilterSidebar
                activities={uploadStats.activities}
                onApplyFilters={handleApplyFilters}
                onClearFilters={handleClearFilters}
                isLoading={filterLoading}
              />
            )}

            {uploadStats && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Hash className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cases</p>
                      <p className="text-xl font-bold">
                        {uploadStats.case_count.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Events</p>
                      <p className="text-xl font-bold">
                        {uploadStats.event_count.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Activity className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Activities
                      </p>
                      <p className="text-xl font-bold">
                        {uploadStats.activities.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Selected Node Info */}
            {selectedNode && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Selected Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-medium">{selectedNode.label}</p>
                    <p className="text-sm text-muted-foreground">
                      Frequency: {selectedNode.frequency.toLocaleString()}{" "}
                      occurrences
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </aside>

          {/* Main Content Area */}
          <div className="space-y-6">
            {/* Process Graph */}
            <ProcessGraph
              sessionId={sessionId}
              onNodeSelect={handleNodeSelect}
              filters={activeFilters}
            />

            {/* Metrics Panel */}
            <MetricsPanel sessionId={sessionId} />

            {/* Bottleneck Analysis */}
            <BottleneckList
              sessionId={sessionId}
              onBottleneckSelect={handleBottleneckSelect}
            />

            {/* Variant List */}
            <VariantList
              sessionId={sessionId}
              onVariantSelect={handleVariantSelect}
              selectedVariant={selectedVariant}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-8">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          Process Mining MVP - Built with React, FastAPI, and PM4Py
        </div>
      </footer>
    </div>
  );
}

export default App;

