// Shared helpers for the "Print Report" and "Export CSV" actions used across
// the admin pages (ManageMotorcycle, ReturnInspection, ReviewManagement,
// SystemLog, MotorcycleBooking, DiscountManagement, MaintenancePage,
// AdminContact, UserManagement).
//
// columns shape: [{ key: "make", label: "Vehicle", value?: (row) => any }]
// - `key` reads row[key] directly.
// - optional `value(row)` lets a column derive/format its own text
//   (e.g. combining make + model, or formatting a date/currency).

const cellText = (col, row) => {
  const raw = typeof col.value === "function" ? col.value(row) : row[col.key];
  if (raw === undefined || raw === null || raw === "") return "";
  return String(raw);
};

// Escape a value for CSV: wrap in quotes and double up any internal quotes,
// so commas, quotes, and newlines inside data never break the file.
const csvCell = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;

export const buildCSV = (columns, rows) => {
  const header = columns.map((c) => csvCell(c.label)).join(",");
  const body = rows
    .map((row) => columns.map((c) => csvCell(cellText(c, row))).join(","))
    .join("\n");
  return rows.length ? [header, body].join("\n") : header;
};

/**
 * Downloads the given rows as a CSV file.
 * @param {string} filename  Base filename (".csv" appended if missing).
 * @param {Array}  columns   [{ key, label, value? }]
 * @param {Array}  rows      Array of plain objects (the currently
 *                           filtered/visible dataset for that page).
 */
export const downloadCSV = (filename, columns, rows) => {
  const csv = buildCSV(columns, rows || []);
  // UTF-8 BOM so Excel auto-detects encoding correctly.
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
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

/**
 * Opens a clean, print-formatted report of the given rows in a new window
 * and triggers the browser's print dialog. Only the report itself is in
 * that window, so navigation, sidebars, filters, and action buttons never
 * appear in the printed output.
 * @param {Object} opts
 * @param {string} opts.title     Report title (also used as the doc title).
 * @param {string} [opts.subtitle] Small badge, e.g. active filter summary.
 * @param {Array}  opts.columns   [{ key, label, value? }]
 * @param {Array}  opts.rows      Rows to print.
 * @param {string} [opts.emptyMessage]
 */
export const printReport = ({
  title,
  subtitle = "",
  columns,
  rows = [],
  emptyMessage = "No records to display.",
}) => {
  const escapeHTML = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const tableHTML = rows.length
    ? `<table>
        <thead><tr>${columns.map((c) => `<th>${escapeHTML(c.label)}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows
            .map(
              (row) =>
                `<tr>${columns
                  .map((c) => `<td>${escapeHTML(cellText(c, row)) || "&mdash;"}</td>`)
                  .join("")}</tr>`,
            )
            .join("")}
        </tbody>
      </table>`
    : `<p class="empty">${escapeHTML(emptyMessage)}</p>`;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${escapeHTML(title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; color: #171717; padding: 32px; font-size: 12px; }
  .report-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 2px solid #b50002; }
  .report-header h1 { font-size: 19px; font-weight: 800; }
  .report-header p { font-size: 11px; color: #888; margin-top: 4px; }
  .badge { display: inline-block; background: #fef2f2; color: #b50002; border: 1px solid #fecaca; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 700; white-space: nowrap; max-width: 320px; text-align: right; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #f8fafc; }
  th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #f1f5f9; font-size: 11px; vertical-align: top; }
  th { font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
  tbody tr:nth-child(even) { background: #fafafa; }
  .empty { padding: 24px 0; text-align: center; color: #94a3b8; font-style: italic; }
  .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
  @media print {
    body { padding: 16px; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="report-header">
    <div>
      <h1>${escapeHTML(title)}</h1>
      <p>Generated ${new Date().toLocaleString("en-PH", { dateStyle: "long", timeStyle: "short" })}</p>
    </div>
    ${subtitle ? `<span class="badge">${escapeHTML(subtitle)}</span>` : ""}
  </div>
  ${tableHTML}
  <div class="footer">Anaia Motorcycle Rental &nbsp;&middot;&nbsp; ${rows.length} record${rows.length === 1 ? "" : "s"} &nbsp;&middot;&nbsp; Confidential</div>
</body>
</html>`;

  const w = window.open("", "_blank", "width=1100,height=800");
  if (!w) {
    // Popup blocked — surface this instead of failing silently.
    // eslint-disable-next-line no-alert
    alert("Pop-up blocked. Please allow pop-ups for this site to print reports.");
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
};
