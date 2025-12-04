import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Hash,
  FileText,
  Activity,
  Clock,
  Timer,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface MetricsData {
  total_cases: number;
  total_events: number;
  total_activities: number;
  avg_case_duration: string | null;
  median_case_duration: string | null;
  min_case_duration: string | null;
  max_case_duration: string | null;
}

interface MetricsPanelProps {
  sessionId: string | null;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
}

function MetricCard({ title, value, description, icon }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary/10 rounded-full">{icon}</div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricsPanel({ sessionId }: MetricsPanelProps) {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setMetrics(null);
      return;
    }

    const fetchMetrics = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `http://localhost:8000/metrics/${sessionId}`
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch metrics: ${response.statusText}`);
        }
        const data = await response.json();
        setMetrics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load metrics");
        console.error("Error fetching metrics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [sessionId]);

  if (!sessionId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Process Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground border-2 border-dashed rounded-lg">
            <p>Upload an event log to see metrics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Process Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Process Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-destructive p-4">
            <p className="font-medium">Error loading metrics</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Process Metrics</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Cases"
          value={metrics.total_cases.toLocaleString()}
          description="Process instances"
          icon={<Hash className="w-4 h-4 text-primary" />}
        />
        <MetricCard
          title="Total Events"
          value={metrics.total_events.toLocaleString()}
          description="Recorded events"
          icon={<FileText className="w-4 h-4 text-primary" />}
        />
        <MetricCard
          title="Activities"
          value={metrics.total_activities}
          description="Unique activity types"
          icon={<Activity className="w-4 h-4 text-primary" />}
        />
        <MetricCard
          title="Avg Duration"
          value={metrics.avg_case_duration || "N/A"}
          description="Mean case duration"
          icon={<Clock className="w-4 h-4 text-primary" />}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Median Duration"
          value={metrics.median_case_duration || "N/A"}
          description="50th percentile"
          icon={<Timer className="w-4 h-4 text-primary" />}
        />
        <MetricCard
          title="Min Duration"
          value={metrics.min_case_duration || "N/A"}
          description="Fastest case"
          icon={<TrendingDown className="w-4 h-4 text-green-600" />}
        />
        <MetricCard
          title="Max Duration"
          value={metrics.max_case_duration || "N/A"}
          description="Slowest case"
          icon={<TrendingUp className="w-4 h-4 text-red-600" />}
        />
      </div>
    </div>
  );
}
