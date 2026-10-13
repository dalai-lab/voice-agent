import { describe, expect, it } from "vitest";

import { formatJsonString } from "../formatJson";

describe("formatJsonString", () => {
  it("formats unformatted JSON with 2-space indentation", () => {
    const raw = "{\"nodes\":[],\"edges\":[]}";
    const result = formatJsonString(raw);
    expect(result.error).toBeNull();
    expect(result.changed).toBe(true);
    expect(result.formatted).toBe("{\n  \"nodes\": [],\n  \"edges\": []\n}");
  });

  it("recognizes already formatted JSON and marks changed as false", () => {
    const raw = "{\n  \"nodes\": [],\n  \"edges\": []\n}";
    const result = formatJsonString(raw);
    expect(result.error).toBeNull();
    expect(result.changed).toBe(false);
    expect(result.formatted).toBe(raw);
  });

  it("handles empty or whitespace strings without error", () => {
    const result = formatJsonString("   ");
    expect(result.error).toBeNull();
    expect(result.changed).toBe(false);
    expect(result.formatted).toBe("   ");
  });

  it("gracefully catches syntax errors without throwing or wiping text", () => {
    const broken = "{\"nodes\": [";
    const result = formatJsonString(broken);
    expect(result.error).not.toBeNull();
    expect(result.changed).toBe(false);
    expect(result.formatted).toBe(broken);
  });
});
