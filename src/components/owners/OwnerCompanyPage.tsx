import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import type { BillingParty, BillingPartyDraft, BillingPartyStatement, BillingPartySummary, LedgerEntry } from "../../types/billingParty";
import type { OwnerPayment, OwnerPaymentDraft, OwnerPaymentMethod, OwnerPaymentType } from "../../types/ownerPayment";
import type { AppSettings } from "../../types/settings";
import { todayInputDate } from "../../constants/defaults";
import { currency } from "../../utils/formatters";
import { buildOwnerStatementText, buildOwnerStatementWhatsAppText, createWhatsAppUrl } from "../../utils/whatsapp";
import { ConfirmationDialog } from "../shared/ConfirmationDialog";
import { EmptyState } from "../shared/EmptyState";
import { MetricCard } from "../shared/MetricCard";
import { Button } from "../ui/Button";
import { Card, CardContent } from "../ui/Card";
import { Input } from "../ui/Input";
import { DecimalInput } from "../ui/DecimalInput";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";
import { cn } from "../ui/cn";
import { useDialogFocus } from "../ui/useDialogFocus";
import { useOverlayPlacement } from "../ui/useOverlayPlacement";
import { MobileBottomSheet, useIsMobile } from "../mobile/MobilePrimitives";

type Props = {
  parties: BillingParty[];
  summaries: BillingPartySummary[];
  ledgerByPartyId: Record<string, LedgerEntry[]>;
  payments: OwnerPayment[];
  settings: AppSettings;
  loading: boolean;
  error: string;
  partySaving: boolean;
  partyDeletingIds: string[];
  paymentSaving: boolean;
  paymentDeletingIds: string[];
  onLoadLedger: (billingPartyId: string) => Promise<LedgerEntry[]>;
  onLoadStatement: (billingPartyId: string, fromDate: string, toDate: string) => Promise<BillingPartyStatement | null>;
  onCopy: (text: string) => void;
  onSaveParty: (draft: BillingPartyDraft, editingId?: string | null) => Promise<BillingParty>;
  onDeleteParty: (id: string) => Promise<void>;
  onSavePayment: (draft: OwnerPaymentDraft, editingId?: string | null) => Promise<OwnerPayment>;
  onDeletePayment: (id: string) => Promise<void>;
  onCreateBillForOwner: (party: BillingParty) => void;
  onMobileDetailChange?: (party: BillingParty | null, onBack?: () => void) => void;
  initialSelectedId?: string | null;
};

type SortOption = "recent" | "highest" | "name-asc" | "name-desc";
type TransactionSortOption = "newest" | "oldest";
type StatementsTab = "transactions" | "statements";
type OwnerModule = "statements" | "payments" | null;
type DatePickerTarget = "from" | "to" | null;

const emptyPartyDraft: BillingPartyDraft = {
  userId: undefined,
  name: "",
  companyName: "",
  phone: "",
  email: "",
  address: "",
  notes: ""
};

const iconButtonClass = "grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-[#1E3A8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-[#111827] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-200 dark:focus-visible:ring-offset-slate-950";
const menuItemClass = "flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200 dark:hover:bg-slate-800";
const destructiveMenuItemClass = "flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-red-200 dark:hover:bg-red-950/40";
const ownerTableHeaderClass = "px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400";
const ownerTableCellClass = "border-y border-slate-200 bg-white px-4 py-3 align-middle dark:border-slate-800 dark:bg-[#111827]";
const ownerAmountClass = "whitespace-nowrap font-black text-[#1E3A8A] dark:text-blue-200";
const OWNER_SORT_KEY = "tripledger:owners-sort";
const OWNER_TRANSACTION_SORT_KEY_PREFIX = "tripledger.ownerTransactionSort";

function emptyPaymentDraft(billingPartyId: string): OwnerPaymentDraft {
  return {
    userId: undefined,
    billingPartyId,
    paymentDate: todayInputDate(),
    amount: 0,
    paymentType: "payment_received",
    paymentMethod: "",
    reference: "",
    notes: ""
  };
}

function latestActivity(summary?: BillingPartySummary): string {
  if (!summary) return "";
  const dates = [summary.latestBillDate, summary.latestPaymentDate].filter(Boolean).sort();
  return dates[dates.length - 1] ?? "";
}

function labelize(value: string): string {
  if (value === "bill") return "Bill";
  if (value === "advance_received") return "Advance Received";
  if (value === "bank_transfer") return "Bank Transfer";
  if (value === "upi") return "UPI";
  return value === "payment_received" ? "Payment Received" : value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ownerDateDisplay(value: string): string {
  if (!value) return "NA";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "NA";
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function plural(count: number | undefined, singular: string, pluralLabel = `${singular}s`): string {
  const value = Number(count ?? 0);
  return `${value} ${value === 1 ? singular : pluralLabel}`;
}

function runningBalanceDisplay(value: number, symbol: string): string {
  if (value < 0) return `Advance ${currency(Math.abs(value), symbol)}`;
  return currency(value, symbol);
}

function entryCustomer(entry: LedgerEntry | { entryType: LedgerEntry["entryType"]; description: string }): string {
  if (entry.entryType !== "bill") return "—";
  return entry.description || "NA";
}

function balanceStatus(summary: BillingPartySummary | undefined, symbol: string): { label: string; amountLabel: string; tone: "danger" | "success" | "info" } {
  if (summary?.outstandingAmount && summary.outstandingAmount > 0) return { label: "Outstanding", amountLabel: currency(summary.outstandingAmount, symbol), tone: "danger" };
  if (summary?.advanceCredit && summary.advanceCredit > 0) return { label: "Advance Available", amountLabel: currency(summary.advanceCredit, symbol), tone: "success" };
  return { label: "Settled", amountLabel: "", tone: "info" };
}

function partyDisplayName(party: BillingParty | undefined): string {
  if (!party) return "Owner / Company";
  return party.companyName || party.name;
}

function ownerTransactionSortKey(ownerId: string): string {
  return `${OWNER_TRANSACTION_SORT_KEY_PREFIX}.${ownerId}`;
}

function isTransactionSortOption(value: string | null): value is TransactionSortOption {
  return value === "newest" || value === "oldest";
}

function currentMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function inputDate(date: Date): string {
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function parseInputDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function quickDateRange(preset: "today" | "week" | "month" | "last-month"): { fromDate: string; toDate: string } {
  const now = new Date();
  if (preset === "today") {
    const today = inputDate(now);
    return { fromDate: today, toDate: today };
  }

  if (preset === "week") {
    const day = now.getDay() || 7;
    const first = new Date(now);
    first.setDate(now.getDate() - day + 1);
    const last = new Date(first);
    last.setDate(first.getDate() + 6);
    return { fromDate: inputDate(first), toDate: inputDate(last) };
  }

  const monthOffset = preset === "last-month" ? -1 : 0;
  const first = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const last = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0);
  return { fromDate: inputDate(first), toDate: inputDate(last) };
}

function Icon({ name }: { name: "plus" | "search" | "x" | "sort" | "more" | "eye" | "edit" | "trash" | "back" | "wallet" | "bill" | "ledger" | "statement" | "chevronDown" | "copy" | "share" | "download" | "calendar" | "check" }) {
  const common = { className: "h-4 w-4", viewBox: "0 0 24 24", fill: "none", "aria-hidden": true };
  if (name === "plus") return <svg {...common}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "search") return <svg {...common}><path d="m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "x") return <svg {...common}><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "sort") return <svg {...common}><path d="M7 4v14m0 0 3-3m-3 3-3-3M17 20V6m0 0-3 3m3-3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "more") return <svg {...common}><path d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "eye") return <svg {...common}><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="2" /></svg>;
  if (name === "edit") return <svg {...common}><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
  if (name === "trash") return <svg {...common}><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "back") return <svg {...common}><path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "wallet") return <svg {...common}><path d="M4 7h15a2 2 0 0 1 2 2v9H4a2 2 0 0 1-2-2V5a2 2 0 0 0 2 2Zm13 5h4" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
  if (name === "bill") return <svg {...common}><path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2V3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "ledger") return <svg {...common}><path d="M5 4h14v16H5zM9 4v16M12 8h4M12 12h4M12 16h4" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
  if (name === "statement") return <svg {...common}><path d="M7 3h7l4 4v14H7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M14 3v5h5M9 13h6M9 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "copy") return <svg {...common}><path d="M8 8h10v12H8zM6 16H4V4h12v2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
  if (name === "share") return <svg {...common}><path d="M12 16V4m0 0L7 9m5-5 5 5M5 14v5h14v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "download") return <svg {...common}><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "calendar") return <svg {...common}><path d="M7 3v3M17 3v3M4 8h16M5 5h14v15H5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "check") return <svg {...common}><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg {...common}><path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function StatusBadge({ summary, symbol }: { summary?: BillingPartySummary; symbol: string }) {
  const status = balanceStatus(summary, symbol);
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center justify-start rounded-full px-2.5 py-1 text-left text-xs font-black",
        status.tone === "danger" && "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200",
        status.tone === "success" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200",
        status.tone === "info" && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
      )}
    >
      {status.amountLabel ? `${status.label} ${status.amountLabel}` : status.label}
    </span>
  );
}

function Modal({ title, description, maxWidth = "max-w-2xl", onClose, children }: { title: string; description?: string; maxWidth?: string; onClose: () => void; children: ReactNode }) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useDialogFocus(true, dialogRef, onClose);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-3 sm:p-4" onMouseDown={onClose}>
      <Card ref={dialogRef} className={cn("max-h-[92vh] w-full overflow-hidden focus:outline-none", maxWidth)} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="owner-modal-title" tabIndex={-1}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 dark:border-slate-700 sm:p-5">
          <div className="min-w-0">
            <h2 id="owner-modal-title" className="text-base font-black text-slate-950 dark:text-slate-50">{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
          <button type="button" className={iconButtonClass} aria-label={`Close ${title}`} title="Close" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="max-h-[calc(92vh-90px)] overflow-y-auto p-4 sm:p-5">{children}</div>
      </Card>
    </div>
  );
}

function ActionMenu({ menuId, activeMenu, onActiveMenuChange, triggerLabel, trigger, iconOnly = false, children }: {
  menuId: string;
  activeMenu: string | null;
  onActiveMenuChange: (menuId: string | null) => void;
  triggerLabel: string;
  trigger: ReactNode;
  iconOnly?: boolean;
  children: (close: (restoreFocus?: boolean) => void) => ReactNode;
}) {
  const isOpen = activeMenu === menuId;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const { style } = useOverlayPlacement(isOpen, triggerRef, overlayRef);
  const isMobile = useIsMobile();

  function close(restoreFocus = true) {
    onActiveMenuChange(null);
    if (restoreFocus) triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!isOpen || isMobile) return;
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      close(true);
    }
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isMobile, isOpen]);

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'));
    if (items.length === 0) return;
    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : event.key === "ArrowDown"
          ? (currentIndex + 1 + items.length) % items.length
          : (currentIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus();
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={cn("inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-[#111827] dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-blue-200 dark:focus:ring-offset-slate-950", iconOnly && "h-11 w-11 p-0")}
        aria-label={triggerLabel}
        title={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => onActiveMenuChange(isOpen ? null : menuId)}
      >
        {trigger}
      </button>
      {isOpen && !isMobile && (
        <div
          ref={overlayRef}
          role="menu"
          aria-label={triggerLabel}
          style={style}
          className="z-30 w-52 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-[#111827] dark:shadow-black/30"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={handleMenuKeyDown}
        >
          {children(close)}
        </div>
      )}
      <MobileBottomSheet open={isOpen && isMobile} title={triggerLabel} onClose={() => close(true)}>
        <div role="menu" aria-label={triggerLabel} className="space-y-1">{children(close)}</div>
      </MobileBottomSheet>
    </div>
  );
}

type SelectOption<T extends string = string> = { value: T; label: string };

function CustomSelect<T extends string>({ label, value, options, onChange, iconOnly = false }: { label: string; value: T; options: SelectOption<T>[]; onChange: (value: T) => void; iconOnly?: boolean }) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(selectedIndex);
  const selectedOption = options[selectedIndex] ?? options[0];
  const isMobile = useIsMobile();

  function close(restoreFocus = false) {
    setIsOpen(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function open() {
    setHighlightedIndex(selectedIndex);
    setIsOpen(true);
  }

  function selectOption(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    close(true);
  }

  useEffect(() => {
    if (!isOpen || isMobile) return;
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    }
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [isMobile, isOpen]);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      close(true);
      return;
    }
    if (!isOpen && ["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      open();
      return;
    }
    if (!isOpen) return;
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      setHighlightedIndex((current) => {
        if (event.key === "Home") return 0;
        if (event.key === "End") return options.length - 1;
        return event.key === "ArrowDown" ? (current + 1) % options.length : (current - 1 + options.length) % options.length;
      });
      return;
    }
    if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      selectOption(highlightedIndex);
    }
  }

  return (
    <div className="relative" ref={rootRef} onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        className={cn("inline-flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:border-[#1E3A8A] hover:bg-blue-50 hover:text-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 data-[open=true]:border-[#1E3A8A] dark:border-slate-700 dark:bg-[#111827] dark:text-slate-200 dark:hover:border-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-100 dark:focus:ring-offset-slate-950", iconOnly && "w-11 justify-center p-0")}
        aria-label={`${label}: ${selectedOption?.label}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={isOpen ? `${listboxId}-option-${highlightedIndex}` : undefined}
        data-open={isOpen}
        onClick={() => isOpen ? close() : open()}
      >
        <span className="shrink-0 text-slate-400"><Icon name="sort" /></span>
        <span className={cn("min-w-0 flex-1 truncate text-left", iconOnly && "sr-only")}>{selectedOption?.label}</span>
        {!iconOnly && <span className={cn("shrink-0 text-slate-400 transition-transform", isOpen && "rotate-180")}><Icon name="chevronDown" /></span>}
      </button>
      {isOpen && !isMobile && (
        <div id={listboxId} role="listbox" aria-label={label} className="absolute right-0 z-40 mt-2 max-h-64 w-full min-w-52 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-[#111827] dark:shadow-black/30">
          {options.map((option, index) => {
            const selected = option.value === value;
            const highlighted = index === highlightedIndex;
            return (
              <button
                key={option.value}
                id={`${listboxId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={selected}
                tabIndex={-1}
                className={cn("flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold focus:outline-none", highlighted ? "bg-blue-50 text-[#1E3A8A] dark:bg-slate-800 dark:text-blue-100" : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800", selected && "font-black")}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => selectOption(index)}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                <span className={cn("shrink-0 text-[#1E3A8A] dark:text-blue-300", !selected && "invisible")}><Icon name="check" /></span>
              </button>
            );
          })}
        </div>
      )}
      <MobileBottomSheet open={isOpen && isMobile} title={label} onClose={() => close(true)}>
        <div role="listbox" aria-label={label} className="space-y-1">
          {options.map((option, index) => {
            const selected = option.value === value;
            return (
              <button key={option.value} type="button" role="option" aria-selected={selected} className={cn("flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left text-sm font-bold", selected ? "bg-blue-50 text-[#1E3A8A] dark:bg-blue-950/40 dark:text-blue-200" : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800")} onClick={() => selectOption(index)}>
                <span className="truncate">{option.label}</span>{selected && <Icon name="check" />}
              </button>
            );
          })}
        </div>
      </MobileBottomSheet>
    </div>
  );
}

function CustomDatePicker({ label, value, min, max, open, align, compact = false, onOpenChange, onChange }: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  open: boolean;
  align: "start" | "end";
  compact?: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const { style } = useOverlayPlacement(open, triggerRef, overlayRef, { align, estimatedHeight: 330 });
  const selectedDate = value ? parseInputDate(value) : undefined;

  function close(restoreFocus = false) {
    onOpenChange(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      close(true);
    }
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        className={cn("flex min-h-11 w-full cursor-pointer items-center gap-2 border border-slate-200 bg-white px-3 text-left text-sm font-semibold text-slate-700 hover:border-[#1E3A8A] hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-[#0f172a] dark:text-slate-200 dark:hover:border-blue-600 dark:hover:bg-slate-800 dark:focus:ring-offset-slate-950", compact ? "rounded-lg" : "rounded-xl")}
        aria-label={`Choose ${label}. Current value ${ownerDateDisplay(value)}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        <span className="text-slate-400"><Icon name="calendar" /></span>
        <span className="min-w-0 flex-1 truncate">{ownerDateDisplay(value)}</span>
        <span className={cn("text-slate-400 transition-transform", open && "rotate-180")}><Icon name="chevronDown" /></span>
      </button>
      {open && (
        <div ref={overlayRef} role="dialog" aria-label={`${label} calendar`} style={style} className={cn("z-50 w-[min(19rem,calc(100vw-3rem))] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/15 dark:border-slate-700 dark:bg-[#0f172a] dark:shadow-black/40", align === "start" && "sm:origin-top-left")}>
          <DayPicker
            mode="single"
            selected={selectedDate}
            defaultMonth={selectedDate ?? new Date()}
            fixedWeeks
            showOutsideDays
            navLayout="around"
            className="tripledger-calendar"
            disabled={[...(min ? [{ before: parseInputDate(min) }] : []), ...(max ? [{ after: parseInputDate(max) }] : [])]}
            footer={<span className="sr-only" aria-live="polite">{value ? `${ownerDateDisplay(value)} selected` : `Choose ${label}`}</span>}
            components={{ Chevron: ({ orientation }) => <Icon name={orientation === "left" ? "back" : "chevronDown"} /> }}
            onSelect={(date) => {
              if (!date) return;
              onChange(inputDate(date));
              close(true);
            }}
          />
        </div>
      )}
    </div>
  );
}

function OwnerAccordion({ module, title, description, icon, openModule, onToggle, mobileTabMode = false, children }: { module: Exclude<OwnerModule, null>; title: string; description: string; icon: "ledger" | "statement" | "wallet"; openModule: OwnerModule; onToggle: (module: Exclude<OwnerModule, null>) => void; mobileTabMode?: boolean; children: ReactNode }) {
  const open = openModule === module;
  const contentId = `owner-${module}-section`;
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30 dark:border-slate-700 dark:bg-[#111827] dark:shadow-black/20", mobileTabMode && !open && "max-lg:hidden")}>
      <button
        type="button"
        className={cn("flex w-full cursor-pointer items-center justify-between gap-3 rounded-t-2xl bg-slate-50 px-4 py-4 text-left hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset dark:bg-[#0f172a] dark:hover:bg-slate-800 sm:px-5", mobileTabMode && "max-lg:hidden")}
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => onToggle(module)}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#1E3A8A] dark:bg-slate-800 dark:text-blue-200"><Icon name={icon} /></span>
          <span className="min-w-0">
            <span className="block text-sm font-black text-slate-950 dark:text-slate-50">{title}</span>
            <span className="block truncate text-sm font-semibold text-slate-500 dark:text-slate-400">{description}</span>
          </span>
        </span>
        <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 transition-transform dark:bg-slate-800 dark:text-slate-300", open && "rotate-180")}><Icon name="chevronDown" /></span>
      </button>
      {open && <div id={contentId} className={cn("rounded-b-2xl border-t border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#111827] sm:p-5", mobileTabMode && "max-lg:rounded-2xl max-lg:border-t-0")}>{children}</div>}
    </section>
  );
}

function DateRangeControls({ fromDate, toDate, activeDatePicker, onActiveDatePickerChange, onRangeChange, onGenerate, loading }: {
  fromDate: string;
  toDate: string;
  activeDatePicker: DatePickerTarget;
  onActiveDatePickerChange: (target: DatePickerTarget) => void;
  onRangeChange: (fromDate: string, toDate: string) => void;
  onGenerate: () => void;
  loading: boolean;
}) {
  function applyQuickRange(preset: "today" | "week" | "month" | "last-month") {
    const range = quickDateRange(preset);
    onRangeChange(range.fromDate, range.toDate);
  }

  const quickRanges: Array<{ id: "today" | "week" | "month" | "last-month"; label: string }> = [
    { id: "today", label: "Today" },
    { id: "week", label: "This Week" },
    { id: "month", label: "This Month" },
    { id: "last-month", label: "Last Month" }
  ];

  return (
    <div className="space-y-4 lg:rounded-xl lg:border lg:border-slate-200 lg:bg-slate-50/70 lg:p-4 lg:dark:border-slate-700 lg:dark:bg-[#0f172a]">
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-slate-950 dark:text-slate-50">Generate Account Statement</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose a date range to preview, copy, share, or export a statement.</p>
      </div>
      <div className="overflow-x-auto pb-1 lg:overflow-visible lg:pb-0">
      <div className="grid min-w-[20rem] grid-cols-4 gap-1 lg:flex lg:min-w-0 lg:flex-wrap lg:gap-2">
        {quickRanges.map((range) => {
          const quick = quickDateRange(range.id);
          const selected = quick.fromDate === fromDate && quick.toDate === toDate;
          return (
            <button
              key={range.id}
              type="button"
              className={cn(
                "min-h-11 cursor-pointer rounded-lg border px-1 text-[11px] font-semibold whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950 lg:min-h-9 lg:px-2.5 lg:text-xs",
                selected
                  ? "border-[#1E3A8A] bg-[#1E3A8A] text-white dark:border-blue-600 dark:bg-blue-600"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-[#1E3A8A] dark:border-slate-700 dark:bg-[#0f172a] dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-blue-200"
              )}
              aria-pressed={selected}
              onClick={() => applyQuickRange(range.id)}
            >
              {range.label}
            </button>
          );
        })}
      </div>
      </div>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Period</span>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="w-full sm:w-56">
            <span className="sr-only">From Date</span>
            <CustomDatePicker compact label="From date" value={fromDate} max={toDate} open={activeDatePicker === "from"} align="start" onOpenChange={(open) => onActiveDatePickerChange(open ? "from" : null)} onChange={(value) => onRangeChange(value, toDate)} />
          </div>
          <span aria-hidden="true" className="self-center text-sm text-slate-400 sm:self-auto">→</span>
          <div className="w-full sm:w-56">
            <span className="sr-only">To Date</span>
            <CustomDatePicker compact label="To date" value={toDate} min={fromDate} open={activeDatePicker === "to"} align="start" onOpenChange={(open) => onActiveDatePickerChange(open ? "to" : null)} onChange={(value) => onRangeChange(fromDate, value)} />
          </div>
          <Button type="button" variant="primary" className="w-full shrink-0 gap-2 sm:w-auto" disabled={loading} onClick={onGenerate}><Icon name="statement" />{loading ? "Generating..." : "Generate Statement"}</Button>
        </div>
      </div>
    </div>
  );
}

const sortOptions: SelectOption<SortOption>[] = [
  { value: "recent", label: "Recently Active" },
  { value: "highest", label: "Highest Outstanding" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" }
];

const transactionSortOptions: SelectOption<TransactionSortOption>[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" }
];

function isOwnerSortOption(value: string | null): value is SortOption {
  return sortOptions.some((option) => option.value === value);
}

export function OwnerCompanyPage({
  parties,
  summaries,
  ledgerByPartyId,
  payments,
  settings,
  loading,
  error,
  partySaving,
  partyDeletingIds,
  paymentSaving,
  paymentDeletingIds,
  onLoadLedger,
  onLoadStatement,
  onCopy,
  onSaveParty,
  onDeleteParty,
  onSavePayment,
  onDeletePayment,
  onCreateBillForOwner,
  onMobileDetailChange,
  initialSelectedId
}: Props) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>(() => {
    const saved = window.localStorage.getItem(OWNER_SORT_KEY);
    return isOwnerSortOption(saved) ? saved : "recent";
  });
  const [transactionSort, setTransactionSort] = useState<TransactionSortOption>("newest");
  const [statementsTab, setStatementsTab] = useState<StatementsTab>("transactions");
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
  const [openModule, setOpenModule] = useState<OwnerModule>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [partyDraft, setPartyDraft] = useState<BillingPartyDraft>(emptyPartyDraft);
  const [editingPartyId, setEditingPartyId] = useState<string | null>(null);
  const [partyFormOpen, setPartyFormOpen] = useState(false);
  const [paymentDraft, setPaymentDraft] = useState<OwnerPaymentDraft | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [deleteParty, setDeleteParty] = useState<BillingParty | null>(null);
  const [deletePayment, setDeletePayment] = useState<OwnerPayment | null>(null);
  const [localError, setLocalError] = useState("");
  const [statementFromDate, setStatementFromDate] = useState(currentMonthStart);
  const [statementToDate, setStatementToDate] = useState(todayInputDate);
  const [activeDatePicker, setActiveDatePicker] = useState<DatePickerTarget>(null);
  const [statement, setStatement] = useState<BillingPartyStatement | null>(null);
  const [statementLoading, setStatementLoading] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const isMobile = useIsMobile();

  const summaryById = useMemo(() => new Map(summaries.map((summary) => [summary.billingPartyId, summary])), [summaries]);
  const selectedParty = parties.find((party) => party.id === selectedId) ?? null;
  const selectedSummary = selectedParty ? summaryById.get(selectedParty.id) : undefined;
  const selectedStatus = balanceStatus(selectedSummary, settings.currencySymbol);
  const selectedLedger = selectedParty ? ledgerByPartyId[selectedParty.id] ?? [] : [];
  const sortedLedger = useMemo(() => {
    const rows = selectedLedger.map((entry, index) => ({ entry, index }));
    return rows
      .sort((a, b) => {
        const secondaryA = `${a.entry.referenceId}|${a.entry.entryType}|${a.entry.description}`;
        const secondaryB = `${b.entry.referenceId}|${b.entry.entryType}|${b.entry.description}`;
        const oldestFirst = a.entry.entryDate.localeCompare(b.entry.entryDate) || secondaryA.localeCompare(secondaryB) || a.index - b.index;
        return transactionSort === "oldest" ? oldestFirst : -oldestFirst;
      })
      .map((row) => row.entry);
  }, [selectedLedger, transactionSort]);
  const selectedPayments = selectedParty ? payments.filter((payment) => payment.billingPartyId === selectedParty.id) : [];
  const selectedPaymentsTotal = selectedPayments.reduce((total, payment) => total + Number(payment.amount || 0), 0);

  const filteredParties = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = parties.filter((party) => {
      if (!needle) return true;
      return `${party.name} ${party.companyName} ${party.phone} ${party.email}`.toLowerCase().includes(needle);
    });
    return [...filtered].sort((a, b) => {
      const summaryA = summaryById.get(a.id);
      const summaryB = summaryById.get(b.id);
      if (sort === "highest") return Number(summaryB?.outstandingAmount ?? 0) - Number(summaryA?.outstandingAmount ?? 0);
      if (sort === "name-asc") return partyDisplayName(a).localeCompare(partyDisplayName(b));
      if (sort === "name-desc") return partyDisplayName(b).localeCompare(partyDisplayName(a));
      return latestActivity(summaryB).localeCompare(latestActivity(summaryA));
    });
  }, [parties, search, sort, summaryById]);

  useEffect(() => {
    if (selectedId && !parties.some((party) => party.id === selectedId)) setSelectedId(null);
  }, [parties, selectedId]);

  useEffect(() => {
    if (selectedId) void onLoadLedger(selectedId);
    if (selectedId) {
      const savedSort = window.localStorage.getItem(ownerTransactionSortKey(selectedId));
      setTransactionSort(isTransactionSortOption(savedSort) ? savedSort : "newest");
    }
    setStatementsTab("transactions");
    setStatement(null);
    setSummaryExpanded(false);
    setActiveMenu(null);
    setLocalError("");
    setOpenModule(isMobile && selectedId ? "statements" : null);
  }, [isMobile, selectedId]);

  useEffect(() => {
    onMobileDetailChange?.(selectedParty, selectedParty ? () => setSelectedId(null) : undefined);
    return () => onMobileDetailChange?.(null);
  }, [selectedId]);

  function openOwner(party: BillingParty) {
    setSelectedId(party.id);
  }

  function backToOwners() {
    setSelectedId(null);
    setOpenModule(null);
    setActiveMenu(null);
    setPaymentDraft(null);
    setEditingPaymentId(null);
    setStatement(null);
  }

  async function generateStatement() {
    if (!selectedParty) return;
    if (!statementFromDate || !statementToDate || statementFromDate > statementToDate) {
      setLocalError("Please select a valid date range.");
      return;
    }
    setStatementLoading(true);
    setLocalError("");
    try {
      const nextStatement = await onLoadStatement(selectedParty.id, statementFromDate, statementToDate);
      setStatement(nextStatement);
      if (!nextStatement) setLocalError("Unable to load the owner statement.");
    } catch {
      setLocalError("Unable to load the owner statement.");
    } finally {
      setStatementLoading(false);
    }
  }

  async function exportStatementPdf() {
    if (!statement) return;
    try {
      const { exportOwnerStatementPdf } = await import("../../utils/pdf");
      exportOwnerStatementPdf(statement, settings);
    } catch {
      setLocalError("Unable to export the statement.");
    }
  }

  function copyStatement() {
    if (!statement) return;
    onCopy(buildOwnerStatementText(statement, settings));
  }

  function shareStatement() {
    if (!statement) return;
    window.open(createWhatsAppUrl(buildOwnerStatementWhatsAppText(statement, settings)), "_blank", "noopener,noreferrer");
  }

  function startCreateParty() {
    setPartyDraft(emptyPartyDraft);
    setEditingPartyId(null);
    setPartyFormOpen(true);
    setActiveMenu(null);
    setLocalError("");
  }

  function startEditParty(party: BillingParty) {
    setPartyDraft({
      userId: party.userId,
      name: party.name,
      companyName: party.companyName,
      phone: party.phone,
      email: party.email,
      address: party.address,
      notes: party.notes
    });
    setEditingPartyId(party.id);
    setPartyFormOpen(true);
    setActiveMenu(null);
    setLocalError("");
  }

  async function saveParty() {
    try {
      setLocalError("");
      const saved = await onSaveParty(partyDraft, editingPartyId);
      setSelectedId(saved.id);
      setPartyFormOpen(false);
    } catch {
      setLocalError("Unable to save Owner / Company.");
    }
  }

  function startPayment(payment?: OwnerPayment, party = selectedParty) {
    if (!party) return;
    setPaymentDraft(payment ? {
      userId: payment.userId,
      billingPartyId: payment.billingPartyId,
      paymentDate: payment.paymentDate,
      amount: payment.amount,
      paymentType: payment.paymentType,
      paymentMethod: payment.paymentMethod,
      reference: payment.reference,
      notes: payment.notes
    } : emptyPaymentDraft(party.id));
    setEditingPaymentId(payment?.id ?? null);
    setActiveMenu(null);
    setLocalError("");
  }

  async function savePayment() {
    if (!paymentDraft) return;
    try {
      setLocalError("");
      await onSavePayment(paymentDraft, editingPaymentId);
      setPaymentDraft(null);
      setEditingPaymentId(null);
      if (paymentDraft.billingPartyId) void onLoadLedger(paymentDraft.billingPartyId);
    } catch {
      setLocalError("Unable to save payment.");
    }
  }

  async function confirmDeletePayment() {
    if (!deletePayment) return;
    try {
      await onDeletePayment(deletePayment.id);
      await onLoadLedger(deletePayment.billingPartyId);
      setDeletePayment(null);
    } catch {
      setLocalError("Unable to delete payment.");
    }
  }

  const relatedCount = (party: BillingParty) => {
    const summary = summaryById.get(party.id);
    return Number(summary?.billCount ?? 0) + Number(summary?.paymentCount ?? 0);
  };

  async function confirmDeleteParty() {
    if (!deleteParty) return;
    if (relatedCount(deleteParty) > 0) {
      setLocalError("This owner cannot be deleted while linked bills or payments exist.");
      setDeleteParty(null);
      return;
    }
    try {
      await onDeleteParty(deleteParty.id);
      setDeleteParty(null);
      if (selectedId === deleteParty.id) backToOwners();
    } catch {
      setLocalError("Unable to delete Owner / Company.");
    }
  }

  function handleRangeChange(fromDate: string, toDate: string) {
    setStatementFromDate(fromDate);
    setStatementToDate(toDate);
    setStatement(null);
  }

  function changeTransactionSort(value: TransactionSortOption) {
    setTransactionSort(value);
    if (selectedId) window.localStorage.setItem(ownerTransactionSortKey(selectedId), value);
  }

  function changeOwnerSort(value: SortOption) {
    setSort(value);
    window.localStorage.setItem(OWNER_SORT_KEY, value);
  }

  function handleStatementsTabKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const tabs: StatementsTab[] = ["transactions", "statements"];
    const currentIndex = tabs.indexOf(statementsTab);
    const nextTab = event.key === "Home"
      ? tabs[0]
      : event.key === "End"
        ? tabs[tabs.length - 1]
        : tabs[(currentIndex + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
    setStatementsTab(nextTab);
    requestAnimationFrame(() => document.getElementById(`owner-${nextTab}-tab`)?.focus());
  }

  function toggleModule(module: Exclude<OwnerModule, null>) {
    setOpenModule((current) => current === module ? null : module);
  }

  function renderOwnerActions(party: BillingParty, includeView = true, iconOnly = false) {
    return (
      <ActionMenu menuId={`owner-${party.id}`} activeMenu={activeMenu} onActiveMenuChange={setActiveMenu} triggerLabel={`Actions for ${partyDisplayName(party)}`} trigger={<Icon name="more" />} iconOnly={iconOnly}>
        {(close) => (
          <>
            {includeView && <button type="button" role="menuitem" className={menuItemClass} onClick={() => { close(); openOwner(party); }}><Icon name="eye" /> View Owner</button>}
            <button type="button" role="menuitem" className={menuItemClass} onClick={() => { close(); startEditParty(party); }}><Icon name="edit" /> Edit Owner</button>
            <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
            <button type="button" role="menuitem" className={destructiveMenuItemClass} disabled={partyDeletingIds.includes(party.id)} onClick={() => { close(); setDeleteParty(party); }}><Icon name="trash" /> Delete Owner</button>
          </>
        )}
      </ActionMenu>
    );
  }

  const shownError = localError || error;

  return (
    <div className="tripledgerListPage min-w-0 max-w-full">
      <header className="tripledgerListMobileHeader">
        <h1 className="text-xl font-black text-slate-950 dark:text-slate-50">Owners & Payments</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Track owner balances, bills and payments</p>
      </header>

      {shownError && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-red-700 dark:text-red-200">{shownError}</p>
          </CardContent>
        </Card>
      )}

      {!selectedParty ? (
        <>
          <Card className="tripledgerListToolbar">
            <CardContent className={cn("tripledgerListToolbarContent", isMobile && "p-2.5")}>
            <div className={cn("tripledgerListToolbarGrid", isMobile ? "grid-cols-[minmax(0,1fr)_2.75rem] gap-2" : "lg:grid-cols-[minmax(0,1fr)_14rem]")}>
              <label className="relative block">
                <span className="sr-only">Search owners or companies</span>
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon name="search" /></span>
                <Input className="min-h-11 pl-10 pr-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={isMobile ? "Search owners..." : "Search owners or companies..."} />
                {search && (
                  <button type="button" className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200" aria-label="Clear owner search" onClick={() => setSearch("")}>
                    <Icon name="x" />
                  </button>
                )}
              </label>
              <CustomSelect label="Sort owners" value={sort} options={sortOptions} onChange={changeOwnerSort} iconOnly={isMobile} />
            </div>
            </CardContent>
          </Card>

          <div className={cn(isMobile ? "flex min-h-11 items-center justify-between gap-3 px-1" : "tripledgerListSummary flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between")}>
            <p className="text-sm font-black text-slate-700 dark:text-slate-200">{filteredParties.length} owners</p>
            <Button type="button" variant="primary" className={cn("w-fit gap-2", isMobile && "min-h-10 px-3")} onClick={startCreateParty}><Icon name="plus" /> Add Owner</Button>
          </div>

          {loading ? (
            <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-300">Loading owners...</p>
          ) : parties.length === 0 ? (
            <EmptyState title="No owners yet" description="Add an Owner / Company to start tracking bills, payments and balances." />
          ) : filteredParties.length === 0 ? (
            <div className="space-y-4">
              <EmptyState title="No owners match your search" description="Try another name or clear the search." />
              <div className="flex justify-center">
                <Button type="button" variant="secondary" className="gap-2" onClick={() => setSearch("")}><Icon name="x" /> Clear Search</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="tripledgerListDesktop">
                  <table className="historyBillTable tripledgerListTable min-w-0" aria-label="Owners and payments">
                    <colgroup>
                      <col className="tripledgerDataColumn" />
                      <col className="tripledgerDataColumn" />
                      <col className="tripledgerDataColumn" />
                      <col className="tripledgerDataColumn" />
                      <col className="tripledgerDataColumn" />
                      <col className="tripledgerActionsColumn" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className={ownerTableHeaderClass}>Owner / Company</th>
                        <th className={cn(ownerTableHeaderClass, "tripledgerStatusCell")}>Balance Status</th>
                        <th className={ownerTableHeaderClass}>Bills</th>
                        <th className={ownerTableHeaderClass}>Payments</th>
                        <th className={ownerTableHeaderClass}>Last Activity</th>
                        <th className={cn(ownerTableHeaderClass, "tripledgerActionsCell")}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredParties.map((party) => {
                        const summary = summaryById.get(party.id);
                        const latest = latestActivity(summary);
                        return (
                          <tr key={party.id} className="group">
                            <td>
                              <button type="button" className="block min-w-0 w-full cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-blue-500" onClick={() => openOwner(party)}>
                                <span className="block truncate font-black text-slate-950 group-hover:text-[#1E3A8A] dark:text-slate-50 dark:group-hover:text-blue-200" title={partyDisplayName(party)}>{partyDisplayName(party)}</span>
                                {(party.phone || party.email) && <span className="mt-1 block truncate text-xs font-semibold text-slate-500 dark:text-slate-400" title={[party.phone, party.email].filter(Boolean).join(" | ")}>{[party.phone, party.email].filter(Boolean).join(" | ")}</span>}
                              </button>
                            </td>
                            <td className="tripledgerStatusCell min-w-0 overflow-hidden"><StatusBadge summary={summary} symbol={settings.currencySymbol} /></td>
                            <td className="font-bold text-slate-700 dark:text-slate-200">{plural(summary?.billCount, "bill")}</td>
                            <td className="font-bold text-slate-700 dark:text-slate-200">{plural(summary?.paymentCount, "payment")}</td>
                            <td className="font-semibold text-slate-600 dark:text-slate-300">{latest ? ownerDateDisplay(latest) : "NA"}</td>
                            <td className="tripledgerActionsCell">
                              <div className="flex items-center">{renderOwnerActions(party)}</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
              </div>

              <div className="tripledgerListMobile">
                  {filteredParties.map((party) => {
                    const summary = summaryById.get(party.id);
                    const latest = latestActivity(summary);
                    const status = balanceStatus(summary, settings.currencySymbol);
                    return (
                      <article key={party.id} className="tripledgerListMobileRow tripledgerListMobileRowContent">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h2 className="truncate font-black text-slate-950 dark:text-slate-50">{partyDisplayName(party)}</h2>
                            {(party.phone || party.email) && <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{[party.phone, party.email].filter(Boolean).join(" | ")}</p>}
                          </div>
                          {renderOwnerActions(party)}
                        </div>
                        <div className="mt-3">
                          <p className={cn("text-xs font-black uppercase tracking-wide", status.tone === "danger" ? "text-red-600 dark:text-red-300" : status.tone === "success" ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400")}>{status.label}</p>
                          <p className="mt-0.5 text-xl font-black text-[#1E3A8A] dark:text-blue-200">{status.amountLabel || currency(0, settings.currencySymbol)}</p>
                        </div>
                        <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{plural(summary?.billCount, "bill")} · {plural(summary?.paymentCount, "payment")} · Last activity {latest ? ownerDateDisplay(latest) : "NA"}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                          <Button type="button" variant="ghost" className="px-2" onClick={() => openOwner(party)}>View Account</Button>
                          <Button type="button" variant="secondary" className="px-2" onClick={() => { openOwner(party); startPayment(undefined, party); }}>Record Payment</Button>
                        </div>
                      </article>
                    );
                  })}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="space-y-4 lg:space-y-5">
          <Card className="lg:hidden">
            <CardContent className="space-y-3 p-3.5">
              <div className="min-w-0">
                <div>
                  <p className={cn("text-xs font-black uppercase tracking-wide", selectedStatus.tone === "danger" ? "text-red-600 dark:text-red-300" : selectedStatus.tone === "success" ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400")}>{selectedStatus.label}</p>
                  <p className="mt-0.5 text-2xl font-black text-[#1E3A8A] dark:text-blue-200">{selectedStatus.amountLabel || currency(0, settings.currencySymbol)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
                <div><p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total billed</p><p className="font-black text-slate-900 dark:text-slate-50">{currency(selectedSummary?.totalBilled ?? 0, settings.currencySymbol)}</p></div>
                <div><p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total received</p><p className="font-black text-slate-900 dark:text-slate-50">{currency(selectedSummary?.totalReceived ?? 0, settings.currencySymbol)}</p></div>
              </div>
              <button type="button" className="flex min-h-10 w-full items-center justify-between rounded-xl px-1 text-left text-sm font-black text-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-blue-200" aria-expanded={summaryExpanded} onClick={() => setSummaryExpanded((current) => !current)}>
                View full summary <span className={cn("transition-transform", summaryExpanded && "rotate-180")}><Icon name="chevronDown" /></span>
              </button>
              {summaryExpanded && (
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-900">
                  <div><dt className="text-slate-500 dark:text-slate-400">Outstanding</dt><dd className="mt-0.5 font-black text-slate-900 dark:text-slate-50">{currency(selectedSummary?.outstandingAmount ?? 0, settings.currencySymbol)}</dd></div>
                  <div><dt className="text-slate-500 dark:text-slate-400">Advance available</dt><dd className="mt-0.5 font-black text-slate-900 dark:text-slate-50">{currency(selectedSummary?.advanceCredit ?? 0, settings.currencySymbol)}</dd></div>
                  <div><dt className="text-slate-500 dark:text-slate-400">Bills</dt><dd className="mt-0.5 font-black text-slate-900 dark:text-slate-50">{plural(selectedSummary?.billCount, "bill")}</dd></div>
                  <div><dt className="text-slate-500 dark:text-slate-400">Payments</dt><dd className="mt-0.5 font-black text-slate-900 dark:text-slate-50">{plural(selectedSummary?.paymentCount, "payment")}</dd></div>
                  <div><dt className="text-slate-500 dark:text-slate-400">Last bill</dt><dd className="mt-0.5 font-black text-slate-900 dark:text-slate-50">{selectedSummary?.latestBillDate ? ownerDateDisplay(selectedSummary.latestBillDate) : "NA"}</dd></div>
                  <div><dt className="text-slate-500 dark:text-slate-400">Last payment</dt><dd className="mt-0.5 font-black text-slate-900 dark:text-slate-50">{selectedSummary?.latestPaymentDate ? ownerDateDisplay(selectedSummary.latestPaymentDate) : "NA"}</dd></div>
                  <div className="col-span-2 min-w-0"><dt className="text-slate-500 dark:text-slate-400">Contact</dt><dd className="mt-0.5 break-words font-black text-slate-900 dark:text-slate-50">{[selectedParty.phone, selectedParty.email].filter(Boolean).join(" · ") || "No contact details"}</dd></div>
                </dl>
              )}
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem] gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <Button type="button" variant="primary" className="min-w-0 px-2 text-xs" onClick={() => startPayment()}>Record Payment</Button>
                <Button type="button" variant="secondary" className="min-w-0 px-2 text-xs" title={`Create a bill for ${partyDisplayName(selectedParty)}`} onClick={() => onCreateBillForOwner(selectedParty)}>Create Bill</Button>
                {renderOwnerActions(selectedParty, false, true)}
              </div>
            </CardContent>
          </Card>

          <Card className="hidden lg:block">
            <CardContent className="space-y-4">
              <button type="button" className="hidden min-h-10 cursor-pointer items-center gap-2 rounded-xl px-1 text-sm font-black text-[#1E3A8A] hover:text-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-blue-200 lg:inline-flex" onClick={backToOwners}>
                <Icon name="back" /> Back to Owners
              </button>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="hidden truncate text-2xl font-black text-slate-950 dark:text-slate-50 lg:block">{partyDisplayName(selectedParty)}</h2>
                    <StatusBadge summary={selectedSummary} symbol={settings.currencySymbol} />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">{[selectedParty.phone, selectedParty.email].filter(Boolean).join(" | ") || "No contact details added"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="primary" className="gap-2" onClick={() => startPayment()}><Icon name="wallet" /> Record Payment</Button>
                  <Button type="button" variant="secondary" className="gap-2" title={`Create a bill for ${partyDisplayName(selectedParty)}`} onClick={() => onCreateBillForOwner(selectedParty)}><Icon name="bill" /> Create Bill</Button>
                  {renderOwnerActions(selectedParty, false)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hidden lg:block">
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Total Billed" value={currency(selectedSummary?.totalBilled ?? 0, settings.currencySymbol)} />
                <MetricCard label="Total Received" value={currency(selectedSummary?.totalReceived ?? 0, settings.currencySymbol)} />
                <MetricCard label="Outstanding" value={currency(selectedSummary?.outstandingAmount ?? 0, settings.currencySymbol)} />
                <MetricCard label="Advance Available" value={currency(selectedSummary?.advanceCredit ?? 0, settings.currencySymbol)} />
              </div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {plural(selectedSummary?.billCount, "bill")} • {plural(selectedSummary?.paymentCount, "payment")} • Last bill {selectedSummary?.latestBillDate ? ownerDateDisplay(selectedSummary.latestBillDate) : "NA"} • Last payment {selectedSummary?.latestPaymentDate ? ownerDateDisplay(selectedSummary.latestPaymentDate) : "NA"}
              </p>
            </CardContent>
          </Card>

          <div role="tablist" aria-label="Owner account views" className="grid grid-cols-3 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-[#0f172a] lg:hidden">
            {(["transactions", "statements", "payments"] as const).map((tab) => {
              const selected = tab === "payments" ? openModule === "payments" : openModule === "statements" && statementsTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={cn("min-h-11 rounded-lg px-2 text-xs font-black capitalize focus:outline-none focus:ring-2 focus:ring-blue-500", selected ? "bg-white text-[#1E3A8A] shadow-sm dark:bg-[#111827] dark:text-blue-200" : "text-slate-500 dark:text-slate-400")}
                  onClick={() => {
                    if (tab === "payments") setOpenModule("payments");
                    else {
                      setOpenModule("statements");
                      setStatementsTab(tab);
                    }
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <OwnerAccordion mobileTabMode module="statements" title="Statements & Transactions" description="Review transactions and generate account statements" icon="statement" openModule={openModule} onToggle={toggleModule}>
            <div className="space-y-5">
              <div role="tablist" aria-label="Statements and transactions views" className="hidden rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-[#0f172a] lg:inline-flex" onKeyDown={handleStatementsTabKeyDown}>
                {(["transactions", "statements"] as StatementsTab[]).map((tab) => (
                  <button
                    key={tab}
                    id={`owner-${tab}-tab`}
                    type="button"
                    role="tab"
                    aria-selected={statementsTab === tab}
                    aria-controls={`owner-${tab}-panel`}
                    tabIndex={statementsTab === tab ? 0 : -1}
                    className={cn(
                      "min-h-9 cursor-pointer rounded-lg px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500",
                      statementsTab === tab
                        ? "bg-white text-[#1E3A8A] shadow-sm dark:bg-[#111827] dark:text-blue-200"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                    )}
                    onClick={() => setStatementsTab(tab)}
                  >
                    {tab === "transactions" ? "Transactions" : "Statements"}
                  </button>
                ))}
              </div>

              {statementsTab === "transactions" && (
                <div id="owner-transactions-panel" role="tabpanel" aria-labelledby="owner-transactions-tab" className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{plural(selectedLedger.length, "transaction")}</p>
                    <div className="w-full sm:w-48">
                      <CustomSelect label="Sort transactions" value={transactionSort} options={transactionSortOptions} onChange={changeTransactionSort} />
                    </div>
                  </div>
                  {selectedLedger.length === 0 ? (
                    <EmptyState title="No transactions yet" description="Bills and owner payments will appear here." />
                  ) : (
                    <>
                      <div className="hidden overflow-x-auto lg:block">
                        <table className="w-full min-w-[760px] table-fixed border-separate border-spacing-y-2 text-left text-sm">
                          <colgroup>
                            <col className="w-1/6" />
                            <col className="w-1/6" />
                            <col className="w-1/6" />
                            <col className="w-1/6" />
                            <col className="w-1/6" />
                            <col className="w-1/6" />
                          </colgroup>
                          <thead>
                            <tr>
                              <th className={ownerTableHeaderClass}>Date</th>
                              <th className={ownerTableHeaderClass}>Type</th>
                              <th className={ownerTableHeaderClass}>Customer</th>
                              <th className={ownerTableHeaderClass}>Bill Amount</th>
                              <th className={ownerTableHeaderClass}>Payment</th>
                              <th className={ownerTableHeaderClass}>Running Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedLedger.map((entry) => (
                              <tr key={`${entry.entryType}-${entry.referenceId}`}>
                                <td className={cn(ownerTableCellClass, "rounded-l-2xl border-l font-semibold")}>{ownerDateDisplay(entry.entryDate)}</td>
                                <td className={cn(ownerTableCellClass, "font-bold")}>{labelize(entry.entryType)}</td>
                                <td className={cn(ownerTableCellClass, "truncate text-slate-600 dark:text-slate-300")} title={entryCustomer(entry)}>{entryCustomer(entry)}</td>
                                <td className={cn(ownerTableCellClass, entry.debitAmount > 0 && ownerAmountClass)}>{entry.debitAmount > 0 ? currency(entry.debitAmount, settings.currencySymbol) : "—"}</td>
                                <td className={cn(ownerTableCellClass, entry.creditAmount > 0 && ownerAmountClass)}>{entry.creditAmount > 0 ? currency(entry.creditAmount, settings.currencySymbol) : "—"}</td>
                                <td className={cn(ownerTableCellClass, ownerAmountClass, "rounded-r-2xl border-r")}>{runningBalanceDisplay(entry.runningBalance, settings.currencySymbol)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="grid gap-3 lg:hidden">
                        {sortedLedger.map((entry) => {
                          const isBill = entry.entryType === "bill";
                          const amount = isBill ? entry.debitAmount : entry.creditAmount;
                          return (
                          <article key={`${entry.entryType}-${entry.referenceId}`} className="min-w-0 max-w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-[#111827]">
                            <div className="flex min-w-0 items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-black text-slate-950 dark:text-slate-50">{isBill ? entryCustomer(entry) : "Payment received"}</p>
                                <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{labelize(entry.entryType)} · {ownerDateDisplay(entry.entryDate)}</p>
                              </div>
                              <span className={cn("shrink-0 text-sm", ownerAmountClass)}>{currency(amount, settings.currencySymbol)}</span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2.5 text-xs dark:border-slate-800">
                              <div><p className="font-semibold text-slate-500 dark:text-slate-400">{isBill ? "Bill amount" : "Payment amount"}</p><p className={cn("mt-0.5 text-sm", ownerAmountClass)}>{currency(amount, settings.currencySymbol)}</p></div>
                              <div><p className="font-semibold text-slate-500 dark:text-slate-400">Balance after</p><p className={cn("mt-0.5 text-sm", ownerAmountClass)}>{runningBalanceDisplay(entry.runningBalance, settings.currencySymbol)}</p></div>
                            </div>
                          </article>
                        );})}
                      </div>
                    </>
                  )}
                </div>
              )}

              {statementsTab === "statements" && (
                <div id="owner-statements-panel" role="tabpanel" aria-labelledby="owner-statements-tab" className="space-y-4">
                  <DateRangeControls fromDate={statementFromDate} toDate={statementToDate} activeDatePicker={activeDatePicker} onActiveDatePickerChange={setActiveDatePicker} onRangeChange={handleRangeChange} onGenerate={() => void generateStatement()} loading={statementLoading} />
                  {!statement && (
                    <div className="px-1 py-2 text-left lg:rounded-xl lg:border lg:border-slate-200 lg:bg-white lg:px-4 lg:py-5 lg:text-center lg:dark:border-slate-700 lg:dark:bg-[#111827]">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">No statement generated</h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Select a period and generate a statement to preview or share it.</p>
                    </div>
                  )}
                  {statement && (
                    <div className="min-w-0 max-w-full lg:rounded-xl lg:border lg:border-slate-200 lg:bg-white lg:p-4 lg:dark:border-slate-700 lg:dark:bg-[#111827]">
                  <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-slate-700 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-black text-slate-950 dark:text-slate-50">Statement: {ownerDateDisplay(statement.fromDate)} - {ownerDateDisplay(statement.toDate)}</h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{partyDisplayName(selectedParty)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" className="gap-2" onClick={copyStatement}><Icon name="copy" /> Copy</Button>
                      <ActionMenu menuId="statement-actions" activeMenu={activeMenu} onActiveMenuChange={setActiveMenu} triggerLabel="Statement actions" trigger={<><Icon name="more" /><span>Actions</span></>}>
                        {(close) => (
                          <>
                            <button type="button" role="menuitem" className={menuItemClass} onClick={() => { close(); shareStatement(); }}><Icon name="share" /> Share on WhatsApp</button>
                            <button type="button" role="menuitem" className={menuItemClass} onClick={() => { close(); exportStatementPdf(); }}><Icon name="download" /> Export PDF</button>
                          </>
                        )}
                      </ActionMenu>
                    </div>
                  </div>
                  <div className="mt-4 hidden gap-3 sm:grid-cols-2 lg:grid xl:grid-cols-4">
                    <MetricCard label={statement.summary.openingBalance < 0 ? "Opening Advance" : "Opening Balance"} value={runningBalanceDisplay(statement.summary.openingBalance, settings.currencySymbol)} />
                    <MetricCard label="Bills During Period" value={currency(statement.summary.totalBilled, settings.currencySymbol)} />
                    <MetricCard label="Payments Received" value={currency(statement.summary.totalReceived, settings.currencySymbol)} />
                    <MetricCard label={statement.summary.closingBalance < 0 ? "Advance Available" : "Closing Balance"} value={runningBalanceDisplay(statement.summary.closingBalance, settings.currencySymbol)} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 border-y border-slate-100 py-3 text-xs dark:border-slate-800 lg:hidden">
                    <div className="min-w-0"><dt className="text-slate-500 dark:text-slate-400">{statement.summary.openingBalance < 0 ? "Opening advance" : "Opening balance"}</dt><dd className="mt-0.5 break-words font-black text-slate-900 dark:text-slate-50">{runningBalanceDisplay(statement.summary.openingBalance, settings.currencySymbol)}</dd></div>
                    <div className="min-w-0"><dt className="text-slate-500 dark:text-slate-400">Bills during period</dt><dd className="mt-0.5 break-words font-black text-slate-900 dark:text-slate-50">{currency(statement.summary.totalBilled, settings.currencySymbol)}</dd></div>
                    <div className="min-w-0"><dt className="text-slate-500 dark:text-slate-400">Payments received</dt><dd className="mt-0.5 break-words font-black text-slate-900 dark:text-slate-50">{currency(statement.summary.totalReceived, settings.currencySymbol)}</dd></div>
                    <div className="min-w-0"><dt className="text-slate-500 dark:text-slate-400">{statement.summary.closingBalance < 0 ? "Advance available" : "Closing balance"}</dt><dd className="mt-0.5 break-words font-black text-slate-900 dark:text-slate-50">{runningBalanceDisplay(statement.summary.closingBalance, settings.currencySymbol)}</dd></div>
                  </dl>
                  {statement.entries.length > 0 && (
                    <>
                    <div className="mt-4 hidden max-h-[26rem] overflow-auto pb-2 lg:block">
                      <table className="w-full min-w-[760px] table-fixed text-left text-sm">
                        <colgroup>
                          <col className="w-1/6" />
                          <col className="w-1/6" />
                          <col className="w-1/6" />
                          <col className="w-1/6" />
                          <col className="w-1/6" />
                          <col className="w-1/6" />
                        </colgroup>
                        <thead className="sticky top-0 bg-white text-xs uppercase text-slate-500 dark:bg-[#111827] dark:text-slate-400">
                          <tr>
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2">Type</th>
                            <th className="px-3 py-2">Customer</th>
                            <th className="px-3 py-2">Debit</th>
                            <th className="px-3 py-2">Credit</th>
                            <th className="px-3 py-2">Running Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {statement.entries.map((entry, index) => (
                            <tr key={`${entry.entryType}-${entry.entryDate}-${index}`}>
                              <td className="px-3 py-3">{ownerDateDisplay(entry.entryDate)}</td>
                              <td className="px-3 py-3 font-semibold">{labelize(entry.entryType)}</td>
                              <td className="truncate px-3 py-3" title={entryCustomer(entry)}>{entryCustomer(entry)}</td>
                              <td className={cn("px-3 py-3", entry.debitAmount > 0 && ownerAmountClass)}>{entry.debitAmount > 0 ? currency(entry.debitAmount, settings.currencySymbol) : "—"}</td>
                              <td className={cn("px-3 py-3", entry.creditAmount > 0 && ownerAmountClass)}>{entry.creditAmount > 0 ? currency(entry.creditAmount, settings.currencySymbol) : "—"}</td>
                              <td className={cn(ownerAmountClass, "px-3 py-3")}>{runningBalanceDisplay(entry.runningBalance, settings.currencySymbol)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 grid min-w-0 gap-2 lg:hidden" role="list" aria-label="Statement transactions">
                      {statement.entries.map((entry, index) => {
                        const isBill = entry.entryType === "bill";
                        const amount = isBill ? entry.debitAmount : entry.creditAmount;
                        return (
                        <article key={`${entry.entryType}-${entry.entryDate}-${index}`} role="listitem" className="min-w-0 max-w-full rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                          <div className="flex min-w-0 items-start justify-between gap-3">
                            <div className="min-w-0"><p className="truncate font-black text-slate-950 dark:text-slate-50">{isBill ? entryCustomer(entry) : "Payment received"}</p><p className="mt-0.5 break-words text-xs font-semibold text-slate-500 dark:text-slate-400">{labelize(entry.entryType)} · {ownerDateDisplay(entry.entryDate)}</p></div>
                            <p className={cn("shrink-0 whitespace-nowrap", ownerAmountClass)}>{currency(amount, settings.currencySymbol)}</p>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2.5 text-xs dark:border-slate-800">
                            <div><p className="font-semibold text-slate-500 dark:text-slate-400">{isBill ? "Bill amount" : "Payment amount"}</p><p className={cn("mt-0.5 text-sm", ownerAmountClass)}>{currency(amount, settings.currencySymbol)}</p></div>
                            <div><p className="font-semibold text-slate-500 dark:text-slate-400">Balance after</p><p className={cn("mt-0.5 text-sm", ownerAmountClass)}>{runningBalanceDisplay(entry.runningBalance, settings.currencySymbol)}</p></div>
                          </div>
                        </article>
                      );})}
                    </div>
                    </>
                  )}
                </div>
              )}
                </div>
              )}
            </div>
          </OwnerAccordion>

          <OwnerAccordion mobileTabMode module="payments" title="Payments" description={`${selectedPayments.length} payment${selectedPayments.length === 1 ? "" : "s"} • ${currency(selectedPaymentsTotal, settings.currencySymbol)} received`} icon="wallet" openModule={openModule} onToggle={toggleModule}>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-black text-slate-950 dark:text-slate-50">Payments</h3>
                <Button type="button" variant="primary" className="hidden gap-2 lg:inline-flex" onClick={() => startPayment()}><Icon name="wallet" /> Record Payment</Button>
              </div>
              {selectedPayments.length === 0 ? (
                <EmptyState title="No payments recorded" description="Record the first payment received from this Owner / Company." />
              ) : (
                <>
                  <div className="hidden lg:block">
                    <table className="w-full table-fixed border-separate border-spacing-y-2 text-left text-sm">
                      <colgroup>
                        <col className="w-1/6" />
                        <col className="w-1/6" />
                        <col className="w-1/6" />
                        <col className="w-1/6" />
                        <col className="w-1/6" />
                        <col className="w-1/6" />
                      </colgroup>
                      <thead>
                        <tr>
                          <th className={ownerTableHeaderClass}>Date</th>
                          <th className={ownerTableHeaderClass}>Type</th>
                          <th className={ownerTableHeaderClass}>Method</th>
                          <th className={ownerTableHeaderClass}>Reference</th>
                          <th className={ownerTableHeaderClass}>Amount</th>
                          <th className={ownerTableHeaderClass}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPayments.map((payment) => (
                          <tr key={payment.id}>
                            <td className={cn(ownerTableCellClass, "rounded-l-2xl border-l font-semibold")}>{ownerDateDisplay(payment.paymentDate)}</td>
                            <td className={cn(ownerTableCellClass, "font-bold")}>{labelize(payment.paymentType)}</td>
                            <td className={ownerTableCellClass}>{payment.paymentMethod ? labelize(payment.paymentMethod) : "NA"}</td>
                            <td className={cn(ownerTableCellClass, "truncate")}>{payment.reference || "NA"}</td>
                            <td className={cn(ownerTableCellClass, ownerAmountClass)}>{currency(payment.amount, settings.currencySymbol)}</td>
                            <td className={cn(ownerTableCellClass, "rounded-r-2xl border-r")}>
                              <ActionMenu menuId={`payment-${payment.id}`} activeMenu={activeMenu} onActiveMenuChange={setActiveMenu} triggerLabel={`Payment actions for ${ownerDateDisplay(payment.paymentDate)}`} trigger={<Icon name="more" />}>
                                {(close) => (
                                  <>
                                    <button type="button" role="menuitem" className={menuItemClass} onClick={() => { close(); startPayment(payment); }}><Icon name="edit" /> Edit Payment</button>
                                    <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                                    <button type="button" role="menuitem" className={destructiveMenuItemClass} disabled={paymentDeletingIds.includes(payment.id)} onClick={() => { close(); setDeletePayment(payment); }}><Icon name="trash" /> Delete Payment</button>
                                  </>
                                )}
                              </ActionMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="grid gap-3 lg:hidden">
                    {selectedPayments.map((payment) => (
                      <article key={payment.id} className="min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#111827]">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div>
                            <p className="font-black text-slate-950 dark:text-slate-50"><span className={ownerAmountClass}>{currency(payment.amount, settings.currencySymbol)}</span> · {labelize(payment.paymentType)}</p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{ownerDateDisplay(payment.paymentDate)}{payment.paymentMethod ? ` · ${labelize(payment.paymentMethod)}` : ""}</p>
                          </div>
                          <ActionMenu menuId={`payment-mobile-${payment.id}`} activeMenu={activeMenu} onActiveMenuChange={setActiveMenu} triggerLabel={`Payment actions for ${ownerDateDisplay(payment.paymentDate)}`} trigger={<Icon name="more" />}>
                            {(close) => (
                              <>
                                <button type="button" role="menuitem" className={menuItemClass} onClick={() => { close(); startPayment(payment); }}><Icon name="edit" /> Edit Payment</button>
                                <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                                <button type="button" role="menuitem" className={destructiveMenuItemClass} disabled={paymentDeletingIds.includes(payment.id)} onClick={() => { close(); setDeletePayment(payment); }}><Icon name="trash" /> Delete Payment</button>
                              </>
                            )}
                          </ActionMenu>
                        </div>
                        {(payment.reference || payment.notes) && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{payment.reference || payment.notes}</p>}
                      </article>
                    ))}
                  </div>
                </>
              )}
            </div>
          </OwnerAccordion>
        </div>
      )}

      {partyFormOpen && (
        <Modal title={editingPartyId ? "Edit Owner" : "Add Owner"} description="Owner / Company details are private to this driver account." onClose={() => setPartyFormOpen(false)}>
          <div className="space-y-4">
            <div className="form-grid">
              <label className="field-label">Display Name<Input value={partyDraft.name} onChange={(event) => setPartyDraft({ ...partyDraft, name: event.target.value })} placeholder="Owner or company display name" /></label>
              <label className="field-label">Company Name<Input value={partyDraft.companyName} onChange={(event) => setPartyDraft({ ...partyDraft, companyName: event.target.value })} placeholder="Optional registered/company name" /></label>
              <label className="field-label">Phone<Input value={partyDraft.phone} onChange={(event) => setPartyDraft({ ...partyDraft, phone: event.target.value })} /></label>
              <label className="field-label">Email<Input value={partyDraft.email} onChange={(event) => setPartyDraft({ ...partyDraft, email: event.target.value })} /></label>
            </div>
            <label className="field-label">Address<Textarea value={partyDraft.address} onChange={(event) => setPartyDraft({ ...partyDraft, address: event.target.value })} /></label>
            <label className="field-label">Notes<Textarea value={partyDraft.notes} onChange={(event) => setPartyDraft({ ...partyDraft, notes: event.target.value })} /></label>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setPartyFormOpen(false)}>Cancel</Button>
              <Button type="button" variant="primary" disabled={partySaving} onClick={() => void saveParty()}>{partySaving ? "Saving..." : editingPartyId ? "Save Owner" : "Add Owner"}</Button>
            </div>
          </div>
        </Modal>
      )}

      {paymentDraft && (
        <Modal title={editingPaymentId ? "Edit Payment" : "Record Payment"} description={selectedParty ? partyDisplayName(selectedParty) : undefined} onClose={() => {
          setPaymentDraft(null);
          setEditingPaymentId(null);
        }}>
          <div className="space-y-4">
            <div className="form-grid">
              <label className="field-label">Payment Date<Input type="date" value={paymentDraft.paymentDate} onChange={(event) => setPaymentDraft({ ...paymentDraft, paymentDate: event.target.value })} /></label>
              <label className="field-label">Amount<DecimalInput value={paymentDraft.amount} onValueChange={(amount) => setPaymentDraft({ ...paymentDraft, amount })} /></label>
              <label className="field-label">Payment Type
                <Select value={paymentDraft.paymentType} onChange={(event) => setPaymentDraft({ ...paymentDraft, paymentType: event.target.value as OwnerPaymentType })}>
                  <option value="payment_received">Payment Received</option>
                  <option value="advance_received">Advance Received</option>
                </Select>
              </label>
              <label className="field-label">Payment Method
                <Select value={paymentDraft.paymentMethod} onChange={(event) => setPaymentDraft({ ...paymentDraft, paymentMethod: event.target.value as OwnerPaymentMethod })}>
                  <option value="">Not specified</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </Select>
              </label>
              <label className="field-label">Reference<Input value={paymentDraft.reference} onChange={(event) => setPaymentDraft({ ...paymentDraft, reference: event.target.value })} /></label>
            </div>
            <label className="field-label">Notes<Textarea value={paymentDraft.notes} onChange={(event) => setPaymentDraft({ ...paymentDraft, notes: event.target.value })} /></label>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => {
                setPaymentDraft(null);
                setEditingPaymentId(null);
              }}>Cancel</Button>
              <Button type="button" variant="primary" disabled={paymentSaving} onClick={() => void savePayment()}>{paymentSaving ? "Saving..." : editingPaymentId ? "Save Payment" : "Record Payment"}</Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmationDialog
        open={Boolean(deleteParty)}
        title="Delete this owner?"
        message={deleteParty && relatedCount(deleteParty) > 0
          ? "This owner cannot be deleted while linked bills or payments exist."
          : "This action cannot be undone."}
        confirmLabel="Delete Owner"
        confirmVariant="danger"
        onCancel={() => setDeleteParty(null)}
        onConfirm={confirmDeleteParty}
      />

      <ConfirmationDialog
        open={Boolean(deletePayment)}
        title="Delete Payment?"
        message="Delete this payment record? The owner ledger will be recalculated from remaining records."
        confirmLabel="Delete Payment"
        confirmVariant="danger"
        onCancel={() => setDeletePayment(null)}
        onConfirm={confirmDeletePayment}
      />
    </div>
  );
}
