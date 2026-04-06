import { describe, test, expect, vi } from "vitest";
import {
  resolveValue,
  evaluateCondition,
  applyTransform,
  evalFilter,
  mapAttributes,
  mapDataToFetchedItems,
  getFetchedODIFromData,
} from "../renderer.data-bind";
import { AttributeConditionType, AttributeTransformType, AttributeType } from "../../spec/spec";
import { phoneRawData, hotelRawData } from "../__fixtures__/items.fixture";
import {
  phoneBinding,
  phoneBindingWithTransforms,
  phoneBindingWithConditions,
  hotelBinding,
  makeODI,
  makeODIWithDetails,
} from "../__fixtures__/odi.fixture";

describe("resolveValue", () => {
  const testData = {
    id: "test-id",
    type: "test-type",
    name: "Test Item",
    items: [
      {
        title: "First Item",
        value: "value-1",
        description: "First description",
      },
      {
        title: "Second Item",
        value: "value-2",
        description: "Second description",
      },
    ],
    tags: ["tag-1", "tag-2", "tag-3"],
    metadata: {
      category: "test-category",
      priority: "high",
    },
  };

  describe("Basic property access", () => {
    test("should resolve simple property", () => {
      expect(resolveValue(testData, ".")).toBe(testData);
      expect(resolveValue(testData, ".name")).toBe("Test Item");
      expect(resolveValue(testData, ".type")).toBe("test-type");
      expect(resolveValue(testData, ".id")).toBe("test-id");
      expect(resolveValue(testData, ".items")).toEqual([
        {
          title: "First Item",
          value: "value-1",
          description: "First description",
        },
        {
          title: "Second Item",
          value: "value-2",
          description: "Second description",
        },
      ]);
      expect(resolveValue(testData, ".tags")).toEqual([
        "tag-1",
        "tag-2",
        "tag-3",
      ]);
      expect(resolveValue(testData, ".metadata")).toEqual({
        category: "test-category",
        priority: "high",
      });
    });

    test("should resolve array element by index", () => {
      expect(resolveValue(testData, ".items[0]")).toEqual({
        title: "First Item",
        value: "value-1",
        description: "First description",
      });
      expect(resolveValue(testData, ".items[1]")).toEqual({
        title: "Second Item",
        value: "value-2",
        description: "Second description",
      });
    });

    test("should resolve nested property in array element", () => {
      expect(resolveValue(testData, ".items[0].title")).toBe("First Item");
      expect(resolveValue(testData, ".items[0].value")).toBe("value-1");
      expect(resolveValue(testData, ".items[1].description")).toBe(
        "Second description"
      );
    });

    test("should resolve tags array", () => {
      expect(resolveValue(testData, ".tags[0]")).toBe("tag-1");
      expect(resolveValue(testData, ".tags[1]")).toBe("tag-2");
      expect(resolveValue(testData, ".tags[2]")).toBe("tag-3");
    });

    test("should resolve nested property", () => {
      expect(resolveValue(testData, ".metadata.category")).toBe(
        "test-category"
      );
      expect(resolveValue(testData, ".metadata.priority")).toBe("high");
    });
  });

  describe("Edge cases", () => {
    test("should handle undefined path", () => {
      expect(resolveValue(testData, undefined)).toBeUndefined();
    });

    test("should handle empty string path", () => {
      expect(resolveValue(testData, "")).toBeUndefined();
    });

    test("should handle non-string path", () => {
      expect(resolveValue(testData, null as any)).toBeUndefined();
      expect(resolveValue(testData, 123 as any)).toBeUndefined();
    });

    test("should handle non-existent property", () => {
      expect(resolveValue(testData, ".nonExistent")).toBeUndefined();
      expect(resolveValue(testData, ".items[999]")).toBeUndefined();
    });

    test("should handle non-array access with brackets", () => {
      expect(resolveValue(testData, ".name[0]")).toBeNull();
    });

    test("should handle null/undefined intermediate values", () => {
      const dataWithNull = { nested: null };
      expect(resolveValue(dataWithNull, ".nested.property")).toBeUndefined();
    });
  });
});

// ── evaluateCondition ────────────────────────────────────────────────

describe("evaluateCondition", () => {
  const item = {
    type: "product",
    brand: "Apple",
    rating: 4.2,
    reviews: 8540,
    price: 1199.99,
    inStock: true,
    tags: ["phone", "flagship"],
  };

  describe("exists", () => {
    test("should return true when field exists and is truthy", () => {
      expect(evaluateCondition(item, { exists: ".brand" })).toBe(true);
    });

    test("should return false when field does not exist", () => {
      expect(evaluateCondition(item, { exists: ".nonExistent" })).toBe(false);
    });

    test("should return false when field is falsy (0, empty string)", () => {
      expect(evaluateCondition({ val: 0 }, { exists: ".val" })).toBe(false);
      expect(evaluateCondition({ val: "" }, { exists: ".val" })).toBe(false);
    });
  });

  describe("comparison operators", () => {
    test("== should match loosely", () => {
      expect(
        evaluateCondition(item, {
          comparison: { field: ".type", operator: "==", value: "product" },
        })
      ).toBe(true);
      expect(
        evaluateCondition(item, {
          comparison: { field: ".type", operator: "==", value: "ad" },
        })
      ).toBe(false);
    });

    test("!= should negate loose equality", () => {
      expect(
        evaluateCondition(item, {
          comparison: { field: ".type", operator: "!=", value: "ad" },
        })
      ).toBe(true);
      expect(
        evaluateCondition(item, {
          comparison: { field: ".type", operator: "!=", value: "product" },
        })
      ).toBe(false);
    });

    test("> should compare numerically", () => {
      expect(
        evaluateCondition(item, {
          comparison: { field: ".rating", operator: ">", value: 4.0 },
        })
      ).toBe(true);
      expect(
        evaluateCondition(item, {
          comparison: { field: ".rating", operator: ">", value: 4.2 },
        })
      ).toBe(false);
    });

    test("< should compare numerically", () => {
      expect(
        evaluateCondition(item, {
          comparison: { field: ".rating", operator: "<", value: 5.0 },
        })
      ).toBe(true);
      expect(
        evaluateCondition(item, {
          comparison: { field: ".rating", operator: "<", value: 4.0 },
        })
      ).toBe(false);
    });

    test(">= should compare numerically", () => {
      expect(
        evaluateCondition(item, {
          comparison: { field: ".rating", operator: ">=", value: 4.2 },
        })
      ).toBe(true);
      expect(
        evaluateCondition(item, {
          comparison: { field: ".rating", operator: ">=", value: 4.3 },
        })
      ).toBe(false);
    });

    test("<= should compare numerically", () => {
      expect(
        evaluateCondition(item, {
          comparison: { field: ".rating", operator: "<=", value: 4.2 },
        })
      ).toBe(true);
      expect(
        evaluateCondition(item, {
          comparison: { field: ".rating", operator: "<=", value: 4.1 },
        })
      ).toBe(false);
    });

    test("should handle undefined field value gracefully", () => {
      // .missing resolves to undefined; undefined != "product" → true in JS
      expect(
        evaluateCondition(item, {
          comparison: { field: ".missing", operator: "!=", value: "product" },
        })
      ).toBe(true);
    });
  });

  describe("and / or / not nesting", () => {
    test("and: all must pass", () => {
      expect(
        evaluateCondition(item, {
          and: [
            { comparison: { field: ".type", operator: "==", value: "product" } },
            { comparison: { field: ".rating", operator: ">", value: 4.0 } },
          ],
        })
      ).toBe(true);
    });

    test("and: fails if any sub-condition fails", () => {
      expect(
        evaluateCondition(item, {
          and: [
            { comparison: { field: ".type", operator: "==", value: "product" } },
            { comparison: { field: ".rating", operator: ">", value: 5.0 } },
          ],
        })
      ).toBe(false);
    });

    test("or: passes if any sub-condition passes", () => {
      expect(
        evaluateCondition(item, {
          or: [
            { comparison: { field: ".type", operator: "==", value: "ad" } },
            { comparison: { field: ".type", operator: "==", value: "product" } },
          ],
        })
      ).toBe(true);
    });

    test("or: fails if all sub-conditions fail", () => {
      expect(
        evaluateCondition(item, {
          or: [
            { comparison: { field: ".type", operator: "==", value: "ad" } },
            { comparison: { field: ".type", operator: "==", value: "banner" } },
          ],
        })
      ).toBe(false);
    });

    test("not: passes when sub-condition is false", () => {
      expect(
        evaluateCondition(item, {
          not: [{ comparison: { field: ".type", operator: "==", value: "ad" } }],
        })
      ).toBe(true);
    });

    test("not: fails when sub-condition is true", () => {
      expect(
        evaluateCondition(item, {
          not: [{ comparison: { field: ".type", operator: "==", value: "product" } }],
        })
      ).toBe(false);
    });

    test("deeply nested: and containing or with not", () => {
      expect(
        evaluateCondition(item, {
          and: [
            {
              or: [
                { comparison: { field: ".type", operator: "==", value: "product" } },
                { comparison: { field: ".type", operator: "==", value: "ad" } },
              ],
            },
            {
              not: [{ comparison: { field: ".rating", operator: "<", value: 1.0 } }],
            },
          ],
        })
      ).toBe(true);
    });
  });

  describe("combined top-level conditions", () => {
    test("exists + comparison both evaluated (AND logic)", () => {
      // exists passes AND comparison passes → true
      expect(
        evaluateCondition(item, {
          exists: ".brand",
          comparison: { field: ".type", operator: "==", value: "product" },
        })
      ).toBe(true);

      // exists fails → false even though comparison would pass
      expect(
        evaluateCondition(item, {
          exists: ".missing",
          comparison: { field: ".type", operator: "==", value: "product" },
        })
      ).toBe(false);
    });
  });

  test("empty condition object should return true", () => {
    expect(evaluateCondition(item, {})).toBe(true);
  });
});

// ── evalFilter ───────────────────────────────────────────────────────

describe("evalFilter", () => {
  test("should evaluate a simple truthy expression", () => {
    expect(evalFilter("datum.price > 100", { price: 200 })).toBe(true);
    expect(evalFilter("datum.price > 100", { price: 50 })).toBe(false);
  });

  test("should evaluate string comparison", () => {
    expect(evalFilter('datum.type === "product"', { type: "product" })).toBe(true);
    expect(evalFilter('datum.type === "product"', { type: "ad" })).toBe(false);
  });

  test("should return false for malformed expressions", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(evalFilter("invalid!!syntax", { x: 1 })).toBe(false);
    spy.mockRestore();
  });

  test("should return false when accessing undefined property", () => {
    expect(evalFilter("datum.nonExistent > 0", { x: 1 })).toBe(false);
  });

  test("should work with boolean fields", () => {
    expect(evalFilter("datum.active", { active: true })).toBe(true);
    expect(evalFilter("datum.active", { active: false })).toBe(false);
  });
});

// ── applyTransform ───────────────────────────────────────────────────

describe("applyTransform", () => {
  const item = {
    title: "iPhone 16 Pro Max",
    features: ["Action button", "A18 Pro", "48MP camera"],
    colors: [
      { name: "Desert Titanium", hex: "#B79A86" },
      { name: "Natural Titanium", hex: "#C4C0B7" },
    ],
    capacity: [
      { capacity: "256 GB", price: 33.34 },
      { capacity: "512 GB", price: 40.0 },
    ],
    price: 1199.99,
    rating: 4.2,
    type: "product",
    details: { category: "phone" },
  };

  describe("t.value transform", () => {
    test("should replace value with resolved path", () => {
      const transforms: AttributeTransformType[] = [{ value: ".title" }];
      expect(applyTransform(null, transforms, item)).toBe("iPhone 16 Pro Max");
    });

    test("should resolve nested path", () => {
      const transforms: AttributeTransformType[] = [{ value: ".details.category" }];
      expect(applyTransform(null, transforms, item)).toBe("phone");
    });
  });

  describe("t.map with string path", () => {
    test("should map array elements with '.' (identity)", () => {
      const transforms: AttributeTransformType[] = [{ map: "." }];
      const result = applyTransform(item.features, transforms, item);
      expect(result).toEqual(["Action button", "A18 Pro", "48MP camera"]);
    });

    test("should map array elements by sub-path", () => {
      const transforms: AttributeTransformType[] = [{ map: ".name" }];
      const result = applyTransform(item.colors, transforms, item);
      expect(result).toEqual(["Desert Titanium", "Natural Titanium"]);
    });

    test("should resolve single value (non-array) with '.'", () => {
      const transforms: AttributeTransformType[] = [{ map: "." }];
      expect(applyTransform("hello", transforms, item)).toBe("hello");
    });

    test("should resolve single value with sub-path", () => {
      const transforms: AttributeTransformType[] = [{ map: ".category" }];
      expect(applyTransform(item.details, transforms, item)).toBe("phone");
    });
  });

  describe("t.map with object (attributes)", () => {
    test("should map array elements through attribute definitions", () => {
      const transforms: AttributeTransformType[] = [
        {
          map: {
            attributes: [
              { value: ".capacity", roles: ["title"] },
              { value: ".price", roles: ["key-attribute"], type: "price" },
            ],
          },
        },
      ];
      const result = applyTransform(item.capacity, transforms, item);
      expect(result).toHaveLength(2);
      // Each element should have an `attributes` array from mapAttributes
      expect(result[0]).toHaveProperty("attributes");
      expect(result[0].attributes).toHaveLength(2);
      // First attribute should have resolved value "256 GB"
      expect(result[0].attributes[0]).toMatchObject({
        value: "256 GB",
        roles: ["title"],
      });
    });

    test("should handle single object (non-array) with attribute mapping", () => {
      const transforms: AttributeTransformType[] = [
        {
          map: {
            attributes: [{ value: ".name" }, { value: ".hex" }],
          },
        },
      ];
      const result = applyTransform(item.colors[0], transforms, item);
      // Single object returns mapAttributes result directly (array of FetchedAttributeType)
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toMatchObject({ value: "Desert Titanium" });
    });
  });

  describe("t.filter with string expression", () => {
    test("should filter array using string expression", () => {
      const transforms: AttributeTransformType[] = [
        { filter: "datum.price > 35" },
      ];
      const result = applyTransform(item.capacity, transforms, item);
      expect(result).toHaveLength(1);
      expect(result[0].capacity).toBe("512 GB");
    });

    test("should return empty array when nothing matches", () => {
      const transforms: AttributeTransformType[] = [
        { filter: "datum.price > 9999" },
      ];
      const result = applyTransform(item.capacity, transforms, item);
      expect(result).toEqual([]);
    });
  });

  describe("t.filter with condition object", () => {
    test("should filter using AttributeConditionType", () => {
      const transforms: AttributeTransformType[] = [
        {
          filter: {
            comparison: { field: ".name", operator: "==", value: "Desert Titanium" },
          },
        },
      ];
      const result = applyTransform(item.colors, transforms, item);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Desert Titanium");
    });
  });

  describe("t.slice", () => {
    test("should slice array with start and end", () => {
      const transforms: AttributeTransformType[] = [
        { slice: { start: 0, end: 2 } },
      ];
      const result = applyTransform(item.features, transforms, item);
      expect(result).toEqual(["Action button", "A18 Pro"]);
    });

    test("should slice with only start (to end of array)", () => {
      const transforms: AttributeTransformType[] = [
        { slice: { start: 1 } },
      ];
      const result = applyTransform(item.features, transforms, item);
      expect(result).toEqual(["A18 Pro", "48MP camera"]);
    });

    test("should default start to 0 if omitted", () => {
      const transforms: AttributeTransformType[] = [
        { slice: { end: 1 } },
      ];
      const result = applyTransform(item.features, transforms, item);
      expect(result).toEqual(["Action button"]);
    });
  });

  describe("chained transforms", () => {
    test("should apply map then slice", () => {
      const transforms: AttributeTransformType[] = [
        { map: ".name" },
        { slice: { start: 0, end: 1 } },
      ];
      const result = applyTransform(item.colors, transforms, item);
      expect(result).toEqual(["Desert Titanium"]);
    });

    test("should apply value then map", () => {
      const transforms: AttributeTransformType[] = [
        { value: ".colors" },
        { map: ".hex" },
      ];
      const result = applyTransform(null, transforms, item);
      expect(result).toEqual(["#B79A86", "#C4C0B7"]);
    });

    test("should apply filter then slice", () => {
      const transforms: AttributeTransformType[] = [
        { filter: "datum.price < 40" },
        { slice: { start: 0, end: 1 } },
      ];
      const result = applyTransform(item.capacity, transforms, item);
      expect(result).toHaveLength(1);
      expect(result[0].capacity).toBe("256 GB");
    });
  });

  describe("edge cases", () => {
    test("should handle empty transforms array (no-op)", () => {
      expect(applyTransform("hello", [], item)).toBe("hello");
    });

    test("should handle filter on non-array (no-op)", () => {
      const transforms: AttributeTransformType[] = [{ filter: "datum > 5" }];
      expect(applyTransform("not-array", transforms, item)).toBe("not-array");
    });

    test("should handle slice on non-array (no-op)", () => {
      const transforms: AttributeTransformType[] = [{ slice: { start: 0, end: 1 } }];
      expect(applyTransform("not-array", transforms, item)).toBe("not-array");
    });

    test("should handle null transformed with map attributes (no-op for null)", () => {
      const transforms: AttributeTransformType[] = [
        { map: { attributes: [{ value: ".x" }] } },
      ];
      const result = applyTransform(null, transforms, item);
      expect(result).toBeNull();
    });
  });
});

// ── mapAttributes ────────────────────────────────────────────────────

describe("mapAttributes", () => {
  const item = {
    id: "iphone-16-pro-max",
    title: "iPhone 16 Pro Max",
    brand: "Apple",
    description: "Built for Apple Intelligence.",
    rating: 4.2,
    type: "product",
    features: ["Action button", "A18 Pro chip"],
  };

  test("should map simple value attributes", () => {
    const attrs: AttributeType[] = [
      { value: ".title", roles: ["title"] },
      { value: ".brand", roles: ["subtitle"] },
    ];
    const result = mapAttributes(item, 0, attrs);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ value: "iPhone 16 Pro Max", roles: ["title"] });
    expect(result[1]).toMatchObject({ value: "Apple", roles: ["subtitle"] });
  });

  test("should assign sequential IDs based on index", () => {
    const attrs: AttributeType[] = [
      { value: ".title" },
      { value: ".brand" },
      { value: ".description" },
    ];
    const result = mapAttributes(item, 0, attrs);
    expect(result[0]).toMatchObject({ id: "0", index: 0 });
    expect(result[1]).toMatchObject({ id: "1", index: 1 });
    expect(result[2]).toMatchObject({ id: "2", index: 2 });
  });

  test("should use parentId as prefix for IDs", () => {
    const attrs: AttributeType[] = [{ value: ".title" }, { value: ".brand" }];
    const result = mapAttributes(item, 0, attrs, "parent");
    expect(result[0]).toMatchObject({ id: "parent-0" });
    expect(result[1]).toMatchObject({ id: "parent-1" });
  });

  test("should create group for nested attributes", () => {
    const attrs: AttributeType[] = [
      {
        label: "Details",
        attributes: [
          { value: ".title", roles: ["title"] },
          { value: ".brand", roles: ["subtitle"] },
        ],
      },
    ];
    const result = mapAttributes(item, 0, attrs);
    expect(result).toHaveLength(1);
    const group = result[0] as any;
    expect(group.attributes).toHaveLength(2);
    expect(group.label).toBe("Details");
    expect(group.attributes[0]).toMatchObject({ value: "iPhone 16 Pro Max" });
  });

  test("should skip attributes when condition fails", () => {
    const attrs: AttributeType[] = [
      {
        condition: { comparison: { field: ".type", operator: "==", value: "ad" } },
        attributes: [{ value: ".title", roles: ["title"] }],
      },
      {
        condition: { comparison: { field: ".type", operator: "==", value: "product" } },
        attributes: [{ value: ".brand", roles: ["subtitle"] }],
      },
    ];
    const result = mapAttributes(item, 0, attrs);
    // Only the product condition passes
    expect(result).toHaveLength(1);
    const group = result[0] as any;
    expect(group.attributes[0]).toMatchObject({ value: "Apple" });
  });

  test("should handle features with map '.' transform as group", () => {
    const attrs: AttributeType[] = [
      {
        value: ".features",
        roles: ["features", "spec"],
        transform: [{ map: "." }],
      },
    ];
    const result = mapAttributes(item, 0, attrs);
    // Features with map '.' creates a group with individual feature items
    expect(result).toHaveLength(1);
    const group = result[0] as any;
    expect(group.attributes).toHaveLength(2);
    expect(group.attributes[0]).toMatchObject({ value: "Action button" });
    expect(group.attributes[1]).toMatchObject({ value: "A18 Pro chip" });
  });

  test("should handle transform with object map (capacity example)", () => {
    const itemWithCap = {
      ...item,
      capacity: [
        { capacity: "256 GB", price: 33.34 },
        { capacity: "512 GB", price: 40.0 },
      ],
    };
    const attrs: AttributeType[] = [
      {
        value: ".capacity",
        transform: [
          {
            map: {
              attributes: [
                { value: ".capacity", roles: ["title"] },
                { value: ".price", type: "price" },
              ],
            },
          },
        ],
      },
    ];
    const result = mapAttributes(itemWithCap, 0, attrs);
    expect(result).toHaveLength(1);
    const group = result[0] as any;
    // Should be a group because the mapped result has `attributes`
    expect(group.attributes).toHaveLength(2);
    expect(group.attributes[0].attributes[0]).toMatchObject({ value: "256 GB" });
  });

  test("should set itemIndex on all attributes", () => {
    const attrs: AttributeType[] = [{ value: ".title" }];
    const result = mapAttributes(item, 5, attrs);
    expect(result[0]).toMatchObject({ itemIndex: 5 });
  });

  test("should return empty array for empty attributes input", () => {
    expect(mapAttributes(item, 0, [])).toEqual([]);
  });

  test("should preserve label and type on value attributes", () => {
    const attrs: AttributeType[] = [
      { value: ".rating", label: "Rating", type: "number", roles: ["key-attribute"] },
    ];
    const result = mapAttributes(item, 0, attrs);
    expect(result[0]).toMatchObject({
      label: "Rating",
      type: "number",
      value: 4.2,
      roles: ["key-attribute"],
    });
  });

  test("should handle attribute with no value path (fallback)", () => {
    const attrs: AttributeType[] = [{ label: "Static", roles: ["tag"] }];
    const result = mapAttributes(item, 0, attrs);
    // When value path is empty string, resolveValue returns the item itself or undefined
    expect(result[0]).toMatchObject({ label: "Static", roles: ["tag"] });
  });

  test("should handle deeply nested groups", () => {
    const attrs: AttributeType[] = [
      {
        label: "Outer",
        attributes: [
          {
            label: "Inner",
            attributes: [
              { value: ".title", roles: ["title"] },
            ],
          },
        ],
      },
    ];
    const result = mapAttributes(item, 0, attrs);
    const outer = result[0] as any;
    expect(outer.label).toBe("Outer");
    expect(outer.attributes).toHaveLength(1);
    const inner = outer.attributes[0] as any;
    expect(inner.label).toBe("Inner");
    expect(inner.attributes[0]).toMatchObject({ value: "iPhone 16 Pro Max" });
  });
});

// ── mapDataToFetchedItems ────────────────────────────────────────────

describe("mapDataToFetchedItems", () => {
  test("should map phone data with basic binding", () => {
    const productData = phoneRawData.filter((d) => d.type === "product");
    const items = mapDataToFetchedItems(productData, phoneBinding);

    expect(items).toHaveLength(2);
    expect(items[0].itemId).toBe("iphone-16-pro-max");
    expect(items[1].itemId).toBe("galaxy-s24-ultra");
    expect(items[0].index).toBe(0);
    expect(items[1].index).toBe(1);
  });

  test("should resolve attributes from binding", () => {
    const productData = phoneRawData.filter((d) => d.type === "product");
    const items = mapDataToFetchedItems(productData, phoneBinding);

    const firstAttrs = items[0].attributes;
    expect(firstAttrs).toHaveLength(5); // title, brand, desc, badge, rating
    expect(firstAttrs[0]).toMatchObject({ value: "iPhone 16 Pro Max", roles: ["title"] });
    expect(firstAttrs[1]).toMatchObject({ value: "Apple", roles: ["subtitle"] });
  });

  test("should resolve internalAttributes when defined", () => {
    const items = mapDataToFetchedItems(phoneRawData, phoneBindingWithConditions);
    // internalAttributes should be populated for items with .type
    expect(items[0].internalAttributes).toHaveLength(1);
    expect(items[0].internalAttributes[0]).toMatchObject({ value: "product" });
  });

  test("should apply conditional attributes correctly", () => {
    const items = mapDataToFetchedItems(phoneRawData, phoneBindingWithConditions);

    // First two items are type=product, third is type=ad
    const productItem = items[0];
    const adItem = items[2];

    // Product: should have brand (subtitle) from product condition
    const productAttrs = productItem.attributes;
    // One group passes (product condition), one fails (ad condition)
    expect(productAttrs).toHaveLength(1);
    const productGroup = productAttrs[0] as any;
    expect(productGroup.attributes).toBeDefined();
    expect(productGroup.attributes[1]).toMatchObject({ value: "Apple", roles: ["subtitle"] });

    // Ad: should have tag (badge) from ad condition
    const adAttrs = adItem.attributes;
    expect(adAttrs).toHaveLength(1);
    const adGroup = adAttrs[0] as any;
    expect(adGroup.attributes[1]).toMatchObject({ value: "Limited time offer", roles: ["badge"] });
  });

  test("should handle empty data array", () => {
    const items = mapDataToFetchedItems([], phoneBinding);
    expect(items).toEqual([]);
  });

  test("should map hotel data with deep nested paths", () => {
    const items = mapDataToFetchedItems(hotelRawData, hotelBinding);

    expect(items).toHaveLength(2);
    expect(items[0].itemId).toBe("77391");
    expect(items[0].attributes[0]).toMatchObject({
      value: "La Jolla Cove Hotel",
      roles: ["title"],
    });
    // Deep path: .details.photos[0].images.thumbnail.url
    expect(items[0].attributes[3]).toMatchObject({
      value: "https://example.com/hotel1-thumb.jpg",
      roles: ["thumbnail"],
      type: "image",
    });
  });

  test("should populate internalAttributes for hotel binding", () => {
    const items = mapDataToFetchedItems(hotelRawData, hotelBinding);
    expect(items[0].internalAttributes).toHaveLength(2);
    expect(items[0].internalAttributes[0]).toMatchObject({ value: "32.84991" });
    expect(items[0].internalAttributes[1]).toMatchObject({ value: "-117.2733" });
  });

  test("should apply transform bindings (features map)", () => {
    const productData = phoneRawData.filter((d) => d.type === "product");
    const items = mapDataToFetchedItems(productData, phoneBindingWithTransforms);

    // title + brand + features + capacity-group = 4 attributes
    expect(items[0].attributes.length).toBeGreaterThanOrEqual(3);
    // Features attr (index 2): map:"." on a string array returns the array as value
    // (group creation only triggers for roles including "features", not "spec")
    const featuresAttr = items[0].attributes[2] as any;
    expect(featuresAttr.roles).toContain("spec");
    expect(featuresAttr.value).toEqual(["Action button", "A18 Pro chip", "48MP camera"]);

    // Capacity attr (index 3): map with object attributes creates groups
    const capacityAttr = items[0].attributes[3] as any;
    expect(capacityAttr.attributes).toBeDefined();
    expect(capacityAttr.attributes.length).toBe(2); // 2 capacity options for iPhone
  });

  test("should handle single-item data array", () => {
    const singleItem = [phoneRawData[0]];
    const items = mapDataToFetchedItems(singleItem, phoneBinding);
    expect(items).toHaveLength(1);
    expect(items[0].itemId).toBe("iphone-16-pro-max");
    expect(items[0].index).toBe(0);
  });
});

// ── getFetchedODIFromData ────────────────────────────────────────────

describe("getFetchedODIFromData", () => {
  test("should produce a FetchedODI from raw data and ODI spec", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const productData = phoneRawData.filter((d) => d.type === "product");
    const odi = makeODI();
    const result = getFetchedODIFromData(productData, odi);

    expect(result).not.toBeNull();
    expect(result!.dataBinding).toHaveLength(1);
    expect(result!.dataBinding[0].items).toHaveLength(2);
    expect(result!.overviews).toHaveLength(1);
    spy.mockRestore();
  });

  test("should return empty items when data path is invalid", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const odi: any = {
      dataBinding: [
        { binding: { ...phoneBinding, pathToItems: ".nonExistent.path" } },
      ],
      overviews: [{ type: "list" }],
    };
    const result = getFetchedODIFromData(phoneRawData, odi);
    expect(result).not.toBeNull();
    expect(result!.dataBinding[0].items).toEqual([]);
    spy.mockRestore();
    errSpy.mockRestore();
  });

  test("should handle data with pathToItems", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const wrappedData = { results: phoneRawData.filter((d) => d.type === "product") };
    const odi: any = {
      dataBinding: [
        { binding: { ...phoneBinding, pathToItems: ".results" } },
      ],
      overviews: [{ type: "list" }],
    };
    const result = getFetchedODIFromData(wrappedData, odi);
    expect(result).not.toBeNull();
    expect(result!.dataBinding[0].items).toHaveLength(2);
    spy.mockRestore();
  });

  test("should denormalize the resulting ODI (assigns defaults)", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const productData = phoneRawData.filter((d) => d.type === "product");
    const odi = makeODIWithDetails();
    const result = getFetchedODIFromData(productData, odi);

    // denormalizeODI assigns overviewIndex to items
    expect(result).not.toBeNull();
    const firstItem = result!.dataBinding[0].items[0];
    expect(firstItem.overviewIndex).toBeDefined();
    spy.mockRestore();
  });

  test("should handle multiple data sources", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const productData = phoneRawData.filter((d) => d.type === "product");
    const odi = {
      dataBinding: [
        { id: "phones", binding: phoneBinding },
        { id: "hotels", binding: hotelBinding },
      ],
      overviews: [
        { type: "list", bindingId: "phones" },
        { type: "grid", bindingId: "hotels" },
      ],
    };
    const combinedData = { phones: productData, hotels: hotelRawData };
    // pathToItems defaults to "." so each source maps from the root
    // We need to feed data as an array for the default path
    const result = getFetchedODIFromData(productData, odi);
    expect(result).not.toBeNull();
    expect(result!.dataBinding).toHaveLength(2);
    spy.mockRestore();
  });

  test("should assign malleability defaults via denormalization", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const productData = phoneRawData.filter((d) => d.type === "product");
    const odi = makeODI();
    const result = getFetchedODIFromData(productData, odi);

    // denormalizeODI calls denormalizeMalleability which provides defaults
    expect(result).not.toBeNull();
    expect(result!.malleability).toBeDefined();
    expect(result!.malleability!.disabled).toBe(false);
    spy.mockRestore();
  });

  test("should assign default overview id and type", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const productData = phoneRawData.filter((d) => d.type === "product");
    const odi = makeODI(); // overview has no id
    const result = getFetchedODIFromData(productData, odi);

    expect(result).not.toBeNull();
    // denormalizeOverview assigns id from overviewIndex if missing
    expect(result!.overviews[0].id).toBeDefined();
    spy.mockRestore();
  });
});

