import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type RefObject } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import type { Bill, BillSummaryTotals } from "../../types/bill";
import type { BillingParty } from "../../types/billingParty";
import type { AppSettings } from "../../types/settings";
import { calculateCombinedSummary } from "../../utils/calculations";
import { currency, guestDisplay } from "../../utils/formatters";
import { buildCombinedSummaryText, buildCombinedSummaryWhatsAppText, buildIndividualSummaryText, buildIndividualSummaryWhatsAppText, buildSingleBillText, buildSingleBillWhatsAppText, createWhatsAppUrl } from "../../utils/whatsapp";
import { ConfirmationDialog } from "../shared/ConfirmationDialog";
import { EmptyState } from "../shared/EmptyState";
import { Button } from "../ui/Button";
import { Card, CardContent } from "../ui/Card";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { cn } from "../ui/cn";
import { useDialogFocus } from "../ui/useDialogFocus";
import { useOverlayPlacement } from "../ui/useOverlayPlacement";
import { MobileBottomSheet, useIsMobile } from "../mobile/MobilePrimitives";

type Props = {
  bills: Bill[];
  billingParties: BillingParty[];
  settings: AppSettings;
  userId: string;
  selectedIds: string[];
  onToggleSelected: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onClearSelection: () => void;
  onEdit: (bill: Bill) => void;
  onDuplicate: (bill: Bill) => void;
  onDelete: (id: string) => Promise<void>;
  onDeleteSelected: (ids: string[]) => Promise<void>;
  onCopy: (text: string) => void;
  onCreateBill?: () => void;
};

type AppliedFilters = {
  billingPartyId: string;
};

type DateRange = {
  fromDate: string;
  toDate: string;
  label: string;
};

type SortOption = "newest" | "oldest" | "highest" | "lowest" | "customer" | "owner";
type SummaryMode = "combined" | "individual" | "grouped";

const emptyFilters: AppliedFilters = {
  billingPartyId: ""
};

const rowsPerPageOptions = [20, 50, 100];
const HISTORY_SORT_KEY_PREFIX = "tripledger.history.sort";

const outlineActionClass = "inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-[#1E3A8A] bg-white px-4 py-2 text-sm font-semibold text-[#1E3A8A] hover:bg-[#1E3A8A] hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-blue-400 dark:bg-[#111827] dark:text-blue-200 dark:hover:bg-blue-600 dark:hover:text-white dark:focus:ring-offset-slate-950";
const iconButtonClass = "grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-[#1E3A8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-[#111827] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-200 dark:focus-visible:ring-offset-slate-950";
const toolbarControlClass = "min-h-11 gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-none hover:border-[#1E3A8A] hover:bg-[#1E3A8A] hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 data-[active=true]:border-[#1E3A8A] data-[active=true]:bg-[#1E3A8A] data-[active=true]:text-white dark:border-slate-700 dark:bg-[#111827] dark:text-slate-200 dark:hover:border-blue-600 dark:hover:bg-blue-700 dark:hover:text-white dark:data-[active=true]:border-blue-600 dark:data-[active=true]:bg-blue-700 dark:data-[active=true]:text-white dark:focus:ring-offset-slate-950";
const menuItemClass = "flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200 dark:hover:bg-slate-800";

function Icon({ name }: { name: "search" | "x" | "filter" | "sort" | "calendar" | "eye" | "more" | "copy" | "edit" | "trash" | "share" | "download" | "duplicate" | "document" | "chevronLeft" | "chevronRight" | "chevronDown" | "check" }) {
  const common = { className: "h-4 w-4", viewBox: "0 0 24 24", fill: "none", "aria-hidden": true };
  if (name === "search") return <svg {...common}><path d="m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "x") return <svg {...common}><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "filter") return <svg {...common}><path d="M4 7h16M7 12h10M10 17h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "sort") return <svg {...common}><path d="M7 4v14m0 0 3-3m-3 3-3-3M17 20V6m0 0-3 3m3-3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "calendar") return <svg {...common}><path d="M7 3v3M17 3v3M4 8h16M5 5h14v15H5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "eye") return <svg {...common}><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="2" /></svg>;
  if (name === "more") return <svg {...common}><path d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "copy") return <svg {...common}><path d="M8 8h10v12H8zM6 16H4V4h12v2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
  if (name === "edit") return <svg {...common}><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
  if (name === "trash") return <svg {...common}><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "share") return <svg {...common}><path d="M12 16V4m0 0L7 9m5-5 5 5M5 14v5h14v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "download") return <svg {...common}><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "duplicate") return <svg {...common}><path d="M8 8h10v10H8zM6 16H4V4h10v2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
  if (name === "document") return <svg {...common}><path d="M7 3h7l4 4v14H7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M14 3v5h5M9 13h6M9 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "chevronLeft") return <svg {...common}><path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "chevronDown") return <svg {...common}><path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "check") return <svg {...common}><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg {...common}><path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ownerName(bill: Bill): string {
  return bill.billingPartyCompanyName || bill.billingPartyName || "Unassigned";
}

function exportSingleBillPdf(bill: Bill, settings: AppSettings) {
  void import("../../utils/pdf").then((module) => module.exportSingleBillPdf(bill, settings));
}

function exportIndividualSummaryPdf(bills: Bill[], settings: AppSettings) {
  void import("../../utils/pdf").then((module) => module.exportIndividualSummaryPdf(bills, settings));
}

function exportCombinedSummaryPdf(summary: BillSummaryTotals, settings: AppSettings) {
  void import("../../utils/pdf").then((module) => module.exportCombinedSummaryPdf(summary, settings));
}

function ownerGroupKey(bill: Bill): string {
  return bill.billingPartyId || "unassigned";
}

function searchableAmount(value: number): string {
  return String(Math.round(value));
}

function formatHistoryDate(value: string): string {
  if (!value) return "NA";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "NA";
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateRange(bills: Bill[]): string {
  const dates = bills.map((bill) => bill.tripDate).filter(Boolean).sort();
  if (dates.length === 0) return "NA";
  return dates[0] === dates[dates.length - 1] ? formatHistoryDate(dates[0]) : `${formatHistoryDate(dates[0])} - ${formatHistoryDate(dates[dates.length - 1])}`;
}

function activeFilterCount(filters: AppliedFilters): number {
  return filters.billingPartyId ? 1 : 0;
}

function inputDate(date: Date): string {
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function quickDateRange(preset: "today" | "week" | "month" | "last-month"): DateRange {
  const now = new Date();
  if (preset === "today") {
    const today = inputDate(now);
    return { fromDate: today, toDate: today, label: "Today" };
  }

  if (preset === "week") {
    const day = now.getDay() || 7;
    const first = new Date(now);
    first.setDate(now.getDate() - day + 1);
    const last = new Date(first);
    last.setDate(first.getDate() + 6);
    return { fromDate: inputDate(first), toDate: inputDate(last), label: "This Week" };
  }

  const monthOffset = preset === "last-month" ? -1 : 0;
  const first = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const last = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0);
  return {
    fromDate: inputDate(first),
    toDate: inputDate(last),
    label: preset === "last-month" ? "Last Month" : "This Month"
  };
}

function parseInputDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function CustomDatePicker({ label, value, min, max, open, align, onOpenChange, onChange }: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  open: boolean;
  align: "start" | "end";
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
        className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-semibold text-slate-700 hover:border-[#1E3A8A] hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-[#0f172a] dark:text-slate-200 dark:hover:border-blue-600 dark:hover:bg-slate-800 dark:focus:ring-offset-slate-950"
        aria-label={`Choose ${label}. Current value ${formatHistoryDate(value)}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        <span className="text-slate-400"><Icon name="calendar" /></span>
        <span className="min-w-0 flex-1 truncate">{formatHistoryDate(value)}</span>
        <span className={cn("text-slate-400 transition-transform", open && "rotate-180")}><Icon name="chevronDown" /></span>
      </button>
      {open && (
        <div
          ref={overlayRef}
          role="dialog"
          aria-label={`${label} calendar`}
          style={style}
          className={cn(
            "z-50 w-[min(19rem,calc(100vw-3rem))] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/15 dark:border-slate-700 dark:bg-[#0f172a] dark:shadow-black/40",
            align === "start" && "sm:origin-top-left"
          )}
        >
          <DayPicker
            mode="single"
            selected={selectedDate}
            defaultMonth={selectedDate ?? new Date()}
            fixedWeeks
            showOutsideDays
            navLayout="around"
            className="tripledger-calendar"
            disabled={[
              ...(min ? [{ before: parseInputDate(min) }] : []),
              ...(max ? [{ after: parseInputDate(max) }] : [])
            ]}
            footer={<span className="sr-only" aria-live="polite">{value ? `${formatHistoryDate(value)} selected` : `Choose ${label}`}</span>}
            components={{
              Chevron: ({ orientation }) => <Icon name={orientation === "left" ? "chevronLeft" : "chevronRight"} />
            }}
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

function paginationPages(currentPage: number, pageCount: number): number[] {
  const totalVisible = Math.min(5, pageCount);
  const start = Math.max(1, Math.min(currentPage - 2, pageCount - totalVisible + 1));
  return Array.from({ length: totalVisible }, (_, index) => start + index);
}

function Modal({ title, description, headerActions, closeLabel, initialFocusRef, maxWidth = "max-w-3xl", onClose, children }: { title: string; description?: string; headerActions?: ReactNode; closeLabel?: string; initialFocusRef?: RefObject<HTMLElement | null>; maxWidth?: string; onClose: () => void; children: ReactNode }) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useDialogFocus(true, dialogRef, onClose, initialFocusRef);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-3 sm:p-4" onMouseDown={onClose}>
      <Card ref={dialogRef} className={cn("max-h-[92vh] w-full overflow-hidden focus:outline-none", maxWidth)} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="history-modal-title" tabIndex={-1}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-700 sm:p-5">
          <div className="min-w-0">
            <h2 id="history-modal-title" className="text-base font-black text-slate-950 dark:text-slate-50">{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerActions}
            <button type="button" className={iconButtonClass} aria-label={closeLabel || `Close ${title}`} title="Close" onClick={onClose}><Icon name="x" /></button>
          </div>
        </div>
        <div className="max-h-[calc(92vh-90px)] overflow-y-auto p-4 sm:p-5">{children}</div>
      </Card>
    </div>
  );
}

function ActionMenu({
  menuId,
  activeMenu,
  onActiveMenuChange,
  trigger,
  triggerClassName,
  triggerLabel,
  menuClassName,
  children
}: {
  menuId: string;
  activeMenu: string | null;
  onActiveMenuChange: (menuId: string | null) => void;
  trigger: ReactNode;
  triggerClassName: string;
  triggerLabel: string;
  menuClassName?: string;
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
        className={triggerClassName}
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
          className={cn("z-30 w-52 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-[#111827] dark:shadow-black/30", menuClassName)}
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

function ToolbarPopover({
  popoverId,
  activePopover,
  onActivePopoverChange,
  onOpen,
  trigger,
  triggerClassName,
  triggerLabel,
  isActive = false,
  wide = false,
  children
}: {
  popoverId: "date-range" | "filter";
  activePopover: "date-range" | "filter" | null;
  onActivePopoverChange: (popover: "date-range" | "filter" | null) => void;
  onOpen?: () => void;
  trigger: ReactNode;
  triggerClassName: string;
  triggerLabel: string;
  isActive?: boolean;
  wide?: boolean;
  children: (close: (restoreFocus?: boolean) => void) => ReactNode;
}) {
  const isOpen = activePopover === popoverId;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const { style } = useOverlayPlacement(isOpen, triggerRef, overlayRef, { estimatedHeight: wide ? 430 : 240 });
  const isMobile = useIsMobile();

  function close(restoreFocus = false) {
    onActivePopoverChange(null);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }

  useEffect(() => {
    if (!isOpen || isMobile) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close(true);
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isMobile, isOpen]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        data-active={isOpen || isActive}
        onClick={() => {
          if (isOpen) {
            close();
            return;
          }
          onOpen?.();
          onActivePopoverChange(popoverId);
        }}
      >
        {trigger}
      </button>
      {isOpen && !isMobile && (
        <div
          ref={overlayRef}
          role="dialog"
          aria-label={triggerLabel}
          style={style}
          className={cn(
            "z-40 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-[#111827] dark:shadow-black/30",
            wide
              ? "w-[min(30rem,calc(100vw-2rem))] overflow-visible"
              : "w-[min(22rem,calc(100vw-2rem))]"
          )}
        >
          {children(close)}
        </div>
      )}
      <MobileBottomSheet open={isOpen && isMobile} title={triggerLabel} onClose={() => close(true)}>
        {children(close)}
      </MobileBottomSheet>
    </div>
  );
}

type HistorySelectOption = { value: string; label: string };

function HistorySelect({ label, value, options, onChange, leadingIcon, className, iconOnly = false }: {
  label: string;
  value: string;
  options: HistorySelectOption[];
  onChange: (value: string) => void;
  leadingIcon?: ReactNode;
  className?: string;
  iconOnly?: boolean;
}) {
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
    <div className={cn("relative", className)} ref={rootRef} onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        className={cn("inline-flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:border-[#1E3A8A] hover:bg-blue-50 hover:text-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 data-[open=true]:border-[#1E3A8A] data-[open=true]:ring-2 data-[open=true]:ring-blue-100 dark:border-slate-700 dark:bg-[#111827] dark:text-slate-200 dark:hover:border-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-100 dark:data-[open=true]:border-blue-500 dark:data-[open=true]:ring-blue-950 dark:focus:ring-offset-slate-950", iconOnly && "w-11 justify-center p-0")}
        aria-label={`${label}: ${selectedOption?.label}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={isOpen ? `${listboxId}-option-${highlightedIndex}` : undefined}
        data-open={isOpen}
        onClick={() => isOpen ? close() : open()}
      >
        {leadingIcon && <span className="shrink-0 text-slate-400">{leadingIcon}</span>}
        <span className={cn("min-w-0 flex-1 truncate text-left", iconOnly && "sr-only")}>{selectedOption?.label}</span>
        {!iconOnly && <span className={cn("shrink-0 text-slate-400 transition-transform", isOpen && "rotate-180")}><Icon name="chevronDown" /></span>}
      </button>
      {isOpen && !isMobile && (
        <div id={listboxId} role="listbox" aria-label={label} className="absolute right-0 z-50 mt-2 max-h-64 w-full max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-[#111827] dark:shadow-black/30">
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
                title={option.label}
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

const sortOptions: HistorySelectOption[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "highest", label: "Highest Amount" },
  { value: "lowest", label: "Lowest Amount" },
  { value: "customer", label: "Customer A-Z" },
  { value: "owner", label: "Owner / Company A-Z" }
];

const rowsPerPageSelectOptions: HistorySelectOption[] = rowsPerPageOptions.map((option) => ({ value: String(option), label: String(option) }));

function isSortOption(value: string | null): value is SortOption {
  return sortOptions.some((option) => option.value === value);
}

function historySortKey(userId: string): string {
  return `${HISTORY_SORT_KEY_PREFIX}.${userId}`;
}

export function HistoryPage({ bills, billingParties, settings, userId, selectedIds, onToggleSelected, onSelectAll, onClearSelection, onEdit, onDuplicate, onDelete, onDeleteSelected, onCopy, onCreateBill }: Props) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>(() => {
    const saved = window.localStorage.getItem(historySortKey(userId));
    return isSortOption(saved) ? saved : "newest";
  });
  const [activeToolbarPopover, setActiveToolbarPopover] = useState<"date-range" | "filter" | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [mobileDateFilterEnabled, setMobileDateFilterEnabled] = useState(false);
  const [customFromDate, setCustomFromDate] = useState(() => inputDate(new Date()));
  const [customToDate, setCustomToDate] = useState(() => inputDate(new Date()));
  const [activeDatePicker, setActiveDatePicker] = useState<"from" | "to" | null>(null);
  const [dateRangeError, setDateRangeError] = useState("");
  const [draftFilters, setDraftFilters] = useState<AppliedFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>(emptyFilters);
  const [previewBill, setPreviewBill] = useState<Bill | null>(null);
  const [summaryChoiceOpen, setSummaryChoiceOpen] = useState(false);
  const [multiOwnerChoiceOpen, setMultiOwnerChoiceOpen] = useState(false);
  const [summaryDraftMode, setSummaryDraftMode] = useState<"combined" | "individual">("combined");
  const summaryChoiceFocusRef = useRef<HTMLInputElement | null>(null);
  const [summaryMode, setSummaryMode] = useState<SummaryMode | null>(null);
  const [shareNumber, setShareNumber] = useState("");
  const [deleteBill, setDeleteBill] = useState<Bill | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [page, setPage] = useState(1);
  const isMobile = useIsMobile();

  const billingPartyNameById = useMemo(() => new Map(billingParties.map((party) => [party.id, party.companyName || party.name])), [billingParties]);
  const billingPartyOptions = useMemo<HistorySelectOption[]>(() => [
    { value: "", label: "All Owners / Companies" },
    ...billingParties.map((party) => ({ value: party.id, label: party.companyName || party.name }))
  ], [billingParties]);
  const quickDatePresets = [
    { id: "today" as const, label: "Today", range: quickDateRange("today") },
    { id: "week" as const, label: "This Week", range: quickDateRange("week") },
    { id: "month" as const, label: "This Month", range: quickDateRange("month") },
    { id: "last-month" as const, label: "Last Month", range: quickDateRange("last-month") }
  ];

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return bills
      .filter((bill) => {
        if (!query) return true;
        return [
          ownerName(bill),
          guestDisplay(bill),
          bill.guestName,
          bill.driverName,
          bill.vehicleName,
          bill.vehicleNumber,
          bill.reportingPlace,
          bill.tripDate,
          searchableAmount(bill.totalAmount)
        ].some((value) => value.toLowerCase().includes(query));
      })
      .filter((bill) => !appliedFilters.billingPartyId || bill.billingPartyId === appliedFilters.billingPartyId)
      .filter((bill) => !dateRange?.fromDate || bill.tripDate >= dateRange.fromDate)
      .filter((bill) => !dateRange?.toDate || bill.tripDate <= dateRange.toDate)
      .sort((a, b) => {
        if (sort === "oldest") return a.tripDate.localeCompare(b.tripDate);
        if (sort === "highest") return b.totalAmount - a.totalAmount;
        if (sort === "lowest") return a.totalAmount - b.totalAmount;
        if (sort === "customer") return guestDisplay(a).localeCompare(guestDisplay(b));
        if (sort === "owner") return ownerName(a).localeCompare(ownerName(b));
        return b.tripDate.localeCompare(a.tripDate) || b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [appliedFilters, bills, dateRange, search, sort]);

  const selectedBills = useMemo(() => bills.filter((bill) => selectedIds.includes(bill.id)), [bills, selectedIds]);
  const summaryTotals = useMemo(() => calculateCombinedSummary(selectedBills), [selectedBills]);
  const activeFilters = activeFilterCount(appliedFilters);
  const hasSearchOrFilters = Boolean(search.trim()) || activeFilters > 0 || Boolean(dateRange);
  const filteredTotal = useMemo(() => filtered.reduce((sum, bill) => sum + bill.totalAmount, 0), [filtered]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const currentPage = Math.min(page, pageCount);
  const pageStart = filtered.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const pageEnd = Math.min(filtered.length, currentPage * rowsPerPage);
  const pagedBills = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const visiblePages = paginationPages(currentPage, pageCount);
  const showPaginationControls = pageCount > 1;
  const showRowsPerPage = filtered.length > rowsPerPageOptions[0];
  const allFilteredSelected = filtered.length > 0 && filtered.every((bill) => selectedIds.includes(bill.id));
  const selectedOwnerGroups = useMemo(() => new Map(selectedBills.map((bill) => [ownerGroupKey(bill), ownerName(bill)])), [selectedBills]);
  const groupedSummaryText = useMemo(() => {
    const groups = new Map<string, Bill[]>();
    selectedBills.forEach((bill) => {
      const key = ownerGroupKey(bill);
      groups.set(key, [...(groups.get(key) ?? []), bill]);
    });
    return Array.from(groups.entries()).map(([, groupBills]) => {
      const totals = calculateCombinedSummary(groupBills);
      return `${ownerName(groupBills[0])}\n${buildCombinedSummaryText(totals, settings)}`;
    }).join("\n\n------------------------------\n\n");
  }, [selectedBills, settings]);

  const allIndividualText = useMemo(() => buildIndividualSummaryText(selectedBills, settings), [selectedBills, settings]);
  const combinedSummaryText = buildCombinedSummaryText(summaryTotals, settings);
  const combinedSummaryWhatsAppText = buildCombinedSummaryWhatsAppText(summaryTotals, settings);
  const individualSummaryWhatsAppText = buildIndividualSummaryWhatsAppText(selectedBills, settings);
  const summaryDisplayText = summaryMode === "individual" ? allIndividualText : summaryMode === "grouped" ? groupedSummaryText : combinedSummaryText;
  const summaryShareText = summaryMode === "individual" ? individualSummaryWhatsAppText : summaryMode === "grouped" ? groupedSummaryText : combinedSummaryWhatsAppText;

  useEffect(() => {
    setPage(1);
  }, [appliedFilters, dateRange, rowsPerPage, search, sort]);

  useEffect(() => {
    const saved = window.localStorage.getItem(historySortKey(userId));
    setSort(isSortOption(saved) ? saved : "newest");
  }, [userId]);

  function changeSort(value: SortOption) {
    setSort(value);
    window.localStorage.setItem(historySortKey(userId), value);
  }

  useEffect(() => {
    if (!selectionMode && selectedIds.length === 0) return;
    setSelectionMode(false);
    onClearSelection();
  }, [appliedFilters, dateRange, search]);

  useEffect(() => {
    setActiveMenu(null);
  }, [selectedIds]);

  useEffect(() => {
    setActiveMenu(null);
  }, [summaryMode]);

  function closeActionMenus() {
    setActiveMenu(null);
  }

  function applyFilters() {
    setAppliedFilters(draftFilters);
  }

  function clearFilters() {
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  }

  function applyCustomDateRange(): boolean {
    if (!customFromDate || !customToDate) {
      setDateRangeError("Choose both From Date and To Date.");
      return false;
    }
    if (customFromDate > customToDate) {
      setDateRangeError("From Date cannot be after To Date.");
      return false;
    }
    setDateRange({
      fromDate: customFromDate,
      toDate: customToDate,
      label: customFromDate === customToDate ? formatHistoryDate(customFromDate) : `${formatHistoryDate(customFromDate)} - ${formatHistoryDate(customToDate)}`
    });
    setDateRangeError("");
    return true;
  }

  function applyMobileFilters(): boolean {
    if (mobileDateFilterEnabled && !applyCustomDateRange()) return false;
    if (!mobileDateFilterEnabled) setDateRange(null);
    applyFilters();
    return true;
  }

  function prepareDateRangeDraft() {
    const today = inputDate(new Date());
    setCustomFromDate(dateRange?.fromDate || today);
    setCustomToDate(dateRange?.toDate || today);
    setDateRangeError("");
    setActiveDatePicker(null);
    closeActionMenus();
  }

  function applyQuickDateRange(range: DateRange) {
    setDateRange(range);
    setCustomFromDate(range.fromDate);
    setCustomToDate(range.toDate);
    setDateRangeError("");
  }

  function clearDateRange() {
    const today = inputDate(new Date());
    setDateRange(null);
    setCustomFromDate(today);
    setCustomToDate(today);
    setDateRangeError("");
  }

  function removeFilter<K extends keyof AppliedFilters>(key: K) {
    const next = { ...appliedFilters, [key]: emptyFilters[key] };
    setAppliedFilters(next);
    setDraftFilters(next);
  }

  function beginSummary(mode: "combined" | "individual") {
    if (mode === "individual") {
      setSummaryChoiceOpen(false);
      setSummaryMode("individual");
      return;
    }
    if (mode === "combined" && selectedOwnerGroups.size > 1) {
      setSummaryChoiceOpen(false);
      setMultiOwnerChoiceOpen(true);
      return;
    }
    setSummaryMode(mode);
    setSummaryChoiceOpen(false);
  }

  function closePreview() {
    setPreviewBill(null);
    closeActionMenus();
  }

  function openBulkDeleteConfirmation() {
    if (selectedIds.length === 0) return;
    setBulkDeleteIds([...selectedIds]);
  }

  function enterSelectionMode() {
    setSelectionMode(true);
  }

  function clearSelectionMode() {
    onClearSelection();
    setSelectionMode(false);
  }

  function selectAllFilteredBills() {
    onSelectAll(filtered.map((bill) => bill.id));
  }

  function runMenuAction(close: (restoreFocus?: boolean) => void, action: () => void) {
    close(true);
    action();
  }

  function BillActionsMenu({ bill, surface }: { bill: Bill; surface: "desktop" | "mobile" }) {
    return (
      <ActionMenu
        menuId={`${surface}-row-${bill.id}`}
        activeMenu={activeMenu}
        onActiveMenuChange={setActiveMenu}
        trigger={<Icon name="more" />}
        triggerClassName={iconButtonClass}
        triggerLabel="Bill actions"
        menuClassName="w-48"
      >
        {(close) => (
          <>
            <button type="button" role="menuitem" className={menuItemClass} onClick={() => runMenuAction(close, () => setPreviewBill(bill))}><Icon name="eye" /> Preview</button>
            <button type="button" role="menuitem" className={menuItemClass} onClick={() => runMenuAction(close, () => onEdit(bill))}><Icon name="edit" /> Edit</button>
            <button type="button" role="menuitem" className={menuItemClass} onClick={() => runMenuAction(close, () => onDuplicate(bill))}><Icon name="duplicate" /> Duplicate</button>
            <button type="button" role="menuitem" className={menuItemClass} onClick={() => runMenuAction(close, () => onCopy(buildSingleBillWhatsAppText(bill, settings)))}><Icon name="copy" /> Copy Bill</button>
            <a role="menuitem" className={menuItemClass} href={createWhatsAppUrl(buildSingleBillWhatsAppText(bill, settings))} target="_blank" rel="noreferrer" onClick={() => close()}><Icon name="share" /> Share on WhatsApp</a>
            <button type="button" role="menuitem" className={menuItemClass} onClick={() => runMenuAction(close, () => exportSingleBillPdf(bill, settings))}><Icon name="download" /> Export PDF</button>
            <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
            <button type="button" role="menuitem" className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-red-300 dark:hover:bg-red-950/40" onClick={() => runMenuAction(close, () => setDeleteBill(bill))}><Icon name="trash" /> Delete</button>
          </>
        )}
      </ActionMenu>
    );
  }

  return (
    <div className="tripledgerListPage min-w-0 max-w-full">
      <header className="tripledgerListMobileHeader">
        <h1 className="text-xl font-black text-slate-950 dark:text-slate-50">Bill History</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Search, review and manage saved bills</p>
      </header>

      <Card className="tripledgerListToolbar">
        <CardContent className="tripledgerListToolbarContent space-y-3">
          {isMobile && (
            <div className="grid grid-cols-[minmax(0,1fr)_2.75rem_2.75rem] gap-2">
              <label className="relative block">
                <span className="sr-only">Search bills</span>
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon name="search" /></span>
                <Input className="pl-10 pr-9" placeholder="Search bills..." value={search} onChange={(event) => setSearch(event.target.value)} />
                {search && (
                  <button type="button" className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400" aria-label="Clear search" onClick={() => setSearch("")}>
                    <Icon name="x" />
                  </button>
                )}
              </label>
              <ToolbarPopover
                popoverId="filter"
                activePopover={activeToolbarPopover}
                onActivePopoverChange={setActiveToolbarPopover}
                onOpen={() => {
                  closeActionMenus();
                  setDraftFilters(appliedFilters);
                  setMobileDateFilterEnabled(Boolean(dateRange));
                  prepareDateRangeDraft();
                }}
                trigger={<Icon name="filter" />}
                triggerClassName={cn(toolbarControlClass, "inline-flex w-11 items-center justify-center p-0")}
                triggerLabel="Filter bills"
                isActive={activeFilters + (dateRange ? 1 : 0) > 0}
              >
                {(close) => (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-black text-slate-950 dark:text-slate-50">Filter Bills</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Narrow by date or Owner / Company.</p>
                    </div>
                    <fieldset>
                      <legend className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Date range</legend>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button type="button" className={cn("min-h-10 rounded-xl border px-3 text-sm font-bold", !mobileDateFilterEnabled ? "border-[#1E3A8A] bg-[#1E3A8A] text-white" : "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200")} onClick={() => setMobileDateFilterEnabled(false)}>Any date</button>
                        {quickDatePresets.map((preset) => {
                          const selected = mobileDateFilterEnabled && customFromDate === preset.range.fromDate && customToDate === preset.range.toDate;
                          return (
                            <button key={preset.id} type="button" className={cn("min-h-10 rounded-xl border px-3 text-sm font-bold", selected ? "border-[#1E3A8A] bg-[#1E3A8A] text-white" : "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200")} aria-pressed={selected} onClick={() => { setMobileDateFilterEnabled(true); setCustomFromDate(preset.range.fromDate); setCustomToDate(preset.range.toDate); setDateRangeError(""); }}>
                              {preset.label}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                    {mobileDateFilterEnabled && (
                      <div className="grid grid-cols-2 gap-3">
                        <label className="field-label"><span>From</span><Input type="date" value={customFromDate} max={customToDate} onChange={(event) => { setCustomFromDate(event.target.value); setDateRangeError(""); }} /></label>
                        <label className="field-label"><span>To</span><Input type="date" value={customToDate} min={customFromDate} onChange={(event) => { setCustomToDate(event.target.value); setDateRangeError(""); }} /></label>
                      </div>
                    )}
                    {dateRangeError && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-200" role="alert">{dateRangeError}</p>}
                    <label className="field-label"><span>Owner / Company</span>
                      <HistorySelect label="Owner / Company" value={draftFilters.billingPartyId} options={billingPartyOptions} onChange={(value) => setDraftFilters({ ...draftFilters, billingPartyId: value })} />
                    </label>
                    <div className="flex justify-end gap-2">
                      <Button type="button" onClick={() => { clearFilters(); clearDateRange(); setMobileDateFilterEnabled(false); close(true); }}>Clear</Button>
                      <Button type="button" variant="primary" onClick={() => { if (applyMobileFilters()) close(true); }}>Apply</Button>
                    </div>
                  </div>
                )}
              </ToolbarPopover>
              <HistorySelect label="Sort bills" value={sort} options={sortOptions} onChange={(value) => changeSort(value as SortOption)} leadingIcon={<Icon name="sort" />} iconOnly />
            </div>
          )}
          {!isMobile && <div className="tripledgerListToolbarGrid lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center">
            <label className="relative block">
              <span className="sr-only">Search bills</span>
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon name="search" /></span>
              <Input className="pl-10 pr-10" placeholder="Search customer, Owner / Company, vehicle, or place..." value={search} onChange={(event) => setSearch(event.target.value)} />
              {search && (
                <button type="button" className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200" aria-label="Clear search" title="Clear search" onClick={() => setSearch("")}>
                  <Icon name="x" />
                </button>
              )}
            </label>
            <ToolbarPopover
              popoverId="date-range"
              activePopover={activeToolbarPopover}
              onActivePopoverChange={setActiveToolbarPopover}
              onOpen={prepareDateRangeDraft}
              trigger={<><Icon name="calendar" /> {dateRange ? dateRange.label : "Date Range"}</>}
              triggerClassName={cn(toolbarControlClass, "inline-flex w-full items-center justify-center")}
              triggerLabel="Date Range"
              isActive={Boolean(dateRange)}
              wide
            >
              {(close) => (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-black text-slate-950 dark:text-slate-50">Date Range</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Choose an inclusive billing period.</p>
                  </div>
                  <fieldset>
                    <legend className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Quick Select</legend>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {quickDatePresets.map((preset) => {
                        const selected = dateRange?.fromDate === preset.range.fromDate && dateRange?.toDate === preset.range.toDate;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            className={cn("min-h-10 cursor-pointer rounded-xl border px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950", selected ? "border-[#1E3A8A] bg-[#1E3A8A] text-white dark:border-blue-600 dark:bg-blue-600" : "border-slate-200 bg-white text-slate-700 hover:border-[#1E3A8A] hover:bg-[#1E3A8A] hover:text-white dark:border-slate-700 dark:bg-[#0f172a] dark:text-slate-200 dark:hover:border-blue-600 dark:hover:bg-blue-700 dark:hover:text-white")}
                            aria-pressed={selected}
                            onClick={() => { applyQuickDateRange(preset.range); close(true); }}
                          >
                            {preset.label}{selected && <span className="sr-only"> selected</span>}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                  <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Custom Range</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="field-label"><span>From Date</span>
                      <CustomDatePicker
                        label="From Date"
                        value={customFromDate}
                        max={customToDate}
                        open={activeDatePicker === "from"}
                        align="start"
                        onOpenChange={(open) => setActiveDatePicker(open ? "from" : null)}
                        onChange={(value) => { setCustomFromDate(value); setDateRangeError(""); }}
                      />
                    </div>
                    <div className="field-label"><span>To Date</span>
                      <CustomDatePicker
                        label="To Date"
                        value={customToDate}
                        min={customFromDate}
                        open={activeDatePicker === "to"}
                        align="end"
                        onOpenChange={(open) => setActiveDatePicker(open ? "to" : null)}
                        onChange={(value) => { setCustomToDate(value); setDateRangeError(""); }}
                      />
                    </div>
                  </div>
                  {dateRangeError && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-200" role="alert" aria-live="polite">{dateRangeError}</p>}
                  <div className="flex justify-end gap-2">
                    <Button type="button" onClick={() => { clearDateRange(); close(true); }}>Clear</Button>
                    <Button type="button" variant="primary" onClick={() => { if (applyCustomDateRange()) close(true); }}>Apply</Button>
                  </div>
                </div>
              )}
            </ToolbarPopover>
            <ToolbarPopover
              popoverId="filter"
              activePopover={activeToolbarPopover}
              onActivePopoverChange={setActiveToolbarPopover}
              onOpen={() => { closeActionMenus(); setDraftFilters(appliedFilters); }}
              trigger={<><Icon name="filter" /> Filter{activeFilters > 0 ? ` ${activeFilters}` : ""}</>}
              triggerClassName={cn(toolbarControlClass, "inline-flex w-full items-center justify-center")}
              triggerLabel="Filter bills"
              isActive={activeFilters > 0}
            >
              {(close) => (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-black text-slate-950 dark:text-slate-50">Filter Bills</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Narrow bills by Owner / Company.</p>
                  </div>
                  <div className="field-label"><span>Owner / Company</span>
                    <HistorySelect label="Owner / Company" value={draftFilters.billingPartyId} options={billingPartyOptions} onChange={(value) => setDraftFilters({ ...draftFilters, billingPartyId: value })} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" onClick={() => { clearFilters(); close(true); }}>Clear</Button>
                    <Button type="button" variant="primary" onClick={() => { applyFilters(); close(true); }}>Apply</Button>
                  </div>
                </div>
              )}
            </ToolbarPopover>
            <HistorySelect label="Sort bills" value={sort} options={sortOptions} onChange={(value) => changeSort(value as SortOption)} leadingIcon={<Icon name="sort" />} className="w-full sm:w-56 lg:w-56" />
          </div>}

          {activeFilters > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {appliedFilters.billingPartyId && <button className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#1E3A8A] dark:bg-blue-950/50 dark:text-blue-200" onClick={() => removeFilter("billingPartyId")}>{billingPartyNameById.get(appliedFilters.billingPartyId) || "Owner"} x</button>}
              <button className="text-xs font-bold text-slate-500 hover:text-[#1E3A8A] dark:text-slate-400 dark:hover:text-blue-200" onClick={clearFilters}>Clear all</button>
            </div>
          )}
          {dateRange && (
            <div className="flex flex-wrap items-center gap-2">
              <button className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" onClick={() => setDateRange(null)}>{dateRange.label} x</button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className={cn(isMobile ? "sticky top-[74px] z-10 bg-slate-50/95 px-1 py-1 backdrop-blur dark:bg-slate-950/95" : "tripledgerListSummary sticky top-[89px] z-10", selectionMode && (isMobile ? "rounded-xl border border-blue-200 bg-blue-50/70 p-2 shadow-sm dark:border-blue-900 dark:bg-blue-950/20" : "border-blue-200 shadow-sm dark:border-blue-900"))}>
        {selectionMode ? (
          <div className="grid gap-2 lg:flex lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center justify-between gap-3 lg:justify-start">
              <p className="text-sm font-black text-slate-950 dark:text-slate-50" aria-live="polite">{selectedIds.length} selected</p>
              {allFilteredSelected ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">All selected <Icon name="check" /></span>
              ) : (
                <button type="button" className="inline-flex min-h-9 shrink-0 cursor-pointer items-center rounded-xl px-2 text-xs font-black text-[#1E3A8A] hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-200 dark:hover:bg-slate-800" aria-label={`Select all ${filtered.length} filtered bills`} onClick={selectAllFilteredBills}>
                  Select all {filtered.length}
                </button>
              )}
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="primary" className="min-h-11 w-fit gap-1.5 px-3" aria-label="Generate summary for selected bills" title="Generate Summary" disabled={selectedIds.length === 0} onClick={() => { setSummaryDraftMode("combined"); setSummaryChoiceOpen(true); }}><Icon name="document" /> Summary</Button>
              {isMobile ? (
                <ActionMenu menuId="selected-bill-actions" activeMenu={activeMenu} onActiveMenuChange={setActiveMenu} trigger={<Icon name="more" />} triggerClassName={iconButtonClass} triggerLabel="More selected bill actions">
                  {(close) => <>
                    <button type="button" role="menuitem" className={menuItemClass} disabled={selectedBills.length === 0} onClick={() => { if (selectedBills.length > 0) exportIndividualSummaryPdf(selectedBills, settings); close(); }}><Icon name="download" /> Export selected</button>
                    <button type="button" role="menuitem" className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-300 dark:hover:bg-red-950/40" disabled={selectedIds.length === 0 || Boolean(bulkDeleteIds)} onClick={() => { close(); openBulkDeleteConfirmation(); }}><Icon name="trash" /> Delete selected</button>
                    <button type="button" role="menuitem" className={menuItemClass} onClick={() => { close(); clearSelectionMode(); }}><Icon name="x" /> Clear selection</button>
                  </>}
                </ActionMenu>
              ) : <>
                <Button type="button" variant="secondary" className="gap-2 px-3" aria-label="Export selected bills" title="Export" disabled={selectedBills.length === 0} onClick={() => selectedBills.length > 0 && exportIndividualSummaryPdf(selectedBills, settings)}><Icon name="download" /> Export</Button>
                <Button type="button" variant="danger" className="gap-2 px-3" aria-label={`Delete ${selectedIds.length} selected bills`} title="Delete" disabled={selectedIds.length === 0 || Boolean(bulkDeleteIds)} onClick={openBulkDeleteConfirmation}><Icon name="trash" /> Delete</Button>
                <Button type="button" variant="ghost" className="gap-2 px-3 text-slate-500 hover:text-[#1E3A8A] dark:text-slate-300 dark:hover:text-blue-200" aria-label="Clear selected bills" title="Clear" onClick={clearSelectionMode}><Icon name="x" /> Clear</Button>
              </>}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-bold text-slate-700 dark:text-slate-300">{filtered.length} bills{hasSearchOrFilters ? " found" : ""} <span className="font-semibold text-slate-400 dark:text-slate-500">· Total {currency(filteredTotal, settings.currencySymbol)}</span></p>
            <Button type="button" variant={isMobile ? "ghost" : "secondary"} className="w-fit shrink-0 gap-2 px-3" aria-label="Select bills" title="Select bills" onClick={enterSelectionMode}>{!isMobile && <Icon name="check" />} {isMobile ? "Select" : "Select bills"}</Button>
          </div>
        )}
      </div>

      {bills.length === 0 ? (
        <div className="space-y-3">
          <EmptyState title="No bills yet" description="Create your first bill to start building your billing history." />
          {onCreateBill && <Button type="button" variant="primary" onClick={onCreateBill}>Create First Bill</Button>}
        </div>
      ) : filtered.length === 0 ? (
        <div className="space-y-3">
          <EmptyState title="No bills match your search" description="Try changing your search or clearing some filters." />
          <Button type="button" onClick={() => { setSearch(""); setDateRange(null); clearFilters(); }}>Clear Filters</Button>
        </div>
      ) : (
        <div className="tripledgerListResults">
          <div className="tripledgerListDesktop">
            <table className={cn("historyBillTable tripledgerListTable min-w-0", selectionMode && "hasSelectionColumn")} aria-label="Bill history">
              {selectionMode ? (
                <colgroup>
                  <col className="tripledgerSelectionColumn" />
                  <col className="tripledgerDataColumn" />
                  <col className="tripledgerDataColumn" />
                  <col className="tripledgerDataColumn" />
                  <col className="tripledgerDataColumn" />
                  <col className="tripledgerDataColumn" />
                  <col className="tripledgerActionsColumn" />
                </colgroup>
              ) : (
                <colgroup>
                  <col className="tripledgerDataColumn" />
                  <col className="tripledgerDataColumn" />
                  <col className="tripledgerDataColumn" />
                  <col className="tripledgerDataColumn" />
                  <col className="tripledgerDataColumn" />
                  <col className="tripledgerActionsColumn" />
                </colgroup>
              )}
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
                {pagedBills.map((bill) => {
                  const selected = selectedIds.includes(bill.id);
                  const vehicleLabel = [bill.vehicleName, bill.vehicleNumber].filter(Boolean).join(" | ") || "Vehicle";
                  return (
                    <tr key={bill.id} className={cn("historyBillTableRow", selectionMode && selected && "is-selected")} aria-selected={selectionMode ? selected : undefined}>
                      {selectionMode && <td className="historyCheckboxCell">
                        <input className="h-5 w-5 rounded border-slate-300" type="checkbox" aria-label={`Select bill for ${guestDisplay(bill)}`} checked={selected} onChange={() => onToggleSelected(bill.id)} />
                      </td>}
                      <td>
                        <p className="truncate text-sm font-black text-slate-950 dark:text-slate-50">{guestDisplay(bill)}</p>
                        <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{vehicleLabel}</p>
                      </td>
                      <td className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200" title={ownerName(bill)}>{ownerName(bill)}</td>
                      <td className="whitespace-nowrap text-sm font-semibold text-slate-600 dark:text-slate-300">{formatHistoryDate(bill.tripDate)}</td>
                      <td className="historyPlaceCell truncate text-sm text-slate-500 dark:text-slate-400" title={bill.reportingPlace || "NA"}>{bill.reportingPlace || "NA"}</td>
                      <td className="historyAmountCell text-base font-black text-[#1E3A8A] dark:text-blue-200">{currency(bill.totalAmount, settings.currencySymbol)}</td>
                      <td className="historyActionsCell tripledgerActionsCell">{!selectionMode && <BillActionsMenu bill={bill} surface="desktop" />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="tripledgerListMobile" role="list" aria-label="Bill history">
            {pagedBills.map((bill) => {
              const selected = selectedIds.includes(bill.id);
              const vehicleLabel = [bill.vehicleName, bill.vehicleNumber].filter(Boolean).join(" | ") || "Vehicle";
              return (
                <article key={bill.id} className={cn("tripledgerListMobileRow tripledgerListMobileRowContent", selectionMode && selected && "is-selected")} aria-selected={selectionMode ? selected : undefined} role="listitem">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      {selectionMode && <input className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300" type="checkbox" aria-label={`Select bill for ${guestDisplay(bill)}`} checked={selected} onChange={() => onToggleSelected(bill.id)} />}
                      <div className="min-w-0">
                        <h2 className="truncate font-black text-slate-950 dark:text-slate-50">{guestDisplay(bill)}</h2>
                        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{formatHistoryDate(bill.tripDate)}</p>
                      </div>
                    </div>
                    <p className="shrink-0 text-base font-black text-[#1E3A8A] dark:text-blue-200">{currency(bill.totalAmount, settings.currencySymbol)}</p>
                  </div>
                  <dl className="mt-3 space-y-1.5 text-sm">
                    <div><dt className="inline font-semibold text-slate-500 dark:text-slate-400">Owner: </dt><dd className="inline font-bold text-slate-800 dark:text-slate-100">{ownerName(bill)}</dd></div>
                    <div className="truncate text-slate-600 dark:text-slate-300" title={vehicleLabel}>{vehicleLabel}</div>
                    <div className="truncate"><dt className="inline font-semibold text-slate-500 dark:text-slate-400">Reporting place: </dt><dd className="inline text-slate-700 dark:text-slate-200">{bill.reportingPlace || "NA"}</dd></div>
                  </dl>
                  {!selectionMode && <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                    <button type="button" className="min-h-10 text-sm font-black text-[#1E3A8A] dark:text-blue-200" onClick={() => setPreviewBill(bill)}>View details</button>
                    <BillActionsMenu bill={bill} surface="mobile" />
                  </div>}
                </article>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-[#111827] sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold text-slate-600 dark:text-slate-300">Showing {pageStart}-{pageEnd} of {filtered.length}</p>
            {showPaginationControls && (
              <div className="flex flex-wrap items-center gap-2">
                {showRowsPerPage && (
                  <div className="flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300">
                    <span>Rows per page</span>
                    <HistorySelect label="Rows per page" value={String(rowsPerPage)} options={rowsPerPageSelectOptions} onChange={(value) => setRowsPerPage(Number(value))} className="w-24" />
                  </div>
                )}
                <Button type="button" variant="ghost" className="min-h-9 gap-1 px-2.5" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><Icon name="chevronLeft" /> Previous</Button>
                <div className="hidden gap-1 sm:flex" role="navigation" aria-label="Pagination">
                  {visiblePages.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      className={cn("min-h-9 min-w-9 cursor-pointer rounded-lg px-2 text-sm font-black focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60", pageNumber === currentPage ? "bg-[#1E3A8A] text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800")}
                      aria-label={`Go to page ${pageNumber}`}
                      aria-current={pageNumber === currentPage ? "page" : undefined}
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  ))}
                </div>
                <Button type="button" variant="ghost" className="min-h-9 gap-1 px-2.5" aria-label="Next page" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next <Icon name="chevronRight" /></Button>
              </div>
            )}
          </div>
        </div>
      )}

      {previewBill && (
        <Modal
          title="Bill Preview"
          description={`${ownerName(previewBill)} | ${formatHistoryDate(previewBill.tripDate)} | ${currency(previewBill.totalAmount, settings.currencySymbol)}`}
          maxWidth="max-w-5xl"
          onClose={closePreview}
          headerActions={(
            <>
              <ActionMenu menuId="preview-share" activeMenu={activeMenu} onActiveMenuChange={setActiveMenu} trigger={<><Icon name="share" /> Share</>} triggerClassName={cn(outlineActionClass, "gap-2")} triggerLabel="Share bill" menuClassName="w-72">
                {(close) => (
                  <div className="space-y-2">
                    <label className="block px-2 pb-1 text-xs font-bold text-slate-500 dark:text-slate-400">WhatsApp Number
                      <Input className="mt-1" placeholder="e.g. 919876543210" inputMode="tel" value={shareNumber} onChange={(event) => setShareNumber(event.target.value)} />
                    </label>
                    <a role="menuitem" className={menuItemClass} href={createWhatsAppUrl(buildSingleBillWhatsAppText(previewBill, settings), shareNumber)} target="_blank" rel="noreferrer" onClick={() => close()}><Icon name="share" /> Share on WhatsApp</a>
                    <button role="menuitem" className={menuItemClass} onClick={() => { exportSingleBillPdf(previewBill, settings); close(); }}><Icon name="download" /> Export PDF</button>
                  </div>
                )}
              </ActionMenu>
              <ActionMenu menuId="preview-actions" activeMenu={activeMenu} onActiveMenuChange={setActiveMenu} trigger={<><Icon name="more" /> Actions</>} triggerClassName={cn(outlineActionClass, "gap-2")} triggerLabel="Bill actions">
                {(close) => (
                  <>
                    <button role="menuitem" className={menuItemClass} onClick={() => { close(); onEdit(previewBill); setPreviewBill(null); }}><Icon name="edit" /> Edit</button>
                    <button role="menuitem" className={menuItemClass} onClick={() => { close(); onCopy(buildSingleBillWhatsAppText(previewBill, settings)); }}><Icon name="copy" /> Copy Bill</button>
                    <button role="menuitem" className={menuItemClass} onClick={() => { close(); onDuplicate(previewBill); setPreviewBill(null); }}><Icon name="duplicate" /> Duplicate</button>
                    <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                    <button role="menuitem" className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-red-300 dark:hover:bg-red-950/40" onClick={() => { close(); setDeleteBill(previewBill); }}><Icon name="trash" /> Delete Bill</button>
                  </>
                )}
              </ActionMenu>
            </>
          )}
        >
          <div className="space-y-4">
            <Textarea value={buildSingleBillText(previewBill, settings)} readOnly className="min-h-[55vh] font-mono text-xs leading-5" />
          </div>
        </Modal>
      )}

      {summaryChoiceOpen && (
        <Modal title="Generate Bill Summary" description={`${selectedBills.length} selected`} initialFocusRef={summaryChoiceFocusRef} maxWidth="max-w-lg" onClose={() => setSummaryChoiceOpen(false)}>
          <div className="space-y-4">
            <div className="grid gap-2">
              <label className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-sm font-bold", summaryDraftMode === "combined" ? "border-blue-300 bg-blue-50 text-[#1E3A8A] dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200" : "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200")}>
                <input ref={summaryDraftMode === "combined" ? summaryChoiceFocusRef : undefined} className="h-4 w-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" type="radio" name="summary-mode" checked={summaryDraftMode === "combined"} onChange={() => setSummaryDraftMode("combined")} />
                Combined Summary
              </label>
              <label className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-sm font-bold", summaryDraftMode === "individual" ? "border-blue-300 bg-blue-50 text-[#1E3A8A] dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200" : "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200")}>
                <input ref={summaryDraftMode === "individual" ? summaryChoiceFocusRef : undefined} className="h-4 w-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" type="radio" name="summary-mode" checked={summaryDraftMode === "individual"} onChange={() => setSummaryDraftMode("individual")} />
                Individual Summaries
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setSummaryChoiceOpen(false)}>Cancel</Button>
              <Button type="button" variant="primary" onClick={() => beginSummary(summaryDraftMode)}>Continue</Button>
            </div>
          </div>
        </Modal>
      )}

      {multiOwnerChoiceOpen && (
        <Modal title="Selected bills belong to multiple Owners / Companies" description="Choose how TripLedger should prepare this summary." maxWidth="max-w-lg" onClose={() => setMultiOwnerChoiceOpen(false)}>
          <div className="grid gap-3">
            <Button type="button" variant="primary" onClick={() => { setSummaryMode("grouped"); setMultiOwnerChoiceOpen(false); }}>Create separate summaries grouped by Owner / Company</Button>
            <Button type="button" onClick={() => { setSummaryMode("combined"); setMultiOwnerChoiceOpen(false); }}>Create one general combined summary</Button>
          </div>
        </Modal>
      )}

      {summaryMode && (
        <Modal
          title={summaryMode === "individual" ? "Individual summaries" : summaryMode === "grouped" ? "Grouped Owner Summaries" : "Combined summary"}
          description={summaryMode === "individual" ? `${selectedBills.length} bills` : `${selectedBills.length} bills | ${formatDateRange(selectedBills)} | ${currency(summaryTotals.grandTotal, settings.currencySymbol)}`}
          closeLabel={summaryMode === "individual" ? "Close individual summaries" : "Close combined summary"}
          maxWidth="max-w-5xl"
          onClose={() => { closeActionMenus(); setSummaryMode(null); }}
          headerActions={(
            <>
              <ActionMenu menuId="summary-actions" activeMenu={activeMenu} onActiveMenuChange={setActiveMenu} trigger={<Icon name="more" />} triggerClassName={iconButtonClass} triggerLabel={summaryMode === "individual" ? "More individual summary actions" : "More combined summary actions"} menuClassName="w-72">
                {(close) => (
                  <div className="space-y-2">
                    <button type="button" role="menuitem" className={menuItemClass} onClick={() => { onCopy(summaryMode === "individual" ? allIndividualText : summaryShareText); close(); }}><Icon name="copy" /> {summaryMode === "individual" ? "Copy all summaries" : "Copy summary"}</button>
                    <label className="block px-2 pb-1 text-xs font-bold text-slate-500 dark:text-slate-400">WhatsApp Number
                      <Input className="mt-1" placeholder="e.g. 919876543210" inputMode="tel" value={shareNumber} onChange={(event) => setShareNumber(event.target.value)} />
                    </label>
                    <a role="menuitem" className={menuItemClass} href={createWhatsAppUrl(summaryShareText, shareNumber)} target="_blank" rel="noreferrer" onClick={() => close()}><Icon name="share" /> Share on WhatsApp</a>
                    <button role="menuitem" className={menuItemClass} onClick={() => { summaryMode === "combined" ? exportCombinedSummaryPdf(summaryTotals, settings) : exportIndividualSummaryPdf(selectedBills, settings); close(); }}><Icon name="download" /> Export PDF</button>
                  </div>
                )}
              </ActionMenu>
            </>
          )}
        >
          <div className="min-w-0 max-w-full">
            <Textarea value={summaryDisplayText} readOnly className="min-h-[55vh] max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] font-mono text-xs leading-5" aria-label={summaryMode === "individual" ? "All selected bills as individual summaries" : "Bill summary text"} />
          </div>
        </Modal>
      )}

      <ConfirmationDialog
        open={Boolean(deleteBill)}
        title="Delete this bill?"
        message="This action cannot be undone."
        confirmLabel="Delete Bill"
        busyLabel="Deleting..."
        confirmVariant="danger"
        lockCancelWhileBusy
        onCancel={() => setDeleteBill(null)}
        onConfirm={async () => {
          if (!deleteBill) return;
          await onDelete(deleteBill.id);
          setDeleteBill(null);
          if (previewBill?.id === deleteBill.id) setPreviewBill(null);
        }}
      />

      <ConfirmationDialog
        open={Boolean(bulkDeleteIds)}
        title={(bulkDeleteIds?.length ?? 0) === 1 ? "Delete this bill?" : "Delete selected bills?"}
        message={(bulkDeleteIds?.length ?? 0) === 1 ? "This action cannot be undone." : `You are about to delete ${bulkDeleteIds?.length ?? 0} bills.\n\nThis action cannot be undone.`}
        confirmLabel={(bulkDeleteIds?.length ?? 0) === 1 ? "Delete Bill" : `Delete ${bulkDeleteIds?.length ?? 0} Bills`}
        busyLabel="Deleting..."
        confirmVariant="danger"
        lockCancelWhileBusy
        onCancel={() => setBulkDeleteIds(null)}
        onConfirm={async () => {
          const ids = bulkDeleteIds ?? [];
          if (ids.length === 0) return;
          await onDeleteSelected(ids);
          setBulkDeleteIds(null);
          setSelectionMode(false);
        }}
      />
    </div>
  );
}
