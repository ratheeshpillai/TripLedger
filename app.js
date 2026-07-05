const STORAGE_KEY = "driver-bill-logger-v1";

const fields = [
  "driver",
  "vehicle",
  "vehicleNumber",
  "guest",
  "reportingPlace",
  "tripDate",
  "reportingTime",
  "garageTime",
  "closingDate",
  "closingTime",
  "totalKm",
  "totalHoursManual",
  "baseHours",
  "baseKm",
  "baseAmount",
  "extraHourRate",
  "extraHourAmount",
  "extraKmRate",
  "extraKm",
  "extraKmAmount",
  "rounding",
  "airportParking",
  "fastag",
  "roadParking",
  "pendingBills",
  "notes",
  "whatsappNumber"
];

const els = Object.fromEntries(fields.map((id) => [id, document.getElementById(id)]));
const tripForm = document.getElementById("tripForm");
const tripList = document.getElementById("tripList");
const template = document.getElementById("tripCardTemplate");
const billMessage = document.getElementById("billMessage");
const currentTotal = document.getElementById("currentTotal");
const pendingTotal = document.getElementById("pendingTotal");
const grandTotal = document.getElementById("grandTotal");
const tripCount = document.getElementById("tripCount");
const whatsappButton = document.getElementById("whatsappButton");
const copyButton = document.getElementById("copyButton");
const sampleButton = document.getElementById("sampleButton");
const resetFormButton = document.getElementById("resetFormButton");
const clearAllButton = document.getElementById("clearAllButton");

let state = loadState();
let garageWasEdited = false;
let totalHoursWasEdited = false;
let extraHourAmountWasEdited = false;
let extraKmWasEdited = false;
let extraKmAmountWasEdited = false;

function loadState() {
  const fallback = { trips: [], form: {} };
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || fallback;
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function numberValue(id) {
  return Number(els[id].value || 0);
}

function money(value) {
  return `Rs.${Math.round(value).toLocaleString("en-IN")}`;
}

function shortDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year.slice(2)}`;
}

function parseClock(value) {
  const clean = String(value || "").trim().replace(".", ":");
  if (!clean) return null;
  const compact = clean.match(/^(\d{1,2})(\d{2})$/);
  const parts = compact ? [compact[1], compact[2]] : clean.split(":");
  const hours = Number(parts[0]);
  const minutes = Number(parts[1] || 0);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

function normalizeClock(value) {
  const parsed = parseClock(value);
  if (!parsed) return String(value || "").trim();
  return `${String(parsed.hours).padStart(2, "0")}:${String(parsed.minutes).padStart(2, "0")}`;
}

function timeText(value) {
  const normalized = normalizeClock(value);
  return normalized ? normalized.replace(":", ".") : "";
}

function parseDuration(value) {
  const clean = String(value || "").trim().replace(":", ".");
  if (!clean) return null;
  const [hourText, minuteText = "0"] = clean.split(".");
  const hours = Number(hourText);
  const minutes = Number(minuteText.padEnd(2, "0").slice(0, 2));

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || minutes < 0 || minutes > 59) return null;
  return hours + minutes / 60;
}

function normalizeDuration(value) {
  const parsed = parseDuration(value);
  if (parsed === null) return String(value || "").trim();
  return formatDuration(parsed).replace(" hrs", "");
}

function oneHourBefore(value) {
  const parsed = parseClock(value);
  if (!parsed) return "";
  const totalMinutes = (parsed.hours * 60 + parsed.minutes - 60 + 24 * 60) % (24 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatDuration(hours) {
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  if (minutes === 0) return `${whole} hrs`;
  return `${whole}.${String(minutes).padStart(2, "0")} hrs`;
}

function dateTime(date, time) {
  const normalized = normalizeClock(time);
  if (!date || !parseClock(normalized)) return null;
  return new Date(`${date}T${normalized}`);
}

function calculateTimeHours(data) {
  const start = dateTime(data.tripDate, data.garageTime || data.reportingTime);
  let end = dateTime(data.closingDate || data.tripDate, data.closingTime);

  if (start && end && end <= start && !data.closingDate) {
    end = new Date(end.getTime() + 24 * 36e5);
  }

  if (start && end && end > start) {
    return (end - start) / 36e5;
  }

  return 0;
}

function rounded(value, increment) {
  const step = Number(increment || 1);
  return Math.round(value / step) * step;
}

function calculateTrip(data) {
  const manualHours = parseDuration(data.totalHoursManual);
  const hasManualHours = manualHours !== null && manualHours > 0;
  const totalHours = hasManualHours ? manualHours : calculateTimeHours(data);
  const extraHours = Math.max(0, totalHours - Number(data.baseHours || 0));
  const autoExtraKm = Math.max(0, Number(data.totalKm || 0) - Number(data.baseKm || 0));
  const extraKm = data.extraKm === undefined || data.extraKm === "" ? autoExtraKm : Number(data.extraKm || 0);
  const autoExtraHourAmount = rounded(extraHours * Number(data.extraHourRate || 0), Number(data.rounding || 1));
  const autoExtraKmAmount = rounded(extraKm * Number(data.extraKmRate || 0), Number(data.rounding || 1));
  const extraHourAmount = data.extraHourAmount === undefined || data.extraHourAmount === ""
    ? autoExtraHourAmount
    : Number(data.extraHourAmount || 0);
  const extraKmAmount = data.extraKmAmount === undefined || data.extraKmAmount === ""
    ? autoExtraKmAmount
    : Number(data.extraKmAmount || 0);
  const extras =
    Number(data.airportParking || 0) +
    Number(data.fastag || 0) +
    Number(data.roadParking || 0);
  const amount = Number(data.baseAmount || 0) + extraHourAmount + extraKmAmount + extras;

  return {
    totalHours,
    extraHours,
    extraKm,
    extraHourAmount,
    extraKmAmount,
    extras,
    amount
  };
}

function readForm() {
  return Object.fromEntries(fields.map((id) => [id, els[id].value.trim()]));
}

function fillForm(data) {
  fields.forEach((id) => {
    if (els[id] && data[id] !== undefined) els[id].value = data[id];
  });
}

function resetEditFlags() {
  totalHoursWasEdited = false;
  extraHourAmountWasEdited = false;
  extraKmWasEdited = false;
  extraKmAmountWasEdited = false;
}

function updateCalculatedFields() {
  const data = readForm();
  const timeHours = calculateTimeHours(data);
  const extraHours = Math.max(0, timeHours - Number(data.baseHours || 0));
  const autoExtraHourAmount = rounded(extraHours * Number(data.extraHourRate || 0), Number(data.rounding || 1));
  const autoExtraKm = Math.max(0, Number(data.totalKm || 0) - Number(data.baseKm || 0));
  const kmForAmount = extraKmWasEdited ? Number(els.extraKm.value || 0) : autoExtraKm;
  const autoExtraKmAmount = rounded(kmForAmount * Number(data.extraKmRate || 0), Number(data.rounding || 1));

  if (!totalHoursWasEdited) {
    els.totalHoursManual.value = timeHours > 0 ? formatDuration(timeHours).replace(" hrs", "") : "";
  }

  if (!extraHourAmountWasEdited) {
    els.extraHourAmount.value = String(Math.round(autoExtraHourAmount));
  }

  if (!extraKmWasEdited) {
    els.extraKm.value = String(Math.round(autoExtraKm));
  }

  if (!extraKmAmountWasEdited) {
    els.extraKmAmount.value = String(Math.round(autoExtraKmAmount));
  }
}

function clearEntryFields() {
  const keep = readForm();
  garageWasEdited = false;
  resetEditFlags();
  fillForm({
    driver: keep.driver || "RADHA",
    vehicle: keep.vehicle || "Innova Crysta",
    vehicleNumber: keep.vehicleNumber || "MH03CV 4312",
    baseHours: keep.baseHours || "8",
    baseKm: keep.baseKm || "80",
    baseAmount: keep.baseAmount || "2800",
    extraHourRate: keep.extraHourRate || "200",
    extraHourAmount: "0",
    extraKmRate: keep.extraKmRate || "0",
    extraKm: "0",
    extraKmAmount: "0",
    rounding: keep.rounding || "1",
    pendingBills: keep.pendingBills || "0",
    whatsappNumber: keep.whatsappNumber || "",
    guest: "",
    reportingPlace: "",
    tripDate: "",
    reportingTime: "",
    garageTime: "",
    closingDate: "",
    closingTime: "",
    totalKm: "80",
    totalHoursManual: "",
    airportParking: "0",
    fastag: "0",
    roadParking: "0",
    notes: ""
  });
  updateCalculatedFields();
}

function tripLines(trip) {
  const calc = calculateTrip(trip);
  const extraKmLine = calc.extraKm > 0
    ? `${calc.extraKm} KM`
    : "NA";
  const parking = (key) => Number(trip[key] || 0) > 0 ? money(Number(trip[key])) : "NA";

  return [
    `Driver: ${trip.driver || ""}`,
    `Vehicle: ${trip.vehicle || ""}`,
    `Vehicle Number: ${trip.vehicleNumber || ""}`,
    `Trip Date: ${shortDate(trip.tripDate)}`,
    `Guest: ${trip.guest || ""}`,
    `Reporting: ${trip.reportingPlace || ""}, ${timeText(trip.reportingTime)}`,
    `Garage Time: ${timeText(trip.garageTime || trip.reportingTime)}`,
    `Closing Time: ${timeText(trip.closingTime)}`,
    `Closing Date: ${shortDate(trip.closingDate || trip.tripDate)}`,
    `Total KM: ${trip.totalKm || 0}`,
    `Base Package: ${trip.baseHours || 0} Hours / ${trip.baseKm || 0} KM = Rs.${trip.baseAmount || 0}`,
    `Extra KM: ${extraKmLine}`,
    `Extra KM Amount: ${calc.extraKm > 0 ? `Rs.${Math.round(calc.extraKmAmount)}` : "NA"}`,
    `Total Hours: ${formatDuration(calc.totalHours)}`,
    `Extra Hours: ${formatDuration(calc.extraHours)}`,
    `Extra Hour Amount: Rs.${Math.round(calc.extraHourAmount)}`,
    `Airport Parking: ${parking("airportParking")}`,
    `Fastag: ${parking("fastag")}`,
    `Road Parking: ${parking("roadParking")}`,
    trip.notes ? `Notes: ${trip.notes}` : "",
    `Total Amount: Rs.${Math.round(calc.amount)}`
  ].filter(Boolean);
}

function buildMessage() {
  const trips = state.trips;
  const current = trips.reduce((sum, trip) => sum + calculateTrip(trip).amount, 0);
  const pending = numberValue("pendingBills");
  const grand = current + pending;
  const header = trips.length > 1 ? `Bill Summary (${trips.length} Trips)` : "Bill Details";
  const tripText = trips.length
    ? trips.map((trip, index) => `${trips.length > 1 ? `Trip ${index + 1}\n` : ""}${tripLines(trip).join("\n")}`).join("\n\n")
    : "No trips saved yet.";
  const pendingText = pending > 0 ? `\n\nPending Bills From Previous Month: Rs.${Math.round(pending)}` : "";
  const totalText = trips.length > 1 || pending > 0
    ? `\n\nCurrent Bill: Rs.${Math.round(current)}${pendingText}\nGrand Total: Rs.${Math.round(grand)}`
    : "";

  return `${header}\n\n${tripText}${totalText}`;
}

function renderTrips() {
  tripList.textContent = "";
  state.trips.forEach((trip, index) => {
    const calc = calculateTrip(trip);
    const card = template.content.firstElementChild.cloneNode(true);
    card.querySelector("h3").textContent = `${shortDate(trip.tripDate)} - ${trip.guest || "Guest"}`;
    card.querySelector("p").textContent = `${trip.reportingPlace || "Reporting"} | ${trip.totalKm || 0} KM | ${formatDuration(calc.totalHours)}`;
    card.querySelector("strong").textContent = money(calc.amount);
    card.querySelector("button").addEventListener("click", () => {
      state.trips.splice(index, 1);
      saveAndRender();
    });
    tripList.appendChild(card);
  });
}

function renderSummary() {
  const current = state.trips.reduce((sum, trip) => sum + calculateTrip(trip).amount, 0);
  const pending = numberValue("pendingBills");
  const grand = current + pending;
  currentTotal.textContent = money(current);
  pendingTotal.textContent = money(pending);
  grandTotal.textContent = money(grand);
  tripCount.textContent = `${state.trips.length} ${state.trips.length === 1 ? "trip" : "trips"}`;
  billMessage.value = buildMessage();

  const phone = els.whatsappNumber.value.replace(/\D/g, "");
  const encoded = encodeURIComponent(billMessage.value);
  whatsappButton.href = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

function saveAndRender() {
  state.form = readForm();
  saveState();
  renderTrips();
  renderSummary();
}

function applySample() {
  fillForm({
    driver: "RADHA",
    vehicle: "Innova Crysta",
    vehicleNumber: "MH03CV 4312",
    tripDate: "2026-06-15",
    guest: "Mr.Chemban Vinod + 2",
    reportingPlace: "Leela",
    reportingTime: "05:00",
    garageTime: "04:00",
    closingTime: "00:30",
    closingDate: "2026-06-16",
    totalKm: "80",
    totalHoursManual: "",
    baseHours: "8",
    baseKm: "80",
    baseAmount: "2800",
    extraHourRate: "200",
    extraHourAmount: "0",
    extraKmRate: "0",
    extraKm: "0",
    extraKmAmount: "0",
    airportParking: "0",
    fastag: "0",
    roadParking: "0",
    pendingBills: els.pendingBills.value || "0",
    rounding: "1",
    notes: "",
    whatsappNumber: els.whatsappNumber.value
  });
  garageWasEdited = true;
  resetEditFlags();
  updateCalculatedFields();
  saveAndRender();
}

tripForm.addEventListener("submit", (event) => {
  event.preventDefault();
  updateCalculatedFields();
  const trip = readForm();
  if (!trip.tripDate || !trip.closingTime || !trip.guest) {
    alert("Please add trip date, guest, and closing time.");
    return;
  }
  state.trips.push(trip);
  clearEntryFields();
  saveAndRender();
});

els.reportingTime.addEventListener("input", () => {
  if (!garageWasEdited || !els.garageTime.value.trim()) {
    els.garageTime.value = oneHourBefore(els.reportingTime.value);
  }
  if (!els.closingDate.value && els.tripDate.value) {
    els.closingDate.value = els.tripDate.value;
  }
  updateCalculatedFields();
  saveAndRender();
});

els.garageTime.addEventListener("input", () => {
  garageWasEdited = true;
  updateCalculatedFields();
  saveAndRender();
});

["reportingTime", "garageTime", "closingTime"].forEach((id) => {
  els[id].addEventListener("blur", () => {
    els[id].value = normalizeClock(els[id].value);
    updateCalculatedFields();
    saveAndRender();
  });
});

els.totalHoursManual.addEventListener("blur", () => {
  els.totalHoursManual.value = normalizeDuration(els.totalHoursManual.value);
  saveAndRender();
});

els.totalHoursManual.addEventListener("input", () => {
  totalHoursWasEdited = true;
  if (!extraHourAmountWasEdited) {
    const data = readForm();
    const totalHours = parseDuration(data.totalHoursManual) || 0;
    const extraHours = Math.max(0, totalHours - Number(data.baseHours || 0));
    els.extraHourAmount.value = String(Math.round(rounded(extraHours * Number(data.extraHourRate || 0), Number(data.rounding || 1))));
  }
  saveAndRender();
});

els.extraHourAmount.addEventListener("input", () => {
  extraHourAmountWasEdited = true;
  saveAndRender();
});

els.extraKm.addEventListener("input", () => {
  extraKmWasEdited = true;
  if (!extraKmAmountWasEdited) {
    els.extraKmAmount.value = String(Math.round(rounded(Number(els.extraKm.value || 0) * Number(els.extraKmRate.value || 0), Number(els.rounding.value || 1))));
  }
  saveAndRender();
});

els.extraKmAmount.addEventListener("input", () => {
  extraKmAmountWasEdited = true;
  saveAndRender();
});

fields
  .filter((id) => ![
    "reportingTime",
    "garageTime",
    "totalHoursManual",
    "extraHourAmount",
    "extraKm",
    "extraKmAmount"
  ].includes(id))
  .forEach((id) => {
    els[id].addEventListener("input", () => {
      if (id === "tripDate" && !els.closingDate.value) {
        els.closingDate.value = els.tripDate.value;
      }
      updateCalculatedFields();
      saveAndRender();
    });
  });

copyButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(billMessage.value);
  copyButton.textContent = "Copied";
  setTimeout(() => {
    copyButton.textContent = "Copy bill";
  }, 1400);
});

sampleButton.addEventListener("click", applySample);
resetFormButton.addEventListener("click", () => {
  clearEntryFields();
  saveAndRender();
});

clearAllButton.addEventListener("click", () => {
  if (!confirm("Clear all saved trips and form data?")) return;
  state = { trips: [], form: {} };
  localStorage.removeItem(STORAGE_KEY);
  clearEntryFields();
  saveAndRender();
});

fillForm(state.form || {});
if (!els.tripDate.value) clearEntryFields();
updateCalculatedFields();
renderTrips();
renderSummary();
