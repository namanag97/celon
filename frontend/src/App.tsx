import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { ProcessGraph } from "@/components/ProcessGraph";
import { MetricsPanel } from "@/components/MetricsPanel";
import { VariantList } from "@/components/VariantList";
import { FilterSidebar } from "@/components/FilterSidebar";
import type { FilterCriteria } from "@/components/FilterSidebar";
import { BottleneckList } from "@/components/BottleneckList";
import { TabNavigation, type TabId } from "@/components/TabNavigation";
import { WorkflowStepper, type WorkflowStep } from "@/components/WorkflowStepper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, FileText, Hash, Upload, RotateCcw } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<TabId>("graph");
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>("upload");

  const handleUploadSuccess = (data: UploadStats) => {
    setSessionId(data.session_id);
    setUploadStats(data);
    setSelectedVariant(null);
    setSelectedNode(null);
    setActiveFilters(null);
    setWorkflowStep("dashboard");
    setActiveTab("graph");
  };

  const handleVariantSelect = (variant: string[]) => {
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
    setTimeout(() => setFilterLoading(false), 500);
  };

  const handleClearFilters = () => {
    setActiveFilters(null);
  };

  const handleBottleneckSelect = (source: string, target: string) => {
    console.log("Bottleneck selected:", source, "->", target);
  };

  const handleReset = () => {
    setSessionId(null);
    setUploadStats(null);
    setWorkflowStep("upload");
    setActiveTab("graph");
    setSelectedNode(null);
    setSelectedVariant(null);
    setActiveFilters(null);
  };

  const handleStepClick = (step: WorkflowStep) => {
    if (step === "upload") {
      handleReset();
    }
  };

  // Render Upload Stage
  if (workflowStep === "upload") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* Header */}
        <header className="border-b bg-card/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Process Mining Dashboard
            </h1>
            <p className="text-muted-foreground">
              Discover patterns and optimize your business processes
            </p>
          </div>
        </header>

        {/* Stepper */}
        <WorkflowStepper currentStep={workflowStep} onStepClick={handleStepClick} />

        {/* Hero Upload Section */}
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <Upload className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-3">Upload Your Event Log</h2>
            <p className="text-lg text-muted-foreground">
              Start by uploading a CSV or XES file containing your process data.
              We'll help you map the columns and discover insights.
            </p>
          </div>

          <FileUpload onUploadSuccess={handleUploadSuccess} />

          {/* Feature highlights */}
          <div className="max-w-4xl mx-auto mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Activity,
                title: "Process Discovery",
                desc: "Visualize your process flow with interactive diagrams",
              },
              {
                icon: FileText,
                title: "Metrics & KPIs",
                desc: "Track case durations, throughput, and variants",
              },
              {
                icon: Hash,
                title: "Bottleneck Analysis",
                desc: "Identify delays and optimization opportunities",
              },
            ].map((feature, i) => (
              <Card key={i} className="border-dashed hover:border-primary/50 transition-colors">
                <CardContent className="pt-6 text-center">
                  <feature.icon className="w-8 h-8 mx-auto mb-3 text-primary/70" />
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Render Dashboard Stage
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Process Mining Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Quick Stats Pills */}
            {uploadStats && (
              <div className="hidden md:flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-sm font-medium">
                  <Hash className="inline w-3.5 h-3.5 mr-1" />
                  {uploadStats.case_count.toLocaleString()} cases
                </span>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-sm font-medium">
                  <FileText className="inline w-3.5 h-3.5 mr-1" />
                  {uploadStats.event_count.toLocaleString()} events
                </span>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-sm font-medium">
                  <Activity className="inline w-3.5 h-3.5 mr-1" />
                  {uploadStats.activities.length} activities
                </span>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-1" />
              New Analysis
            </Button>
          </div>
        </div>
      </header>

      {/* Stepper */}
      <WorkflowStepper currentStep={workflowStep} onStepClick={handleStepClick} />

      {/* Tab Navigation */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        disabled={!sessionId}
      />

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Sidebar */}
          <aside className="space-y-4">
            {/* Filters */}
            {uploadStats && (
              <FilterSidebar
                activities={uploadStats.activities}
                onApplyFilters={handleApplyFilters}
                onClearFilters={handleClearFilters}
                isLoading={filterLoading}
              />
            )}

            {/* Selected Node Info */}
            {selectedNode && (
              <Card className="animate-in slide-in-from-left-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Selected Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold">{selectedNode.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedNode.frequency.toLocaleString()} occurrences
                  </p>
                </CardContent>
              </Card>
            )}
          </aside>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === "graph" && (
              <div className="animate-in fade-in-0 duration-300">
                <ProcessGraph
                  sessionId={sessionId}
                  onNodeSelect={handleNodeSelect}
                  filters={activeFilters}
                />
              </div>
            )}

            {activeTab === "metrics" && (
              <div className="animate-in fade-in-0 duration-300">
                <MetricsPanel sessionId={sessionId} />
              </div>
            )}

            {activeTab === "bottlenecks" && (
              <div className="animate-in fade-in-0 duration-300">
                <BottleneckList
                  sessionId={sessionId}
                  onBottleneckSelect={handleBottleneckSelect}
                />
              </div>
            )}

            {activeTab === "variants" && (
              <div className="animate-in fade-in-0 duration-300">
                <VariantList
                  sessionId={sessionId}
                  onVariantSelect={handleVariantSelect}
                  selectedVariant={selectedVariant}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/50 mt-auto">
        <div className="container mx-auto px-4 py-3 text-center text-sm text-muted-foreground">
          Process Mining MVP - Built with React, FastAPI, and PM4Py
        </div>
      </footer>
    </div>
  );
}

export default App;
