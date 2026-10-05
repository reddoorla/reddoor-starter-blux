import { describe, it, expect } from "vitest";
import { GRID_GUTTER, cellWidth, gridCellBasis } from "./layout";

/** `calc(A% - B%)` → [A, B]. */
const parseBasis = (basis: string) => {
  const m = /^calc\(([\d.]+)% - ([\d.]+)%\)$/.exec(basis);
  if (!m) throw new Error(`not a reserved basis: ${basis}`);
  return [Number(m[1]), Number(m[2])] as const;
};

describe("blux-catalog layout math", () => {
  it("cellWidth: explicit width wins, else equal split by column count", () => {
    expect(cellWidth("70%", 2)).toBe("70%");
    expect(cellWidth(undefined, 2)).toBe("50%");
    expect(cellWidth(undefined, 3)).toBe("33.3333%");
    expect(cellWidth(undefined, 1)).toBe("100%");
  });

  it("gridCellBasis: a row of k cells plus its gutters fills one line", () => {
    const rows: (string | undefined)[][] = [
      [undefined, undefined],
      [undefined, undefined, undefined],
      ["70%", "30%"],
    ];
    for (const widths of rows) {
      const k = widths.length;
      const row = widths
        .map((w) => parseBasis(gridCellBasis(w, k)))
        .reduce((sum, [width, reserve]) => sum + width - reserve, (k - 1) * GRID_GUTTER);
      expect(row, JSON.stringify(widths)).toBeLessThanOrEqual(100 + 1e-3);
      expect(row, JSON.stringify(widths)).toBeGreaterThanOrEqual(99.99);
    }
  });

  it("gridCellBasis: an explicit width keeps its share; a single column reserves nothing", () => {
    expect(parseBasis(gridCellBasis("70%", 2))[0]).toBe(70);
    expect(gridCellBasis(undefined, 1)).toBe("100%");
  });
});
