import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRight, Clock, TrendingUp } from "lucide-react";

interface Bottleneck {
    source: string;
    target: string;
    avg_duration: string;
    total_duration: string;
    count: number;
    impact_score: number;
}

interface BottleneckListProps {
    sessionId: string | null;
    onBottleneckSelect?: (source: string, target: string) => void;
}

export function BottleneckList({
    sessionId,
    onBottleneckSelect,
}: BottleneckListProps) {
    const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!sessionId) {
            setBottlenecks([]);
            return;
        }

        const fetchBottlenecks = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(
                    `http://localhost:8000/bottlenecks/${sessionId}`
                );
                if (!response.ok) {
                    throw new Error(`Failed to fetch bottlenecks: ${response.statusText}`);
                }
                const data = await response.json();
                setBottlenecks(data.bottlenecks || []);
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : "Failed to load bottlenecks"
                );
                console.error("Error fetching bottlenecks:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchBottlenecks();
    }, [sessionId]);

    const getImpactColor = (score: number) => {
        if (score > 50) return "text-red-600 bg-red-100";
        if (score > 20) return "text-orange-600 bg-orange-100";
        if (score > 5) return "text-yellow-600 bg-yellow-100";
        return "text-green-600 bg-green-100";
    };

    if (!sessionId) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Bottleneck Analysis
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-32 text-muted-foreground border-2 border-dashed rounded-lg">
                        <p>Upload an event log to detect bottlenecks</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Bottleneck Analysis
                    </CardTitle>
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
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Bottleneck Analysis
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center text-destructive p-4">
                        <p className="font-medium">Error loading bottlenecks</p>
                        <p className="text-sm">{error}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Bottleneck Analysis
                    <Badge variant="outline" className="ml-2">
                        Top {bottlenecks.length}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {bottlenecks.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                        No bottlenecks detected
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Transition</TableHead>
                                <TableHead className="text-right">
                                    <Clock className="w-4 h-4 inline mr-1" />
                                    Avg Time
                                </TableHead>
                                <TableHead className="text-right">Count</TableHead>
                                <TableHead className="text-right">
                                    <TrendingUp className="w-4 h-4 inline mr-1" />
                                    Impact
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bottlenecks.map((bottleneck, index) => (
                                <TableRow
                                    key={index}
                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() =>
                                        onBottleneckSelect?.(bottleneck.source, bottleneck.target)
                                    }
                                >
                                    <TableCell>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant="secondary" className="font-mono text-xs">
                                                {bottleneck.source}
                                            </Badge>
                                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                            <Badge variant="secondary" className="font-mono text-xs">
                                                {bottleneck.target}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {bottleneck.avg_duration}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {bottleneck.count.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge
                                            className={`${getImpactColor(bottleneck.impact_score)} border-0`}
                                        >
                                            {bottleneck.impact_score.toFixed(1)}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
