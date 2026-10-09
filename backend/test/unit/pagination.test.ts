import { describe, expect, it } from "vitest";
import {
  buildMeta,
  clampPageSize,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  skipFor,
} from "../../src/lib/pagination.js";

describe("pagination.ts (Phase 03 unit)", () => {
  it("documents sane defaults", () => {
    expect(DEFAULT_PAGE).toBe(1);
    expect(DEFAULT_PAGE_SIZE).toBe(20);
    expect(MAX_PAGE_SIZE).toBe(100);
  });

  it("clamps pageSize into [1, 100]", () => {
    expect(clampPageSize(0)).toBe(1);
    expect(clampPageSize(-5)).toBe(1);
    expect(clampPageSize(50)).toBe(50);
    expect(clampPageSize(101)).toBe(100);
    expect(clampPageSize(10_000)).toBe(MAX_PAGE_SIZE);
  });

  it("computes the Prisma skip offset", () => {
    expect(skipFor(1, 20)).toBe(0);
    expect(skipFor(2, 20)).toBe(20);
    expect(skipFor(3, 25)).toBe(50);
  });

  it("builds meta: empty, first, middle, and last pages", () => {
    expect(buildMeta(1, 20, 0)).toEqual({
      page: 1,
      pageSize: 20,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });

    expect(buildMeta(1, 20, 100)).toEqual({
      page: 1,
      pageSize: 20,
      totalItems: 100,
      totalPages: 5,
      hasNextPage: true,
      hasPreviousPage: false,
    });

    expect(buildMeta(3, 20, 100)).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: true,
    });

    expect(buildMeta(5, 20, 100)).toMatchObject({
      hasNextPage: false,
      hasPreviousPage: true,
    });

    // 21 items at size 20 → two pages, partial last page.
    expect(buildMeta(2, 20, 21).totalPages).toBe(2);
    expect(buildMeta(2, 20, 21).hasNextPage).toBe(false);
  });
});
