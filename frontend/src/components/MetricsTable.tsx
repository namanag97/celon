import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface MetricData {
    name: string;
    value: string | number;
    description?: string;
}

interface MetricsTableProps {
    metrics?: MetricData[];
}

const defaultMetrics: MetricData[] = [
    { name: "Total Cases", value: "-", description: "Number of process instances" },
    { name: "Total Events", value: "-", description: "Number of recorded events" },
    { name: "Unique Activities", value: "-", description: "Distinct activity types" },
    { name: "Avg. Case Duration", value: "-", description: "Mean process completion time" },
    { name: "Median Case Duration", value: "-", description: "Median process completion time" },
];

export function MetricsTable({ metrics = defaultMetrics }: MetricsTableProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Process Metrics</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Metric</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead className="hidden md:table-cell">Description</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {metrics.map((metric) => (
                            <TableRow key={metric.name}>
                                <TableCell className="font-medium">{metric.name}</TableCell>
                                <TableCell>{metric.value}</TableCell>
                                <TableCell className="hidden md:table-cell text-muted-foreground">
                                    {metric.description}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
