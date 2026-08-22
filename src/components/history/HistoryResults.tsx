import type { ReactNode } from "react";
import type { Bill } from "../../types/bill";
import type { AppSettings } from "../../types/settings";
import { currency, guestDisplay } from "../../utils/formatters";
import { cn } from "../ui/cn";
import { formatHistoryDate, ownerName } from "./historyPageModel";

type Props = {
  bills: Bill[];
  selectedIds: string[];
  selectionMode: boolean;
  settings: AppSettings;
  onToggleSelected: (bill: Bill) => void;
  onPreview: (bill: Bill) => void;
  renderActions: (bill: Bill, surface: "desktop" | "mobile") => ReactNode;
};

export function HistoryResults({ bills, selectedIds, selectionMode, settings, onToggleSelected, onPreview, renderActions }: Props) {
  return (
    <>
      <div className="tripledgerListDesktop">
        <table className={cn("historyBillTable tripledgerListTable min-w-0", selectionMode && "hasSelectionColumn")} aria-label="Bill history">
          <colgroup>
            {selectionMode && <col className="tripledgerSelectionColumn" />}
            <col className="tripledgerDataColumn" />
            <col className="tripledgerDataColumn" />
            <col className="tripledgerDataColumn" />
            <col className="tripledgerDataColumn" />
            <col className="tripledgerDataColumn" />
            <col className="tripledgerActionsColumn" />
          </colgroup>
          <thead>
            <tr>
              {selectionMode && <th className="historyCheckboxCell" scope="col"><span className="sr-only">Select</span></th>}
              <th scope="col">Customer</th>
              <th scope="col">Owner / Company</th>
              <th scope="col">Trip Date</th>
              <th scope="col">Reporting Place</th>
              <th className="historyAmountCell" scope="col">Amount</th>
              <th className="historyActionsCell tripledgerActionsCell" scope="col">{selectionMode ? <span className="sr-only">Actions hidden in selection mode</span> : "Actions"}</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => {
              const selected = selectedIds.includes(bill.id);
              const vehicleLabel = [bill.vehicleName, bill.vehicleNumber].filter(Boolean).join(" | ") || "Vehicle";
              return (
                <tr key={bill.id} className={cn("historyBillTableRow", selectionMode && selected && "is-selected")} aria-selected={selectionMode ? selected : undefined}>
                  {selectionMode && <td className="historyCheckboxCell"><input className="h-5 w-5 rounded border-slate-300" type="checkbox" aria-label={`Select bill for ${guestDisplay(bill)}`} checked={selected} onChange={() => onToggleSelected(bill)} /></td>}
                  <td><p className="truncate text-sm font-black text-slate-950 dark:text-slate-50">{guestDisplay(bill)}</p><p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{vehicleLabel}</p></td>
                  <td className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200" title={ownerName(bill)}>{ownerName(bill)}</td>
                  <td className="whitespace-nowrap text-sm font-semibold text-slate-600 dark:text-slate-300">{formatHistoryDate(bill.tripDate)}</td>
                  <td className="historyPlaceCell truncate text-sm text-slate-500 dark:text-slate-400" title={bill.reportingPlace || "NA"}>{bill.reportingPlace || "NA"}</td>
                  <td className="historyAmountCell text-base font-black text-[#1E3A8A] dark:text-blue-200">{currency(bill.totalAmount, settings.currencySymbol)}</td>
                  <td className="historyActionsCell tripledgerActionsCell">{!selectionMode && renderActions(bill, "desktop")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="tripledgerListMobile" role="list" aria-label="Bill history">
        {bills.map((bill) => {
          const selected = selectedIds.includes(bill.id);
          const vehicleLabel = [bill.vehicleName, bill.vehicleNumber].filter(Boolean).join(" | ") || "Vehicle";
          return (
            <article key={bill.id} className={cn("tripledgerListMobileRow tripledgerListMobileRowContent", selectionMode && selected && "is-selected")} aria-selected={selectionMode ? selected : undefined} role="listitem">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  {selectionMode && <input className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300" type="checkbox" aria-label={`Select bill for ${guestDisplay(bill)}`} checked={selected} onChange={() => onToggleSelected(bill)} />}
                  <div className="min-w-0"><h2 className="truncate font-black text-slate-950 dark:text-slate-50">{guestDisplay(bill)}</h2><p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{formatHistoryDate(bill.tripDate)}</p></div>
                </div>
                <p className="shrink-0 text-base font-black text-[#1E3A8A] dark:text-blue-200">{currency(bill.totalAmount, settings.currencySymbol)}</p>
              </div>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div><dt className="inline font-semibold text-slate-500 dark:text-slate-400">Owner: </dt><dd className="inline font-bold text-slate-800 dark:text-slate-100">{ownerName(bill)}</dd></div>
                <div className="truncate text-slate-600 dark:text-slate-300" title={vehicleLabel}>{vehicleLabel}</div>
                <div className="truncate"><dt className="inline font-semibold text-slate-500 dark:text-slate-400">Reporting place: </dt><dd className="inline text-slate-700 dark:text-slate-200">{bill.reportingPlace || "NA"}</dd></div>
              </dl>
              {!selectionMode && <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-2.5 dark:border-slate-800"><button type="button" className="min-h-10 text-sm font-black text-[#1E3A8A] dark:text-blue-200" onClick={() => onPreview(bill)}>View details</button>{renderActions(bill, "mobile")}</div>}
            </article>
          );
        })}
      </div>
    </>
  );
}
