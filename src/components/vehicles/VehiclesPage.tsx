import { useMemo, useRef, useState, type FormEvent } from "react";
import type { Driver } from "../../types/driver";
import type { DriverVehicleAssignment } from "../../types/driverVehicleAssignment";
import type { Vehicle, VehicleDraft } from "../../types/vehicle";
import { ConfirmationDialog } from "../shared/ConfirmationDialog";
import { EmptyState } from "../shared/EmptyState";
import { Button } from "../ui/Button";
import { Card, CardContent } from "../ui/Card";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { cn } from "../ui/cn";
import { useDialogFocus } from "../ui/useDialogFocus";
import { filterVehicles } from "./vehiclePageModel";

type Props = {
  vehicles: Vehicle[];
  drivers: Driver[];
  assignments: DriverVehicleAssignment[];
  canManage: boolean;
  loading: boolean;
  error: string;
  savingId: string | null;
  assignmentSavingVehicleId: string | null;
  onSave: (draft: VehicleDraft, id?: string) => Promise<Vehicle>;
  onStatusChange: (vehicle: Vehicle, status: Vehicle["status"]) => Promise<Vehicle>;
  onAssignDriver: (vehicleId: string, driverId: string) => Promise<DriverVehicleAssignment>;
  onEndAssignment: (vehicleId: string) => Promise<DriverVehicleAssignment>;
};

const emptyDraft: VehicleDraft = {
  registrationNumber: "",
  displayName: "",
  makeModel: "",
  year: null,
  status: "active"
};

function VehicleIcon({ name }: { name: "plus" | "search" | "x" | "close" }) {
  const common = { className: "h-4 w-4", viewBox: "0 0 24 24", fill: "none", "aria-hidden": true };
  if (name === "plus") return <svg {...common}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "search") return <svg {...common}><path d="m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  return <svg {...common}><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}

function StatusBadge({ status }: { status: Vehicle["status"] }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-black", status === "active" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")}>{status === "active" ? "Active" : "Inactive"}</span>;
}

function VehicleDialog({ vehicle, saving, onClose, onSave }: { vehicle: Vehicle | null; saving: boolean; onClose: () => void; onSave: (draft: VehicleDraft) => Promise<void> }) {
  const [draft, setDraft] = useState<VehicleDraft>(vehicle ? {
    registrationNumber: vehicle.registrationNumber,
    displayName: vehicle.displayName,
    makeModel: vehicle.makeModel,
    year: vehicle.year,
    status: vehicle.status
  } : emptyDraft);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useDialogFocus(true, dialogRef, onClose);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.registrationNumber.trim() || saving) return;
    try {
      setError("");
      await onSave(draft);
    } catch {
      setError(vehicle ? "Unable to update the vehicle." : "Unable to add the vehicle. Check that the registration number is unique.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-3 sm:p-4" onMouseDown={onClose}>
      <Card ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="vehicle-dialog-title" tabIndex={-1} className="w-full max-w-2xl overflow-hidden focus:outline-none" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 dark:border-slate-700 sm:p-5">
          <div><h2 id="vehicle-dialog-title" className="text-base font-black text-slate-950 dark:text-slate-50">{vehicle ? "Edit Vehicle" : "Add Vehicle"}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Maintain the vehicles available to this Fleet Owner workspace.</p></div>
          <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Close vehicle form" onClick={onClose}><VehicleIcon name="close" /></button>
        </div>
        <form className="space-y-4 p-4 sm:p-5" onSubmit={submit}>
          <div className="form-grid">
            <label className="field-label">Registration Number<Input autoFocus maxLength={32} placeholder="e.g. MH03CV4312" value={draft.registrationNumber} onChange={(event) => setDraft({ ...draft, registrationNumber: event.target.value })} /></label>
            <label className="field-label">Vehicle Name <span className="font-normal text-slate-400">(optional)</span><Input maxLength={120} placeholder="e.g. Airport Innova" value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} /></label>
            <label className="field-label">Make / Model <span className="font-normal text-slate-400">(optional)</span><Input maxLength={120} placeholder="e.g. Toyota Innova Crysta" value={draft.makeModel} onChange={(event) => setDraft({ ...draft, makeModel: event.target.value })} /></label>
            <label className="field-label">Year <span className="font-normal text-slate-400">(optional)</span><Input type="number" inputMode="numeric" min={1886} max={new Date().getFullYear() + 1} placeholder="e.g. 2024" value={draft.year ?? ""} onChange={(event) => setDraft({ ...draft, year: event.target.value ? Number(event.target.value) : null })} /></label>
            <label className="field-label">Status<Select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Vehicle["status"] })}><option value="active">Active</option><option value="inactive">Inactive</option></Select></label>
          </div>
          {error && <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-300">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" disabled={saving || !draft.registrationNumber.trim()}>{saving ? "Saving..." : vehicle ? "Save Vehicle" : "Add Vehicle"}</Button></div>
        </form>
      </Card>
    </div>
  );
}

function DriverAssignmentDialog({ vehicle, drivers, currentDriverId, saving, onClose, onAssign }: { vehicle: Vehicle; drivers: Driver[]; currentDriverId?: string; saving: boolean; onClose: () => void; onAssign: (driverId: string) => Promise<void> }) {
  const [driverId, setDriverId] = useState(drivers.some((driver) => driver.id === currentDriverId) ? currentDriverId! : drivers[0]?.id ?? "");
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useDialogFocus(true, dialogRef, onClose);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!driverId || saving) return;
    try {
      setError("");
      await onAssign(driverId);
    } catch {
      setError("Unable to update this assignment. Refresh and try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-3 sm:p-4" onMouseDown={onClose}>
      <Card ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="assignment-dialog-title" tabIndex={-1} className="w-full max-w-md overflow-hidden focus:outline-none" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 dark:border-slate-700 sm:p-5">
          <div className="min-w-0"><h2 id="assignment-dialog-title" className="text-base font-black text-slate-950 dark:text-slate-50">{currentDriverId ? "Change Driver" : "Assign Driver"}</h2><p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400" title={vehicle.registrationNumber}>{vehicle.displayName || vehicle.registrationNumber} · {vehicle.registrationNumber}</p></div>
          <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Close driver assignment form" onClick={onClose}><VehicleIcon name="close" /></button>
        </div>
        <form className="space-y-4 p-4 sm:p-5" onSubmit={submit}>
          <label className="field-label">Active Driver<Select autoFocus value={driverId} onChange={(event) => setDriverId(event.target.value)}>{drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}</Select></label>
          {error && <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-300">{error}</p>}
          <div className="grid gap-2 sm:flex sm:justify-end"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" disabled={saving || !driverId}>{saving ? "Saving..." : currentDriverId ? "Change Driver" : "Assign Driver"}</Button></div>
        </form>
      </Card>
    </div>
  );
}

export function VehiclesPage({ vehicles, drivers, assignments, canManage, loading, error, savingId, assignmentSavingVehicleId, onSave, onStatusChange, onAssignDriver, onEndAssignment }: Props) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [assignmentVehicle, setAssignmentVehicle] = useState<Vehicle | null>(null);
  const [endingVehicle, setEndingVehicle] = useState<Vehicle | null>(null);
  const visibleVehicles = useMemo(() => filterVehicles(vehicles, search), [vehicles, search]);
  const activeDrivers = useMemo(() => drivers.filter((driver) => driver.status === "active"), [drivers]);
  const driversById = useMemo(() => new Map(drivers.map((driver) => [driver.id, driver])), [drivers]);
  const activeAssignmentsByVehicle = useMemo(() => new Map(assignments.filter((assignment) => assignment.status === "active").map((assignment) => [assignment.vehicleId, assignment])), [assignments]);
  const gridClass = canManage ? "grid-cols-[repeat(5,minmax(0,1fr))_20rem]" : "grid-cols-5";

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(vehicle: Vehicle) {
    setEditing(vehicle);
    setFormOpen(true);
  }

  function changeStatus(vehicle: Vehicle) {
    void onStatusChange(vehicle, vehicle.status === "active" ? "inactive" : "active").catch(() => undefined);
  }

  return (
    <div className="tripledgerListPage">
      <Card className="tripledgerListToolbar"><CardContent className="tripledgerListToolbarContent"><label className="relative block"><span className="sr-only">Search vehicles</span><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><VehicleIcon name="search" /></span><Input className="min-h-11 pl-10 pr-10" placeholder="Search vehicles..." value={search} onChange={(event) => setSearch(event.target.value)} />{search && <button type="button" className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Clear vehicle search" onClick={() => setSearch("")}><VehicleIcon name="x" /></button>}</label></CardContent></Card>

      <div className="tripledgerListSummary flex min-h-11 items-center justify-between gap-3"><p className="text-sm font-black text-slate-700 dark:text-slate-200">{visibleVehicles.length} {visibleVehicles.length === 1 ? "vehicle" : "vehicles"}</p>{canManage && <Button type="button" variant="primary" className="w-fit gap-2" onClick={openCreate}><VehicleIcon name="plus" /> Add Vehicle</Button>}</div>

      {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{error}</p>}
      {loading ? <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-300">Loading vehicles...</p> : vehicles.length === 0 ? <EmptyState title="No vehicles yet" description="Add your first vehicle to start building the Fleet Owner directory." /> : visibleVehicles.length === 0 ? <EmptyState title="No vehicles match your search" description="Try another registration, name, make or status." /> : <>
        <div className="hidden min-w-0 xl:grid" role="table" aria-label="Vehicles">
          <div role="row" className={cn("grid overflow-hidden rounded-2xl border border-slate-200 bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/70", gridClass)}><div role="columnheader" className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Vehicle</div><div role="columnheader" className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Registration</div><div role="columnheader" className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Driver</div><div role="columnheader" className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Year</div><div role="columnheader" className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</div>{canManage && <div role="columnheader" className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Actions</div>}</div>
          <div role="rowgroup" className="mt-2.5 grid gap-2.5">{visibleVehicles.map((vehicle) => { const assignment = activeAssignmentsByVehicle.get(vehicle.id); const driver = assignment ? driversById.get(assignment.driverId) : undefined; const assignmentDisabled = vehicle.status !== "active" || activeDrivers.length === 0; return <div key={vehicle.id} role="row" className={cn("grid min-w-0 rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#111827]", gridClass)}><div role="cell" className="min-w-0 px-4 py-3"><span className="block truncate font-black text-slate-950 dark:text-slate-50" title={vehicle.displayName || vehicle.makeModel || "Vehicle"}>{vehicle.displayName || vehicle.makeModel || "Vehicle"}</span>{vehicle.displayName && vehicle.makeModel && <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500 dark:text-slate-400" title={vehicle.makeModel}>{vehicle.makeModel}</span>}</div><div role="cell" className="min-w-0 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200"><span className="block truncate" title={vehicle.registrationNumber}>{vehicle.registrationNumber}</span></div><div role="cell" className="min-w-0 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300"><span className="block truncate" title={driver?.name || "Unassigned"}>{driver?.name || "Unassigned"}</span></div><div role="cell" className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{vehicle.year ?? "NA"}</div><div role="cell" className="px-4 py-3"><StatusBadge status={vehicle.status} /></div>{canManage && <div role="cell" className="flex items-center gap-1 px-3 py-2"><Button type="button" variant="ghost" className="min-h-9 px-2.5" disabled={Boolean(savingId || assignmentSavingVehicleId)} onClick={() => openEdit(vehicle)}>Edit</Button><Button type="button" variant="ghost" className="min-h-9 px-2.5" disabled={Boolean(savingId || assignmentSavingVehicleId)} onClick={() => changeStatus(vehicle)}>{vehicle.status === "active" ? "Deactivate" : "Activate"}</Button><Button type="button" variant="ghost" className="min-h-9 px-2.5" title={assignmentDisabled ? "An active vehicle and active driver are required" : undefined} disabled={Boolean(savingId || assignmentSavingVehicleId) || assignmentDisabled} onClick={() => setAssignmentVehicle(vehicle)}>{assignment ? "Change" : "Assign"}</Button>{assignment && <Button type="button" variant="ghost" className="min-h-9 px-2.5" disabled={Boolean(assignmentSavingVehicleId)} onClick={() => setEndingVehicle(vehicle)}>End</Button>}</div>}</div>; })}</div>
        </div>

        <div className="tripledgerListMobile">{visibleVehicles.map((vehicle) => { const assignment = activeAssignmentsByVehicle.get(vehicle.id); const driver = assignment ? driversById.get(assignment.driverId) : undefined; const assignmentDisabled = vehicle.status !== "active" || activeDrivers.length === 0; return <article key={vehicle.id} className="tripledgerListMobileRow tripledgerListMobileRowContent"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-black text-slate-950 dark:text-slate-50">{vehicle.displayName || vehicle.makeModel || vehicle.registrationNumber}</h2><p className="mt-1 truncate text-sm font-bold text-slate-600 dark:text-slate-300">{vehicle.registrationNumber}</p><p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{[vehicle.displayName ? vehicle.makeModel : "", vehicle.year].filter(Boolean).join(" · ") || "Vehicle details not added"}</p><p className="mt-2 truncate text-sm font-semibold text-slate-700 dark:text-slate-200" title={driver?.name || "Unassigned"}>Driver: {driver?.name || "Unassigned"}</p></div><StatusBadge status={vehicle.status} /></div>{canManage && <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800"><Button type="button" variant="secondary" className="min-h-10" disabled={Boolean(savingId || assignmentSavingVehicleId)} onClick={() => openEdit(vehicle)}>Edit</Button><Button type="button" variant="ghost" className="min-h-10" disabled={Boolean(savingId || assignmentSavingVehicleId)} onClick={() => changeStatus(vehicle)}>{vehicle.status === "active" ? "Mark Inactive" : "Mark Active"}</Button><Button type="button" variant="ghost" className="min-h-10" title={assignmentDisabled ? "An active vehicle and active driver are required" : undefined} disabled={Boolean(assignmentSavingVehicleId) || assignmentDisabled} onClick={() => setAssignmentVehicle(vehicle)}>{assignment ? "Change Driver" : "Assign Driver"}</Button>{assignment && <Button type="button" variant="ghost" className="min-h-10" disabled={Boolean(assignmentSavingVehicleId)} onClick={() => setEndingVehicle(vehicle)}>End Assignment</Button>}</div>}</article>; })}</div>
      </>}

      {formOpen && <VehicleDialog vehicle={editing} saving={Boolean(savingId)} onClose={() => setFormOpen(false)} onSave={async (draft) => { await onSave(draft, editing?.id); setFormOpen(false); }} />}
      {assignmentVehicle && <DriverAssignmentDialog vehicle={assignmentVehicle} drivers={activeDrivers} currentDriverId={activeAssignmentsByVehicle.get(assignmentVehicle.id)?.driverId} saving={assignmentSavingVehicleId === assignmentVehicle.id} onClose={() => setAssignmentVehicle(null)} onAssign={async (driverId) => { await onAssignDriver(assignmentVehicle.id, driverId); setAssignmentVehicle(null); }} />}
      <ConfirmationDialog open={Boolean(endingVehicle)} title="End Driver Assignment?" message={`This will leave ${endingVehicle?.displayName || endingVehicle?.registrationNumber || "this vehicle"} unassigned. Assignment history will be retained.`} confirmLabel="End Assignment" busyLabel="Ending..." confirmVariant="danger" lockCancelWhileBusy onCancel={() => setEndingVehicle(null)} onConfirm={async () => { if (!endingVehicle) return; await onEndAssignment(endingVehicle.id); setEndingVehicle(null); }} />
    </div>
  );
}
