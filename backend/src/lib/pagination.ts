// Phase 03 §4 — one place that owns page/pageSize semantics, so every list
// endpoint clamps, offsets, and reports metadata identically.
import type { PaginationMeta } from "../types/domain.js";

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export type { PaginationMeta };

export function clampPageSize(pageSize: number): number {
  return Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE);
}

export function skipFor(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

export function buildMeta(page: number, pageSize: number, totalItems: number): PaginationMeta {
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);
  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
