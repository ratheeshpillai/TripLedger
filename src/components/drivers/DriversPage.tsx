import { useMemo, useRef, useState, type FormEvent } from "react";
import type { Driver, DriverDraft } from "../../types/driver";
import { EmptyState } from "../shared/EmptyState";
import { Button } from "../ui/Button";
import { Card, CardContent } from "../ui/Card";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { cn } from "../ui/cn";
import { useDialogFocus } from "../ui/useDialogFocus";
import { filterDrivers } from "./driverPageModel";

type Props = {
  drivers: Driver[];
  canManage: boolean;
  loading: boolean;
  error: string;
  savingId: string | null;
  onSave: (draft: DriverDraft, id?: string) => Promise<Driver>;
  onStatusChange: (driver: Driver, status: Driver["status"]) => Promise<Driver>;
};

const emptyDraft: DriverDraft = { name: "", phone: "", status: "active" };

function DriverIcon({ name }: { name: "plus" | "search" | "x" | "close" }) {
  const common = { className: "h-4 w-4", viewBox: "0 0 24 24", fill: "none", "aria-hidden": true };
  if (name === "plus") return <svg {...common}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "search") return <svg {...common}><path d="m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  return <svg {...common}><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}

function StatusBadge({ status }: { status: Driver["status"] }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-black", status === "active" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")}>{status === "active" ? "Active" : "Inactive"}</span>;
}

function DriverDialog({ driver, saving, onClose, onSave }: { driver: Driver | null; saving: boolean; onClose: () => void; onSave: (draft: DriverDraft) => Promise<void> }) {
  const [draft, setDraft] = useState<DriverDraft>(driver ? { name: driver.name, phone: driver.phone, status: driver.status } : emptyDraft);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useDialogFocus(true, dialogRef, onClose);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.name.trim() || saving) return;
    try {
      setError("");
      await onSave(draft);
    } catch {
      setError(driver ? "Unable to update the driver." : "Unable to add the driver.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-3 sm:p-4" onMouseDown={onClose}>
      <Card ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="driver-dialog-title" tabIndex={-1} className="w-full max-w-xl overflow-hidden focus:outline-none" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 dark:border-slate-700 sm:p-5">
          <div><h2 id="driver-dialog-title" className="text-base font-black text-slate-950 dark:text-slate-50">{driver ? "Edit Driver" : "Add Driver"}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Maintain the driver identity used by your organization.</p></div>
          <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Close driver form" onClick={onClose}><DriverIcon name="close" /></button>
        </div>
        <form className="space-y-4 p-4 sm:p-5" onSubmit={submit}>
          <div className="form-grid">
            <label className="field-label">Driver Name<Input autoFocus maxLength={120} placeholder="Driver Name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
            <label className="field-label">Phone<Input type="tel" inputMode="tel" maxLength={32} placeholder="Phone Number" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></label>
            <label className="field-label">Status<Select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Driver["status"] })}><option value="active">Active</option><option value="inactive">Inactive</option></Select></label>
          </div>
          {error && <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-300">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" disabled={saving || !draft.name.trim()}>{saving ? "Saving..." : driver ? "Save Driver" : "Add Driver"}</Button></div>
        </form>
      </Card>
    </div>
  );
}

export function DriversPage({ drivers, canManage, loading, error, savingId, onSave, onStatusChange }: Props) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Driver | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const visibleDrivers = useMemo(() => filterDrivers(drivers, search), [drivers, search]);
  const gridClass = canManage ? "grid-cols-[repeat(3,minmax(0,1fr))_11rem]" : "grid-cols-3";

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(driver: Driver) {
    setEditing(driver);
    setFormOpen(true);
  }

  function changeStatus(driver: Driver) {
    void onStatusChange(driver, driver.status === "active" ? "inactive" : "active").catch(() => undefined);
  }

  return (
    <div className="tripledgerListPage">
      <Card className="tripledgerListToolbar"><CardContent className="tripledgerListToolbarContent"><label className="relative block"><span className="sr-only">Search drivers</span><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><DriverIcon name="search" /></span><Input className="min-h-11 pl-10 pr-10" placeholder="Search drivers..." value={search} onChange={(event) => setSearch(event.target.value)} />{search && <button type="button" className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Clear driver search" onClick={() => setSearch("")}><DriverIcon name="x" /></button>}</label></CardContent></Card>

      <div className="tripledgerListSummary flex min-h-11 items-center justify-between gap-3"><div><p className="text-sm font-black text-slate-700 dark:text-slate-200">{visibleDrivers.length} {visibleDrivers.length === 1 ? "driver" : "drivers"}</p>{!canManage && <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Read-only access</p>}</div>{canManage && <Button type="button" variant="primary" className="w-fit gap-2" onClick={openCreate}><DriverIcon name="plus" /> Add Driver</Button>}</div>

      {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{error}</p>}
      {loading ? <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-300">Loading drivers...</p> : drivers.length === 0 ? <EmptyState title="No drivers yet" description={canManage ? "Add your first driver to start building the organization directory." : "No drivers have been added to this organization."} /> : visibleDrivers.length === 0 ? <EmptyState title="No drivers match your search" description="Try another name, phone number or status." /> : <>
        <div className="hidden min-w-0 lg:grid" role="table" aria-label="Drivers">
          <div role="row" className={cn("grid overflow-hidden rounded-2xl border border-slate-200 bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/70", gridClass)}><div role="columnheader" className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Driver</div><div role="columnheader" className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Phone</div><div role="columnheader" className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</div>{canManage && <div role="columnheader" className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Actions</div>}</div>
          <div role="rowgroup" className="mt-2.5 grid gap-2.5">{visibleDrivers.map((driver) => <div key={driver.id} role="row" className={cn("grid min-w-0 rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#111827]", gridClass)}><div role="cell" className="min-w-0 px-4 py-3 font-black text-slate-950 dark:text-slate-50"><span className="block truncate" title={driver.name}>{driver.name}</span></div><div role="cell" className="min-w-0 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300"><span className="block truncate" title={driver.phone || "NA"}>{driver.phone || "NA"}</span></div><div role="cell" className="px-4 py-3"><StatusBadge status={driver.status} /></div>{canManage && <div role="cell" className="flex items-center gap-1 px-3 py-2"><Button type="button" variant="ghost" className="min-h-9 px-2.5" disabled={Boolean(savingId)} onClick={() => openEdit(driver)}>Edit</Button><Button type="button" variant="ghost" className="min-h-9 px-2.5" disabled={Boolean(savingId)} onClick={() => changeStatus(driver)}>{driver.status === "active" ? "Deactivate" : "Activate"}</Button></div>}</div>)}</div>
        </div>

        <div className="tripledgerListMobile">{visibleDrivers.map((driver) => <article key={driver.id} className="tripledgerListMobileRow tripledgerListMobileRowContent"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-black text-slate-950 dark:text-slate-50">{driver.name}</h2><p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{driver.phone || "No phone number"}</p></div><StatusBadge status={driver.status} /></div>{canManage && <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800"><Button type="button" variant="secondary" className="min-h-10" disabled={Boolean(savingId)} onClick={() => openEdit(driver)}>Edit</Button><Button type="button" variant="ghost" className="min-h-10" disabled={Boolean(savingId)} onClick={() => changeStatus(driver)}>{driver.status === "active" ? "Mark Inactive" : "Mark Active"}</Button></div>}</article>)}</div>
      </>}

      {formOpen && <DriverDialog driver={editing} saving={Boolean(savingId)} onClose={() => setFormOpen(false)} onSave={async (draft) => { await onSave(draft, editing?.id); setFormOpen(false); }} />}
    </div>
  );
}
