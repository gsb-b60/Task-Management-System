import { describe, expect, it } from "vitest";
import { parseOrigins } from "../../src/config/env.js";

describe("parseOrigins", () => {
  it("returns a single origin as a one-element list", () => {
    expect(parseOrigins("http://localhost:5173")).toEqual([
      "http://localhost:5173",
    ]);
  });

  it("splits a comma-separated allow-list", () => {
    expect(
      parseOrigins("http://localhost:8080,http://localhost:8000"),
    ).toEqual(["http://localhost:8080", "http://localhost:8000"]);
  });

  it("trims whitespace around each origin", () => {
    expect(parseOrigins(" http://a.test , http://b.test ")).toEqual([
      "http://a.test",
      "http://b.test",
    ]);
  });

  it("drops empty segments from stray commas", () => {
    expect(parseOrigins("http://a.test,,http://b.test,")).toEqual([
      "http://a.test",
      "http://b.test",
    ]);
  });

  it("returns an empty list for an empty string", () => {
    expect(parseOrigins("")).toEqual([]);
  });
});
