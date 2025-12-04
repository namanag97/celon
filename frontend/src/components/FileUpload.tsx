import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FileUploadProps {
    onFileUpload?: (file: File) => void;
}

export function FileUpload({ onFileUpload }: FileUploadProps) {
    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            if (acceptedFiles.length > 0 && onFileUpload) {
                onFileUpload(acceptedFiles[0]);
            }
        },
        [onFileUpload]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "text/csv": [".csv"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
        },
        multiple: false,
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Upload Event Log</CardTitle>
            </CardHeader>
            <CardContent>
                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive
                            ? "border-primary bg-primary/10"
                            : "border-muted-foreground/25 hover:border-primary/50"
                        }`}
                >
                    <input {...getInputProps()} />
                    {isDragActive ? (
                        <p className="text-primary">Drop the file here...</p>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-muted-foreground">
                                Drag & drop a CSV or Excel file here
                            </p>
                            <p className="text-sm text-muted-foreground/75">
                                or click to select a file
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
