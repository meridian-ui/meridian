import { describe, test, expect } from "vitest";
import { toTitleCase, uuid } from "../utils.helper";

describe("toTitleCase", () => {
  test("should capitalize first letter of each word", () => {
    expect(toTitleCase("hello world")).toBe("Hello World");
  });

  test("should replace hyphens with spaces and capitalize", () => {
    expect(toTitleCase("key-attribute")).toBe("Key Attribute");
    expect(toTitleCase("side-by-side")).toBe("Side By Side");
  });

  test("should replace underscores with spaces and capitalize", () => {
    expect(toTitleCase("some_value")).toBe("Some Value");
    expect(toTitleCase("my_long_name")).toBe("My Long Name");
  });

  test("should handle mixed separators", () => {
    expect(toTitleCase("this-is_mixed")).toBe("This Is Mixed");
  });

  test("should handle single word", () => {
    expect(toTitleCase("title")).toBe("Title");
  });

  test("should handle already-capitalized text", () => {
    expect(toTitleCase("Already Good")).toBe("Already Good");
  });

  test("should handle empty string", () => {
    expect(toTitleCase("")).toBe("");
  });
});

describe("uuid", () => {
  test("should return a string matching UUID v4 format", () => {
    const id = uuid();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  test("should generate unique values on successive calls", () => {
    const ids = new Set(Array.from({ length: 50 }, () => uuid()));
    expect(ids.size).toBe(50);
  });

  test("should always have version 4 indicator", () => {
    for (let i = 0; i < 20; i++) {
      const id = uuid();
      expect(id[14]).toBe("4");
    }
  });

  test("should always have correct variant bits (8, 9, a, or b)", () => {
    for (let i = 0; i < 20; i++) {
      const id = uuid();
      expect(["8", "9", "a", "b"]).toContain(id[19]);
    }
  });
});
