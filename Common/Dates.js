const { getTimezone } = require("../Config/Config");

// DATE columns (follow-up dates) are business-local calendar dates; Prisma
// reads and writes them as UTC midnight. TIMESTAMP columns are UTC instants,
// shown in APP_TIMEZONE.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (value) => String(value).padStart(2, "0");

// "YYYY-MM-DD" that is a real calendar date
const isValidDateString = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

// Calendar date of an instant in the business time zone
const toLocalDateString = (instant = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: getTimezone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);

const getToday = () => toLocalDateString(new Date());

// Prisma value of a DATE column <-> "YYYY-MM-DD"
const toDateColumn = (dateString) => new Date(`${dateString}T00:00:00.000Z`);

const fromDateColumn = (value) => (value ? value.toISOString().slice(0, 10) : null);

// "YYYY-MM-DD" -> "18-Sep-2026" (CodeIgniter d-M-Y)
const formatDisplayDate = (dateString) => {
  if (!dateString) {
    return "";
  }

  const [year, month, day] = dateString.split("-");

  return `${day}-${MONTHS[Number(month) - 1]}-${year}`;
};

// UTC instant -> local "18-Sep-2026"
const formatLocalDisplayDate = (instant) =>
  instant ? formatDisplayDate(toLocalDateString(instant)) : "";

// Offset of the business time zone from UTC at an instant, in milliseconds
const getTimezoneOffsetMs = (instant) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: getTimezone(),
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value])
  );
  const localAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);

  return localAsUtc - Math.floor(instant.getTime() / 1000) * 1000;
};

// Start (or end) of a local calendar day as a UTC instant, for TIMESTAMP filters
const localDayBoundaryToUtc = (dateString, endOfDay = false) => {
  const time = endOfDay ? "T23:59:59.000Z" : "T00:00:00.000Z";
  const wallClock = new Date(`${dateString}${time}`);

  return new Date(wallClock.getTime() - getTimezoneOffsetMs(wallClock));
};

// Hours + minutes columns -> "HH:MM", or "" when not scheduled
const formatTime = (hours, minutes) =>
  hours === null || hours === undefined ? "" : `${pad(hours)}:${pad(minutes ?? 0)}`;

module.exports = {
  isValidDateString,
  toLocalDateString,
  getToday,
  toDateColumn,
  fromDateColumn,
  formatDisplayDate,
  formatLocalDisplayDate,
  localDayBoundaryToUtc,
  formatTime,
};
