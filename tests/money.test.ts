import { describe, expect, it } from "vitest";
import { D, convertAmount, sumDecimals, isValidAmount, isValidRate } from "@/lib/money";
import { accountBalance } from "@/lib/balances";
import { parseCurrencyApi, parseErApi } from "@/lib/fx";
import { resolveRange } from "@/lib/dates";
import { formatMoney } from "@/lib/format";

describe("decimal-safe money", () => {
  it("does not suffer from floating point errors", () => {
    expect(0.1 + 0.2).not.toBe(0.3); // plain JS numbers
    expect(sumDecimals(["0.1", "0.2"]).toString()).toBe("0.3");
  });
  it("converts using the stored rate and rounds half up", () => {
    expect(convertAmount("100", "83.5").toString()).toBe("8350");
    expect(convertAmount("500", "22.7").toString()).toBe("11350");
    expect(convertAmount("0.00005", "1", 4).toString()).toBe("0.0001");
  });
  it("validates amounts and rates", () => {
    expect(isValidAmount("12.5")).toBe(true);
    expect(isValidAmount("0")).toBe(false);
    expect(isValidAmount("-5")).toBe(false);
    expect(isValidAmount("1.23456")).toBe(false);
    expect(isValidRate("22.70")).toBe(true);
    expect(isValidRate("abc")).toBe(false);
  });
});

describe("account balances stay in their own currency", () => {
  it("combines opening, income, expense and transfers", () => {
    const b = accountBalance({ opening: "1000", income: "500", expense: "200.50", transfersIn: "100", transfersOut: "50" });
    expect(b.toString()).toBe("1349.5");
  });
  it("cross-currency transfer keeps both sides exact", () => {
    // send 1000 AED, receive 22,700 INR -> rate 22.7
    const inr = accountBalance({ opening: "0", income: "0", expense: "0", transfersIn: "22700", transfersOut: "0" });
    const aed = accountBalance({ opening: "2000", income: "0", expense: "0", transfersIn: "0", transfersOut: "1000" });
    expect(inr.toString()).toBe("22700");
    expect(aed.toString()).toBe("1000");
    expect(D("22700").div("1000").toString()).toBe("22.7");
  });
});

describe("exchange rate parsing", () => {
  it("reads currency-api responses", () => {
    expect(parseCurrencyApi({ date: "2026-11-04", aed: { inr: 22.7 } }, "AED", "INR")).toBe("22.7");
    expect(parseCurrencyApi({ aed: {} }, "AED", "INR")).toBeNull();
    expect(parseCurrencyApi(null, "AED", "INR")).toBeNull();
  });
  it("reads open.er-api responses and rejects bad values", () => {
    expect(parseErApi({ result: "success", rates: { INR: 83.1 } }, "INR")).toBe("83.1");
    expect(parseErApi({ rates: { INR: 0 } }, "INR")).toBeNull();
  });
});

describe("date ranges and formatting", () => {
  const now = new Date(2026, 10, 4); // 4 Nov 2026 (Wednesday)
  it("resolves ranges", () => {
    expect(resolveRange("month", undefined, undefined, now)).toMatchObject({ from: "2026-11-01", to: "2026-11-04" });
    expect(resolveRange("lastmonth", undefined, undefined, now)).toMatchObject({ from: "2026-10-01", to: "2026-10-31" });
    expect(resolveRange("week", undefined, undefined, now)).toMatchObject({ from: "2026-11-02" });
    expect(resolveRange("custom", "2026-01-01", "2026-01-31", now)).toMatchObject({ from: "2026-01-01", to: "2026-01-31" });
  });
  it("formats currencies", () => {
    expect(formatMoney("50000", "INR")).toContain("50,000.00");
    expect(formatMoney("500", "AED")).toContain("500.00");
  });
});
