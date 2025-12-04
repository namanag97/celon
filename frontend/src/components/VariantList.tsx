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
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface Variant {
  variant: string[];
  count: number;
  percentage: number;
}

interface VariantListProps {
  sessionId: string | null;
  onVariantSelect?: (variant: string[]) => void;
  selectedVariant?: string[] | null;
}

export function VariantList({
  sessionId,
  onVariantSelect,
  selectedVariant,
}: VariantListProps) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setVariants([]);
      return;
    }

    const fetchVariants = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `http://localhost:8000/metrics/${sessionId}`
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch variants: ${response.statusText}`);
        }
        const data = await response.json();
        setVariants(data.top_variants || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load variants"
        );
        console.error("Error fetching variants:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVariants();
  }, [sessionId]);

  const isVariantSelected = (variant: string[]) => {
    if (!selectedVariant) return false;
    return (
      variant.length === selectedVariant.length &&
      variant.every((v, i) => v === selectedVariant[i])
    );
  };

  if (!sessionId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Process Variants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground border-2 border-dashed rounded-lg">
            <p>Upload an event log to see variants</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Process Variants</CardTitle>
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
          <CardTitle>Process Variants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-destructive p-4">
            <p className="font-medium">Error loading variants</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Process Variants (Top 10)</CardTitle>
      </CardHeader>
      <CardContent>
        {variants.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No variants found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Variant Path</TableHead>
                <TableHead className="w-24 text-right">Count</TableHead>
                <TableHead className="w-32">Frequency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((variant, index) => (
                <TableRow
                  key={index}
                  className={cn(
                    "cursor-pointer transition-colors",
                    isVariantSelected(variant.variant)
                      ? "bg-primary/10 hover:bg-primary/15"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => onVariantSelect?.(variant.variant)}
                >
                  <TableCell className="font-medium text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      {variant.variant.map((activity, actIndex) => (
                        <span key={actIndex} className="flex items-center">
                          <Badge
                            variant="secondary"
                            className="text-xs whitespace-nowrap"
                          >
                            {activity}
                          </Badge>
                          {actIndex < variant.variant.length - 1 && (
                            <ChevronRight className="w-3 h-3 text-muted-foreground mx-0.5" />
                          )}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {variant.count.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${variant.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {variant.percentage.toFixed(1)}%
                      </span>
                    </div>
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
