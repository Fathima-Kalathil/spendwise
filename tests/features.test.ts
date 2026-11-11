import { describe, expect, it } from "vitest";
import { retryAfterMs } from "@/lib/ratelimit";
import { csvCell, toCsv } from "@/lib/csv";
import { budgetStatus } from "@/lib/budget";

describe("login rate limiting", () => {
  const now = 1_000_000_000, min = 60_000, window = 15 * min;
  it("allows attempts until the limit is reached", () => {
    expect(retryAfterMs([now - 1 * min, now - 2 * min], 5, window, now)).toBe(0);
  });
  it("blocks after 5 recent failures and says how long to wait", () => {
    const times = [1, 2, 3, 4, 5].map((m) => now - m * min); // oldest failed 5 minutes ago
    expect(retryAfterMs(times, 5, window, now)).toBe(10 * min);
  });
  it("ignores failures older than the window", () => {
    const times = [20, 21, 22, 23, 24].map((m) => now - m * min);
    expect(retryAfterMs(times, 5, window, now)).toBe(0);
  });
});

describe("CSV export", () => {
  it("quotes commas, quotes and new lines", () => {
    expect(csvCell("Lunch, with friends")).toBe('"Lunch, with friends"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });
  it("stops spreadsheet formula injection", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell("@cmd")).toBe("'@cmd");
  });
  it("starts with a BOM and uses CRLF rows", () => {
    const out = toCsv([["a", "b"], ["₹5", 2]]);
    expect(out.startsWith("\uFEFF")).toBe(true);
    expect(out).toContain("a,b\r\n₹5,2\r\n");
  });
});

describe("budget status", () => {
  it("reports percentage, level and what is left", () => {
    expect(budgetStatus("500", "1000")).toMatchObject({ pct: 50, level: "ok" });
    expect(budgetStatus("800", "1000").level).toBe("warn");
    expect(budgetStatus("950", "1000").level).toBe("danger");
    const over = budgetStatus("1200.50", "1000");
    expect(over.level).toBe("over");
    expect(over.remaining.toString()).toBe("-200.5");
  });
});
