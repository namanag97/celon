import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { Upload, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ColumnMapper } from './ColumnMapper';

interface FileUploadProps {
    onUploadSuccess: (data: {
        session_id: string;
        case_count: number;
        event_count: number;
        activities: string[];
    }) => void;
}

interface PreviewData {
    columns: string[];
    preview_rows: Record<string, unknown>[];
    row_count: number;
    temp_id: string;
}

interface LogEntry {
    timestamp: string;
    message: string;
    type: 'info' | 'success' | 'error';
}

export function FileUpload({ onUploadSuccess }: FileUploadProps) {
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);

    const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, { timestamp, message, type }]);
    };

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        addLog(`File selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`, 'info');

        const formData = new FormData();
        formData.append('file', file);

        setIsUploading(true);
        setUploadProgress(0);
        addLog('Uploading for preview...', 'info');

        try {
            // Step 1: Preview endpoint to get columns
            const response = await axios.post('http://localhost:8000/preview', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || file.size));
                    setUploadProgress(percentCompleted);
                },
            });

            addLog('File uploaded successfully!', 'success');
            addLog(`Found ${response.data.columns.length} columns, ${response.data.row_count} rows`, 'info');
            addLog('Please map your columns below...', 'info');

            // Show column mapper
            setPreviewData(response.data);
        } catch (error: unknown) {
            console.error('Upload error:', error);
            const axiosError = error as { response?: { data?: { detail?: string } }; message?: string };
            const errorMessage = axiosError.response?.data?.detail || axiosError.message || 'Upload failed';
            addLog(`Error: ${errorMessage}`, 'error');
        } finally {
            setIsUploading(false);
        }
    }, []);

    const handleMappingComplete = (data: {
        session_id: string;
        case_count: number;
        event_count: number;
        activities: string[];
    }) => {
        addLog(`Analysis complete! Session ID: ${data.session_id}`, 'success');
        addLog(`Cases: ${data.case_count}, Events: ${data.event_count}`, 'success');
        setPreviewData(null);
        onUploadSuccess(data);
    };

    const handleMappingCancel = () => {
        setPreviewData(null);
        setLogs([]);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/xml': ['.xes'],
            'text/xml': ['.xes']
        },
        multiple: false,
        disabled: previewData !== null
    });

    // Show column mapper when we have preview data
    if (previewData) {
        return (
            <div className="space-y-4">
                <ColumnMapper
                    columns={previewData.columns}
                    previewRows={previewData.preview_rows}
                    tempId={previewData.temp_id}
                    onComplete={handleMappingComplete}
                    onCancel={handleMappingCancel}
                />
                {logs.length > 0 && (
                    <Card>
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Activity Log
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="py-0 pb-3">
                            <div className="bg-muted/50 rounded-md p-3 max-h-[150px] overflow-y-auto text-xs font-mono space-y-1">
                                {logs.map((log, index) => (
                                    <div key={index} className="flex gap-2">
                                        <span className="text-muted-foreground">[{log.timestamp}]</span>
                                        <span className={cn(
                                            log.type === 'error' ? "text-destructive" :
                                                log.type === 'success' ? "text-green-600" :
                                                    "text-foreground"
                                        )}>
                                            {log.message}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl mx-auto p-4 space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Upload Event Log</CardTitle>
                    <CardDescription>Drag and drop your CSV or XES file here to start analysis</CardDescription>
                </CardHeader>
                <CardContent>
                    <div
                        {...getRootProps()}
                        className={cn(
                            "border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors",
                            isDragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary",
                            isUploading ? "pointer-events-none opacity-50" : ""
                        )}
                    >
                        <input {...getInputProps()} />
                        <div className="flex flex-col items-center gap-4">
                            <div className="p-4 bg-muted rounded-full">
                                <Upload className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium">
                                    {isDragActive ? "Drop the file here" : "Drag & drop or click to select"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Supports .csv and .xes files • Any column names
                                </p>
                            </div>
                        </div>
                    </div>

                    {isUploading && (
                        <div className="mt-6 space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Uploading...</span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300 ease-in-out"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {logs.length > 0 && !previewData && (
                <Card>
                    <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Activity Log
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 pb-3">
                        <div className="bg-muted/50 rounded-md p-3 max-h-[200px] overflow-y-auto text-xs font-mono space-y-1">
                            {logs.map((log, index) => (
                                <div key={index} className="flex gap-2">
                                    <span className="text-muted-foreground">[{log.timestamp}]</span>
                                    <span className={cn(
                                        log.type === 'error' ? "text-destructive" :
                                            log.type === 'success' ? "text-green-600" :
                                                "text-foreground"
                                    )}>
                                        {log.message}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

