import { describe, expect, it } from "vitest";
import { buildMeta, clampPageSize, skipFor } from "../../src/lib/pagination.js";

describe("clampPageSize", () => {
  it("clamps into [1, 100]", () => {
    expect(clampPageSize(0)).toBe(1);
    expect(clampPageSize(-5)).toBe(1);
    expect(clampPageSize(20)).toBe(20);
    expect(clampPageSize(100)).toBe(100);
    expect(clampPageSize(101)).toBe(100);
    expect(clampPageSize(500)).toBe(100);
  });
});

describe("skipFor", () => {
  it("computes 1-indexed offsets", () => {
    expect(skipFor(1, 20)).toBe(0);
    expect(skipFor(2, 20)).toBe(20);
    expect(skipFor(3, 7)).toBe(14);
  });
});

describe("buildMeta", () => {
  it("reports an empty list as zero pages with no navigation", () => {
    expect(buildMeta(1, 20, 0)).toEqual({
      page: 1,
      pageSize: 20,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it("reports a middle page correctly", () => {
    expect(buildMeta(2, 20, 45)).toEqual({
      page: 2,
      pageSize: 20,
      totalItems: 45,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it("reports the last page with no next page", () => {
    const meta = buildMeta(3, 20, 45);
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPreviousPage).toBe(true);
    expect(meta.totalPages).toBe(3);
  });
});
