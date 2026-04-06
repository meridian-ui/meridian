import { describe, test, expect } from "vitest";
import { isAttributeType, isRole, convertFetchedODIToODI, ViewType } from "../spec.helper";
import { makeValueAttr, makeGroupAttr } from "../../renderer/__fixtures__/items.fixture";
import { makeFetchedODI, makeFetchedODIWithDetails, phoneBinding } from "../../renderer/__fixtures__/odi.fixture";

describe("isAttributeType", () => {
  test("should return true for a value attribute (has `value` property)", () => {
    const attr = makeValueAttr({ value: "hello" });
    expect(isAttributeType(attr)).toBe(true);
  });

  test("should return true for a value attribute with undefined value", () => {
    const attr = makeValueAttr({ value: undefined });
    // `value` key exists in the object, so "value" in attr is true
    expect(isAttributeType(attr)).toBe(true);
  });

  test("should return false for a group attribute (no `value` property)", () => {
    const attr = makeGroupAttr({ attributes: [makeValueAttr()] });
    expect(isAttributeType(attr)).toBe(false);
  });

  test("should return false for null", () => {
    expect(isAttributeType(null)).toBe(false);
  });
});

describe("isRole", () => {
  const validRoles = [
    "title", "subtitle", "description", "key-attribute",
    "action", "link", "tag", "badge",
    "thumbnail", "caption", "spec", "footer",
  ];

  test.each(validRoles)("should return true for known role '%s'", (role) => {
    expect(isRole(role)).toBe(true);
  });

  test("should return false for unknown strings", () => {
    expect(isRole("custom-role")).toBe(false);
    expect(isRole("unknown")).toBe(false);
    expect(isRole("")).toBe(false);
  });

  test("should return false for role-like but wrong casing", () => {
    expect(isRole("Title")).toBe(false);
    expect(isRole("SUBTITLE")).toBe(false);
  });
});

describe("convertFetchedODIToODI", () => {
  test("should strip items from dataBinding and overviews", () => {
    const fetchedODI = makeFetchedODI();
    const odi = convertFetchedODIToODI(fetchedODI);

    // dataBinding should preserve binding but not items
    expect(odi.dataBinding).toHaveLength(1);
    expect(odi.dataBinding[0].binding.itemId).toBe(phoneBinding.itemId);
    expect(odi.dataBinding[0].binding.attributes).toEqual(phoneBinding.attributes);
    expect((odi.dataBinding[0] as any).items).toBeUndefined();

    // overviews should be present without items
    expect(odi.overviews).toHaveLength(1);
    expect(odi.overviews[0].type).toBe("list");
    expect(odi.overviews[0].items).toBeUndefined();
  });

  test("should preserve malleability settings", () => {
    const fetchedODI = makeFetchedODI({
      malleability: { disabled: false, content: { disabled: false, types: ["toggle"] } },
    });
    const odi = convertFetchedODIToODI(fetchedODI);
    expect(odi.malleability).toEqual(fetchedODI.malleability);
  });

  test("should handle detailViews including string references", () => {
    const fetchedODI = makeFetchedODIWithDetails();
    const odi = convertFetchedODIToODI(fetchedODI);

    expect(odi.detailViews).toBeDefined();
    expect(odi.detailViews!.length).toBeGreaterThan(0);
    const detail = odi.detailViews![0];
    if (typeof detail !== "string") {
      expect(detail.items).toBeUndefined();
      expect(detail.type).toBe("basic");
    }
  });

  test("should return empty ODI-like object for falsy input", () => {
    const odi = convertFetchedODIToODI(null as any);
    expect(odi).toEqual({});
  });

  test("should preserve binding pathToItems and internalAttributes", () => {
    const fetchedODI = makeFetchedODI({
      dataBinding: [
        {
          id: "src-1",
          binding: {
            itemId: ".itemId",
            pathToItems: ".results",
            attributes: [{ value: ".name", roles: ["title"] }],
            internalAttributes: [{ id: "lat", value: ".lat" }],
          },
          items: [],
        },
      ],
    });
    const odi = convertFetchedODIToODI(fetchedODI);

    expect(odi.dataBinding[0].id).toBe("src-1");
    expect(odi.dataBinding[0].binding.pathToItems).toBe(".results");
    expect(odi.dataBinding[0].binding.internalAttributes).toEqual([
      { id: "lat", value: ".lat" },
    ]);
  });
});
