import { cn } from "@/lib/utils";
import { Check, Upload, Table, LayoutDashboard } from "lucide-react";

export type WorkflowStep = "upload" | "mapping" | "dashboard";

interface Step {
    id: WorkflowStep;
    label: string;
    icon: React.ElementType;
}

const steps: Step[] = [
    { id: "upload", label: "Upload", icon: Upload },
    { id: "mapping", label: "Map Columns", icon: Table },
    { id: "dashboard", label: "Analyze", icon: LayoutDashboard },
];

interface WorkflowStepperProps {
    currentStep: WorkflowStep;
    onStepClick?: (step: WorkflowStep) => void;
}

export function WorkflowStepper({
    currentStep,
    onStepClick,
}: WorkflowStepperProps) {
    const currentIndex = steps.findIndex((s) => s.id === currentStep);

    return (
        <div className="w-full py-4">
            <div className="flex items-center justify-center">
                {steps.map((step, index) => {
                    const Icon = step.icon;
                    const isCompleted = index < currentIndex;
                    const isCurrent = step.id === currentStep;
                    const isClickable = isCompleted && onStepClick;

                    return (
                        <div key={step.id} className="flex items-center">
                            {/* Step circle */}
                            <button
                                onClick={() => isClickable && onStepClick(step.id)}
                                disabled={!isClickable}
                                className={cn(
                                    "relative flex flex-col items-center gap-2 transition-all duration-300",
                                    isClickable && "cursor-pointer hover:scale-105"
                                )}
                            >
                                <div
                                    className={cn(
                                        "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                                        isCompleted
                                            ? "bg-primary border-primary text-primary-foreground"
                                            : isCurrent
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-muted-foreground/30 bg-muted/30 text-muted-foreground"
                                    )}
                                >
                                    {isCompleted ? (
                                        <Check className="h-5 w-5" />
                                    ) : (
                                        <Icon className="h-5 w-5" />
                                    )}
                                </div>
                                <span
                                    className={cn(
                                        "text-xs font-medium transition-colors duration-300",
                                        isCurrent
                                            ? "text-primary"
                                            : isCompleted
                                                ? "text-foreground"
                                                : "text-muted-foreground"
                                    )}
                                >
                                    {step.label}
                                </span>
                            </button>

                            {/* Connector line */}
                            {index < steps.length - 1 && (
                                <div
                                    className={cn(
                                        "w-16 h-0.5 mx-2 transition-all duration-500",
                                        index < currentIndex
                                            ? "bg-primary"
                                            : "bg-muted-foreground/20"
                                    )}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
