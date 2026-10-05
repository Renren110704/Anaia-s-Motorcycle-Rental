// Shared helpers for the "Print Report" and "Export CSV" actions used across
// the admin pages.
//
// columns shape: [{ key: "make", label: "Vehicle", value?: (row) => any }]

import defaultReportLogo from "../assets/logo.png";

const cellText = (col, row) => {
  const raw = typeof col.value === "function" ? col.value(row) : row[col.key];
  if (raw === undefined || raw === null || raw === "") return "";
  return String(raw);
};

// ── CSV (unchanged behaviour) ────────────────────────────────────────────────
const csvCell = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;

export const buildCSV = (columns, rows) => {
  const header = columns.map((c) => csvCell(c.label)).join(",");
  const body = rows
    .map((row) => columns.map((c) => csvCell(cellText(c, row))).join(","))
    .join("\n");
  return rows.length ? [header, body].join("\n") : header;
};

export const downloadCSV = (filename, columns, rows) => {
  const csv = buildCSV(columns, rows || []);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.toLowerCase().endsWith(".csv")
    ? filename
    : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// ── Date helpers ─────────────────────────────────────────────────────────────
export const escapeHTML = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const parseDate = (v) => {
  if (v === undefined || v === null || v === "") return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  const s = String(v);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s)
    ? new Date(`${s}T00:00:00`)
    : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

/** Any date-ish value -> "YYYY-MM-DD" (local), or "" if invalid. */
export const toISODate = (v) => {
  const d = parseDate(v);
  if (!d) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Any date-ish value -> "May 5, 2026". */
export const formatReportDate = (v, fallback = "—") => {
  const d = parseDate(v);
  return d
    ? d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : fallback;
};

/**
 * Filters rows to an inclusive Date From / Date To range.
 *
 * getDate(row) may return:
 *   - a single date            -> kept if it falls inside the range
 *   - [start, end]             -> kept if the period OVERLAPS the range
 *                                 (a missing start/end means open-ended)
 * Rows with no usable date are dropped when a range is set, unless
 * opts.undated === "include". With no from AND no to, all rows are returned.
 */
export const filterByDateRange = (rows, getDate, from, to, opts = {}) => {
  const f = parseDate(from);
  const t = parseDate(to);
  if (!f && !t) return rows;
  const lo = f ? startOfDay(f) : null;
  const hi = t ? endOfDay(t) : null;
  const keepUndated = opts.undated === "include";

  return rows.filter((row) => {
    const v = getDate(row);
    if (Array.isArray(v)) {
      const s = parseDate(v[0]);
      const e = parseDate(v[1]);
      if (!s && !e) return keepUndated;
      if (hi && s && startOfDay(s) > hi) return false;
      if (lo && e && endOfDay(e) < lo) return false;
      return true;
    }
    const d = parseDate(v);
    if (!d) return keepUndated;
    if (lo && d < lo) return false;
    if (hi && d > hi) return false;
    return true;
  });
};

/** Earliest / latest date found in rows, as "YYYY-MM-DD" ("" if none). */
export const getDateBounds = (rows, getDate) => {
  let min = null;
  let max = null;
  rows.forEach((row) => {
    const v = getDate ? getDate(row) : null;
    (Array.isArray(v) ? v : [v]).forEach((x) => {
      const d = parseDate(x);
      if (!d) return;
      if (!min || d < min) min = d;
      if (!max || d > max) max = d;
    });
  });
  return { min: min ? toISODate(min) : "", max: max ? toISODate(max) : "" };
};

// ── Company details shown in the printed letterhead ─────────────────────────
export const REPORT_COMPANY = {
  name: "Anaia Motorcycle Rental",
  address: ["Soldiers Hills IV, Block 9 Lot 1 PH2 Lily", "Bacoor, 4102 Cavite"],
  email: "jpineda132020@gmail.com",
  phone: "0917 623 1426",
};

// ── Report branding: "Printed By" name + changeable logo ────────────────────
// Saved in this browser (localStorage) and applied to every printed report.
export const DEFAULT_PRINTED_BY = "Martin Lorenz Dula";

const PRINTED_BY_KEY = "anaia_report_printed_by";
const LOGO_KEY = "anaia_report_logo";
const LOGO_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const LOGO_MAX_BYTES = 5 * 1024 * 1024; // source file limit
const LOGO_MAX_PX = 480; // longest side after resizing

const readStore = (key) => {
  try {
    return window.localStorage.getItem(key) || "";
  } catch (err) {
    return "";
  }
};

const writeStore = (key, value) => {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
    return true;
  } catch (err) {
    return false;
  }
};

/** Absolute URL of the built-in logo (the print window has no base path). */
export const getDefaultReportLogo = () => {
  try {
    return new URL(defaultReportLogo, window.location.href).href;
  } catch (err) {
    return defaultReportLogo;
  }
};

/** Current branding. Falls back to the default name / default logo. */
export const getReportSettings = () => {
  const printedBy = readStore(PRINTED_BY_KEY).trim() || DEFAULT_PRINTED_BY;
  const stored = readStore(LOGO_KEY);
  const hasCustomLogo = LOGO_DATA_URL.test(stored);
  return {
    printedBy,
    logo: hasCustomLogo ? stored : getDefaultReportLogo(),
    hasCustomLogo,
  };
};

/** Saves the "Printed By" name. A blank name restores the default. */
export const saveReportPrintedBy = (name) =>
  writeStore(PRINTED_BY_KEY, String(name ?? "").trim());

/** Saves a custom logo (data URL from prepareReportLogo). False if it failed. */
export const saveReportLogo = (dataUrl) =>
  LOGO_DATA_URL.test(dataUrl || "") ? writeStore(LOGO_KEY, dataUrl) : false;

/** Removes the custom logo so reports use the default one again. */
export const clearReportLogo = () => writeStore(LOGO_KEY, "");

/**
 * Validates an uploaded image and resizes it to a small PNG data URL that is
 * safe to keep in localStorage and embed in the printed page.
 */
export const prepareReportLogo = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file selected."));
      return;
    }
    if (!LOGO_TYPES.includes(file.type)) {
      reject(new Error("Please choose a PNG, JPG or WebP image."));
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      reject(new Error("That image is too large. Maximum size is 5 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file is not a valid image."));
      img.onload = () => {
        try {
          const scale = Math.min(
            1,
            LOGO_MAX_PX / Math.max(img.width, img.height, 1),
          );
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          canvas
            .getContext("2d")
            .drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/png"));
        } catch (err) {
          reject(new Error("Could not process that image."));
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

// ── Print document (shared by every printed admin report) ───────────────────
// Black on white: no colours, gradients, shadows or badges. The only
// exception is the logo, which prints as uploaded.
const PRINT_CSS = (landscape, fontPt) => `
  @page {
    size: A4 ${landscape ? "landscape" : "portrait"};
    margin: 14mm 12mm 16mm 12mm;
    @bottom-center { content: "Page " counter(page) " of " counter(pages); font: 9pt Arial, Helvetica, sans-serif; color: #000; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; color: #000; background: transparent; box-shadow: none; text-shadow: none; }
  html, body { background: #fff; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: ${fontPt}pt; line-height: 1.35; padding: 12mm; }
  .rpt-head { margin-bottom: 6mm; }
  /* Letterhead: logo on the left, company details on the right. */
  .rpt-brand { display: flex; align-items: center; justify-content: space-between; gap: 8mm; }
  .rpt-logo-box { flex: 0 0 auto; }
  img.rpt-logo { display: block; max-width: 42mm; max-height: 20mm; width: auto; height: auto; object-fit: contain; }
  /* The built-in logo file has wide transparent padding around the artwork,
     so the box crops to the artwork itself (about 40mm x 18mm). */
  .rpt-logo-box.rpt-logo-default { width: 40mm; height: 18mm; overflow: hidden; }
  .rpt-logo-default img.rpt-logo { width: 98mm; height: 24.5mm; max-width: none; max-height: none; margin: -1.1mm 0 0 -28.7mm; }
  .rpt-info { flex: 1 1 auto; min-width: 0; text-align: right; font-size: 10pt; line-height: 1.3; }
  table.rpt-meta td.rpt-by { font-weight: 700; }
  .rpt-org { font-size: 13pt; font-weight: 700; margin-bottom: 1mm; }
  .rpt-title { text-align: center; font-size: 17pt; font-weight: 700; margin-bottom: 3mm; text-transform: uppercase; letter-spacing: 0.04em; }
  .rpt-rule { border: 0; border-top: 2px solid #000; margin: 3mm 0 3mm; }
  table.rpt-meta { width: 100%; border-collapse: collapse; margin-bottom: 2mm; }
  table.rpt-meta th, table.rpt-meta td { border: 1px solid #000; padding: 4px 8px; font-size: 10pt; text-align: left; vertical-align: top; }
  table.rpt-meta th { width: 18%; font-weight: 700; white-space: nowrap; }
  h2.rpt-section { font-size: 11pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin: 6mm 0 2mm; padding-bottom: 1mm; border-bottom: 1px solid #000; break-after: avoid; }
  table.rpt-table { width: 100%; border-collapse: collapse; }
  table.rpt-table th, table.rpt-table td { border: 1px solid #000; padding: 4px 5px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
  table.rpt-table th { font-weight: 700; }
  table.rpt-table td.num, table.rpt-table th.num { width: 4%; text-align: center; white-space: nowrap; }
  table.rpt-table td.amt, table.rpt-table th.amt { text-align: right; white-space: nowrap; }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  .rpt-empty { border: 1px solid #000; padding: 10mm 0; text-align: center; font-style: italic; }
  .rpt-end { margin-top: 4mm; text-align: center; font-size: 9pt; letter-spacing: 0.08em; }
  @media print { body { padding: 0; } }
`;

/**
 * Builds the standard formal report page and opens the print dialog.
 * Returns false if the pop-up was blocked.
 */
export const printDocument = ({
  title,
  subtitle = "",
  dateFrom = "",
  dateTo = "",
  dateBasis = "",
  bodyHTML,
  recordCount = null,
  landscape = false,
  fontPt = 10,
  printedBy = "", // optional override; defaults to the saved name
  logo = "", // optional override; defaults to the saved / default logo
}) => {
  const branding = getReportSettings();
  const byName = String(printedBy || "").trim() || branding.printedBy;
  const logoSrc = logo || branding.logo;
  const isDefaultLogo = !logo && !branding.hasCustomLogo;
  const from = formatReportDate(dateFrom, "All dates");
  const to = formatReportDate(dateTo, "All dates");
  const generated = new Date().toLocaleString("en-PH", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const docTitle = `${title} (${from} to ${to})`;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${escapeHTML(docTitle)}</title>
<style>${PRINT_CSS(landscape, fontPt)}</style>
</head>
<body>
  <header class="rpt-head">
    <div class="rpt-brand">
      <div class="rpt-logo-box${isDefaultLogo ? " rpt-logo-default" : ""}">${
        logoSrc
          ? `<img class="rpt-logo" src="${escapeHTML(logoSrc)}" alt="Logo"/>`
          : ""
      }</div>
      <div class="rpt-info">
        <div class="rpt-org">${escapeHTML(REPORT_COMPANY.name)}</div>
        ${REPORT_COMPANY.address
          .map((line) => `<div>${escapeHTML(line)}</div>`)
          .join("")}
        <div>${escapeHTML(REPORT_COMPANY.email)}</div>
        <div>${escapeHTML(REPORT_COMPANY.phone)}</div>
      </div>
    </div>
    <hr class="rpt-rule"/>
    <div class="rpt-title">${escapeHTML(title)}</div>
    <table class="rpt-meta">
      <tr>
        <th>Date From</th><td>${escapeHTML(from)}</td>
        <th>Date To</th><td>${escapeHTML(to)}</td>
      </tr>
      ${dateBasis ? `<tr><th>Date Basis</th><td colspan="3">${escapeHTML(dateBasis)}</td></tr>` : ""}
      ${subtitle ? `<tr><th>Filters</th><td colspan="3">${escapeHTML(subtitle)}</td></tr>` : ""}
      <tr>
        <th>Date Generated</th><td${recordCount === null ? ' colspan="3"' : ""}>${escapeHTML(generated)}</td>
        ${recordCount === null ? "" : `<th>Total Records</th><td>${recordCount}</td>`}
      </tr>
      <tr><th>Printed By</th><td colspan="3" class="rpt-by">${escapeHTML(byName)}</td></tr>
    </table>
  </header>
  ${bodyHTML}
  <div class="rpt-end">*** End of Report ***</div>
</body>
</html>`;

  const w = window.open("", "_blank", "width=1100,height=800");
  if (!w) {
    // eslint-disable-next-line no-alert
    alert(
      "Pop-up blocked. Please allow pop-ups for this site to print reports.",
    );
    return false;
  }
  w.document.write(html);
  w.document.close();
  w.focus();

  // Wait for the logo to load so it is never missing from the printout.
  let fired = false;
  const firePrint = () => {
    if (fired) return;
    fired = true;
    setTimeout(() => {
      if (!w.closed) w.print();
    }, 300);
  };
  const logoEl = w.document.querySelector("img.rpt-logo");
  if (logoEl && !logoEl.complete) {
    logoEl.addEventListener("load", firePrint);
    logoEl.addEventListener("error", () => {
      // A broken logo must not leave a broken-image icon on the report.
      logoEl.style.display = "none";
      firePrint();
    });
    setTimeout(firePrint, 3000);
  } else {
    firePrint();
  }
  return true;
};

/** Prints a table report (used by every admin list page). */
export const printReport = ({
  title,
  subtitle = "",
  columns,
  rows = [],
  emptyMessage = "No records to display.",
  dateFrom = "",
  dateTo = "",
  dateBasis = "",
}) => {
  const n = columns.length;
  const landscape = n > 6;
  const fontPt = n > 12 ? 7 : n > 9 ? 8 : n > 6 ? 9 : 10;

  const bodyHTML = rows.length
    ? `<table class="rpt-table">
        <thead><tr><th class="num">No.</th>${columns
          .map((c) => `<th>${escapeHTML(c.label)}</th>`)
          .join("")}</tr></thead>
        <tbody>${rows
          .map(
            (row, i) =>
              `<tr><td class="num">${i + 1}</td>${columns
                .map(
                  (c) =>
                    `<td>${escapeHTML(cellText(c, row)) || "&mdash;"}</td>`,
                )
                .join("")}</tr>`,
          )
          .join("")}</tbody>
      </table>`
    : `<div class="rpt-empty">${escapeHTML(emptyMessage)}</div>`;

  return printDocument({
    title,
    subtitle,
    dateFrom,
    dateTo,
    dateBasis,
    bodyHTML,
    recordCount: rows.length,
    landscape,
    fontPt,
  });
};
