/** One CSV cell. Text starting with = + - @ is prefixed so Excel can't run it as a formula. */
export function csvCell(v: string | number | null | undefined): string {
  let s = v == null ? "" : String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Rows -> CSV text. The BOM makes Excel read ₹ and other symbols correctly. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
