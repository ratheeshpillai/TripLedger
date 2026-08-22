import type { ReactNode } from "react";
import type { BillingParty, BillingPartySummary } from "../../types/billingParty";
import type { AppSettings } from "../../types/settings";
import { currency } from "../../utils/formatters";
import { EmptyState } from "../shared/EmptyState";
import { Button } from "../ui/Button";
import { Card, CardContent } from "../ui/Card";
import { Input } from "../ui/Input";
import { cn } from "../ui/cn";
import { balanceStatus, latestActivity, ownerDateDisplay, partyDisplayName, plural } from "./ownerPageModel";

const ownerTableHeaderClass = "px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400";

type Props = {
  parties: BillingParty[];
  visibleParties: BillingParty[];
  summaryById: Map<string, BillingPartySummary>;
  settings: AppSettings;
  loading: boolean;
  isMobile: boolean;
  search: string;
  sortControl: ReactNode;
  onSearchChange: (value: string) => void;
  onAdd: () => void;
  onOpen: (party: BillingParty) => void;
  onRecordPayment: (party: BillingParty) => void;
  renderActions: (party: BillingParty) => ReactNode;
};

function DirectoryIcon({ name }: { name: "plus" | "search" | "x" }) {
  const common = { className: "h-4 w-4", viewBox: "0 0 24 24", fill: "none", "aria-hidden": true };
  if (name === "plus") return <svg {...common}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "search") return <svg {...common}><path d="m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  return <svg {...common}><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}

function StatusBadge({ summary, symbol }: { summary?: BillingPartySummary; symbol: string }) {
  const status = balanceStatus(summary, symbol);
  return (
    <span className={cn("inline-flex max-w-full items-center justify-start rounded-full px-2.5 py-1 text-left text-xs font-black", status.tone === "danger" && "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200", status.tone === "success" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200", status.tone === "info" && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200")}>
      {status.amountLabel ? `${status.label} ${status.amountLabel}` : status.label}
    </span>
  );
}

export function OwnerDirectory({ parties, visibleParties, summaryById, settings, loading, isMobile, search, sortControl, onSearchChange, onAdd, onOpen, onRecordPayment, renderActions }: Props) {
  return (
    <>
      <Card className="tripledgerListToolbar">
        <CardContent className={cn("tripledgerListToolbarContent", isMobile && "p-2.5")}>
          <div className={cn("tripledgerListToolbarGrid", isMobile ? "grid-cols-[minmax(0,1fr)_2.75rem] gap-2" : "lg:grid-cols-[minmax(0,1fr)_14rem]")}>
            <label className="relative block">
              <span className="sr-only">Search owners or companies</span>
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><DirectoryIcon name="search" /></span>
              <Input className="min-h-11 pl-10 pr-10" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={isMobile ? "Search owners..." : "Search owners or companies..."} />
              {search && <button type="button" className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200" aria-label="Clear owner search" onClick={() => onSearchChange("")}><DirectoryIcon name="x" /></button>}
            </label>
            {sortControl}
          </div>
        </CardContent>
      </Card>

      <div className={cn(isMobile ? "flex min-h-11 items-center justify-between gap-3 px-1" : "tripledgerListSummary flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between")}>
        <p className="text-sm font-black text-slate-700 dark:text-slate-200">{visibleParties.length} owners</p>
        <Button type="button" variant="primary" className={cn("w-fit gap-2", isMobile && "min-h-10 px-3")} onClick={onAdd}><DirectoryIcon name="plus" /> Add Owner</Button>
      </div>

      {loading ? (
        <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-300">Loading owners...</p>
      ) : parties.length === 0 ? (
        <EmptyState title="No owners yet" description="Add an Owner / Company to start tracking bills, payments and balances." />
      ) : visibleParties.length === 0 ? (
        <div className="space-y-4"><EmptyState title="No owners match your search" description="Try another name or clear the search." /><div className="flex justify-center"><Button type="button" variant="secondary" className="gap-2" onClick={() => onSearchChange("")}><DirectoryIcon name="x" /> Clear Search</Button></div></div>
      ) : (
        <>
          <div className="tripledgerListDesktop">
            <table className="historyBillTable tripledgerListTable min-w-0" aria-label="Owners and payments">
              <colgroup>{Array.from({ length: 5 }, (_, index) => <col key={index} className="tripledgerDataColumn" />)}<col className="tripledgerActionsColumn" /></colgroup>
              <thead><tr><th className={ownerTableHeaderClass}>Owner / Company</th><th className={cn(ownerTableHeaderClass, "tripledgerStatusCell")}>Balance Status</th><th className={ownerTableHeaderClass}>Bills</th><th className={ownerTableHeaderClass}>Payments</th><th className={ownerTableHeaderClass}>Last Activity</th><th className={cn(ownerTableHeaderClass, "tripledgerActionsCell")}>Actions</th></tr></thead>
              <tbody>{visibleParties.map((party) => {
                const summary = summaryById.get(party.id);
                const latest = latestActivity(summary);
                return <tr key={party.id} className="group">
                  <td><button type="button" className="block min-w-0 w-full cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-blue-500" onClick={() => onOpen(party)}><span className="block truncate font-black text-slate-950 group-hover:text-[#1E3A8A] dark:text-slate-50 dark:group-hover:text-blue-200" title={partyDisplayName(party)}>{partyDisplayName(party)}</span>{(party.phone || party.email) && <span className="mt-1 block truncate text-xs font-semibold text-slate-500 dark:text-slate-400" title={[party.phone, party.email].filter(Boolean).join(" | ")}>{[party.phone, party.email].filter(Boolean).join(" | ")}</span>}</button></td>
                  <td className="tripledgerStatusCell min-w-0 overflow-hidden"><StatusBadge summary={summary} symbol={settings.currencySymbol} /></td>
                  <td className="font-bold text-slate-700 dark:text-slate-200">{plural(summary?.billCount, "bill")}</td>
                  <td className="font-bold text-slate-700 dark:text-slate-200">{plural(summary?.paymentCount, "payment")}</td>
                  <td className="font-semibold text-slate-600 dark:text-slate-300">{latest ? ownerDateDisplay(latest) : "NA"}</td>
                  <td className="tripledgerActionsCell"><div className="flex items-center">{renderActions(party)}</div></td>
                </tr>;
              })}</tbody>
            </table>
          </div>

          <div className="tripledgerListMobile">
            {visibleParties.map((party) => {
              const summary = summaryById.get(party.id);
              const latest = latestActivity(summary);
              const status = balanceStatus(summary, settings.currencySymbol);
              return <article key={party.id} className="tripledgerListMobileRow tripledgerListMobileRowContent">
                <div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0 flex-1"><h2 className="truncate font-black text-slate-950 dark:text-slate-50">{partyDisplayName(party)}</h2>{(party.phone || party.email) && <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{[party.phone, party.email].filter(Boolean).join(" | ")}</p>}</div>{renderActions(party)}</div>
                <div className="mt-3"><p className={cn("text-xs font-black uppercase tracking-wide", status.tone === "danger" ? "text-red-600 dark:text-red-300" : status.tone === "success" ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400")}>{status.label}</p><p className="mt-0.5 text-xl font-black text-[#1E3A8A] dark:text-blue-200">{status.amountLabel || currency(0, settings.currencySymbol)}</p></div>
                <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{plural(summary?.billCount, "bill")} · {plural(summary?.paymentCount, "payment")} · Last activity {latest ? ownerDateDisplay(latest) : "NA"}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800"><Button type="button" variant="ghost" className="px-2" onClick={() => onOpen(party)}>View Account</Button><Button type="button" variant="secondary" className="px-2" onClick={() => onRecordPayment(party)}>Record Payment</Button></div>
              </article>;
            })}
          </div>
        </>
      )}
    </>
  );
}
