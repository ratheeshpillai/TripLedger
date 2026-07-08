import { Card, CardContent } from "../ui/Card";

export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-2 text-xl font-bold text-slate-950 dark:text-slate-50">{value}</p>
      </CardContent>
    </Card>
  );
}
