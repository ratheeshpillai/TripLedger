import { Card, CardContent } from "../ui/Card";

export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-3 sm:p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-2 whitespace-nowrap text-lg font-bold text-slate-950 dark:text-slate-50 sm:text-xl">{value}</p>
      </CardContent>
    </Card>
  );
}
