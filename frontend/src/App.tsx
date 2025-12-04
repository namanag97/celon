import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { ProcessGraph } from "@/components/ProcessGraph";
import { MetricsTable } from "@/components/MetricsTable";
import { Button } from "@/components/ui/button";
import "./App.css";

function App() {
  const [file, setFile] = useState<File | null>(null);

  const handleFileUpload = (uploadedFile: File) => {
    setFile(uploadedFile);
    console.log("File uploaded:", uploadedFile.name);
  };

  const handleDiscoverProcess = () => {
    if (!file) return;
    console.log("Discovering process from:", file.name);
    // TODO: Implement process discovery API call
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
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
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8">
          {/* Upload Section */}
          <section className="grid gap-4 md:grid-cols-2">
            <FileUpload onFileUpload={handleFileUpload} />
            <div className="flex flex-col justify-center gap-4">
              {file && (
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Selected file:</p>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              )}
              <Button
                onClick={handleDiscoverProcess}
                disabled={!file}
                size="lg"
                className="w-full"
              >
                Discover Process
              </Button>
            </div>
          </section>

          {/* Process Visualization */}
          <section>
            <ProcessGraph />
          </section>

          {/* Metrics Section */}
          <section>
            <MetricsTable />
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          Process Mining Application - Built with React, Vite, and pm4py
        </div>
      </footer>
    </div>
  );
}

export default App;
