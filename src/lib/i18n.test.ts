import { describe, it, expect } from "vitest";
import { t } from "@/lib/i18n";

describe("i18n shim t()", () => {
  it("returns fallback when provided", () => {
    expect(t("dashboard.title", "Dashboard")).toBe("Dashboard");
  });

  it("returns fallback for another key", () => {
    expect(t("nav.deals", "Deals")).toBe("Deals");
  });

  it("returns the key itself when no fallback is provided", () => {
    expect(t("some.key")).toBe("some.key");
  });
});
