import type { Reading } from "@/lib/types";
import { Card } from "@/components/ui-kit";

const ROWS: { key: keyof Reading; label: string; unit?: string }[] = [
  { key: "N", label: "Nitrogen (N)" },
  { key: "P", label: "Phosphorus (P)" },
  { key: "K", label: "Potassium (K)" },
  { key: "ph", label: "Soil pH" },
  { key: "temperature", label: "Temperature", unit: "°C" },
  { key: "humidity", label: "Humidity", unit: "%" },
  { key: "rainfall", label: "Rainfall", unit: "mm" },
];

export function InputSummary({ reading }: { reading: Reading }) {
  return (
    <Card className="p-0">
      <dl className="divide-y divide-border">
        {ROWS.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-3 px-5 py-3">
            <dt className="min-w-0 truncate text-sm text-muted-foreground">{row.label}</dt>
            <dd className="shrink-0 text-sm font-semibold text-foreground">
              {String(reading[row.key])}
              {row.unit ?? ""}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
