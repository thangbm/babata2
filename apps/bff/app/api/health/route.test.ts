import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns ok status", async () => {
    const response = GET();
    const json = await response.json();
    expect(json).toEqual({ status: "ok" });
  });
});
