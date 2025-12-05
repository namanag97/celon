import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowRight, Check, AlertCircle } from "lucide-react";

interface ColumnMapperProps {
    columns: string[];
    previewRows: Record<string, unknown>[];
    tempId: string;
    onComplete: (data: {
        session_id: string;
        case_count: number;
        event_count: number;
        activities: string[];
    }) => void;
    onCancel: () => void;
}

export function ColumnMapper({
    columns,
    previewRows,
    tempId,
    onComplete,
    onCancel,
}: ColumnMapperProps) {
    const [caseIdColumn, setCaseIdColumn] = useState<string>("");
    const [activityColumn, setActivityColumn] = useState<string>("");
    const [timestampColumn, setTimestampColumn] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auto-detect columns based on common names
    useState(() => {
        const lowerColumns = columns.map((c) => c.toLowerCase());

        // Auto-detect case_id
        const casePatterns = ["case_id", "caseid", "case", "id", "trace_id", "traceid"];
        for (const pattern of casePatterns) {
            const idx = lowerColumns.findIndex((c) => c.includes(pattern));
            if (idx !== -1 && !caseIdColumn) {
                setCaseIdColumn(columns[idx]);
                break;
            }
        }

        // Auto-detect activity
        const activityPatterns = ["activity", "event", "action", "step", "task"];
        for (const pattern of activityPatterns) {
            const idx = lowerColumns.findIndex((c) => c.includes(pattern));
            if (idx !== -1 && !activityColumn) {
                setActivityColumn(columns[idx]);
                break;
            }
        }

        // Auto-detect timestamp
        const timestampPatterns = ["timestamp", "time", "date", "datetime", "created", "start"];
        for (const pattern of timestampPatterns) {
            const idx = lowerColumns.findIndex((c) => c.includes(pattern));
            if (idx !== -1 && !timestampColumn) {
                setTimestampColumn(columns[idx]);
                break;
            }
        }
    });

    const isValid = caseIdColumn && activityColumn && timestampColumn;

    const handleSubmit = async () => {
        if (!isValid) return;

        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                temp_id: tempId,
                case_id_column: caseIdColumn,
                activity_column: activityColumn,
                timestamp_column: timestampColumn,
            });

            const response = await fetch(`http://localhost:8000/upload?${params}`, {
                method: "POST",
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || "Upload failed");
            }

            const data = await response.json();
            onComplete(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setIsLoading(false);
        }
    };

    const ColumnSelect = ({
        label,
        value,
        onChange,
        icon,
    }: {
        label: string;
        value: string;
        onChange: (val: string) => void;
        icon: string;
    }) => (
        <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
                <span className="text-lg">{icon}</span>
                {label}
                {value && <Check className="w-4 h-4 text-green-500" />}
            </label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={cn(
                    "w-full px-3 py-2 border rounded-md bg-background",
                    "focus:outline-none focus:ring-2 focus:ring-primary",
                    value ? "border-green-500" : "border-input"
                )}
            >
                <option value="">Select column...</option>
                {columns.map((col) => (
                    <option key={col} value={col}>
                        {col}
                    </option>
                ))}
            </select>
        </div>
    );

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ArrowRight className="w-5 h-5" />
                    Map Your Columns
                </CardTitle>
                <CardDescription>
                    Select which columns contain the case ID, activity name, and timestamp
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Column Mappings */}
                <div className="grid gap-4 md:grid-cols-3">
                    <ColumnSelect
                        label="Case ID"
                        value={caseIdColumn}
                        onChange={setCaseIdColumn}
                        icon="🔑"
                    />
                    <ColumnSelect
                        label="Activity"
                        value={activityColumn}
                        onChange={setActivityColumn}
                        icon="⚡"
                    />
                    <ColumnSelect
                        label="Timestamp"
                        value={timestampColumn}
                        onChange={setTimestampColumn}
                        icon="🕐"
                    />
                </div>

                {/* Preview Table */}
                <div className="space-y-2">
                    <h4 className="text-sm font-medium">Data Preview</h4>
                    <div className="overflow-x-auto border rounded-md">
                        <table className="w-full text-xs">
                            <thead className="bg-muted">
                                <tr>
                                    {columns.map((col) => (
                                        <th
                                            key={col}
                                            className={cn(
                                                "px-3 py-2 text-left font-medium whitespace-nowrap",
                                                col === caseIdColumn && "bg-blue-100 text-blue-800",
                                                col === activityColumn && "bg-purple-100 text-purple-800",
                                                col === timestampColumn && "bg-green-100 text-green-800"
                                            )}
                                        >
                                            <div className="flex items-center gap-1">
                                                {col}
                                                {col === caseIdColumn && <Badge variant="outline" className="text-[10px] px-1">Case ID</Badge>}
                                                {col === activityColumn && <Badge variant="outline" className="text-[10px] px-1">Activity</Badge>}
                                                {col === timestampColumn && <Badge variant="outline" className="text-[10px] px-1">Timestamp</Badge>}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {previewRows.map((row, idx) => (
                                    <tr key={idx} className="border-t">
                                        {columns.map((col) => (
                                            <td
                                                key={col}
                                                className={cn(
                                                    "px-3 py-2 whitespace-nowrap",
                                                    col === caseIdColumn && "bg-blue-50",
                                                    col === activityColumn && "bg-purple-50",
                                                    col === timestampColumn && "bg-green-50"
                                                )}
                                            >
                                                {String(row[col] ?? "")}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={onCancel} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!isValid || isLoading}>
                        {isLoading ? "Processing..." : "Start Analysis"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
