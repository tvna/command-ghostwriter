import { describe, it, expect } from "vitest";
import { t } from "./i18n";

describe("i18n catalog", () => {
  it("has populated Japanese labels", () => {
    expect(t.download).toBe("ダウンロード");
    expect(t.settingsTitle).toBe("詳細設定");
    for (const value of Object.values(t)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });
});
