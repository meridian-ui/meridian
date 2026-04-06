import { describe, expect, test } from "vitest";
import {
  filterItemAttributes,
  mapRecursiveAttributes,
  getFirstDetail,
  getFirstOverview,
} from "../renderer.filter";
import { makeItem, makeValueAttr, makeGroupAttr, phoneFetchedItems, phoneItemsWithGroups } from "../__fixtures__/items.fixture";
import { makeODI, makeODIWithDetails } from "../__fixtures__/odi.fixture";
import { FetchedItemType } from "../../spec/spec.internal";

// ── filterItemAttributes ─────────────────────────────────────────────

describe("filterItemAttributes", () => {
  const viewId = "overview-1";

  // -- edge cases --

  test("should return empty array for empty items", () => {
    expect(filterItemAttributes([], "all", [], viewId)).toEqual([]);
  });

  test("should return empty array for undefined/null items", () => {
    expect(filterItemAttributes(undefined as any, "all", [], viewId)).toEqual([]);
    expect(filterItemAttributes(null as any, "all", [], viewId)).toEqual([]);
  });

  // -- "all" shown --

  test('should return all attributes when shownAttributes is "all"', () => {
    const result = filterItemAttributes(phoneFetchedItems, "all", [], viewId);
    expect(result).toHaveLength(2);
    expect(result[0].attributes.filter(Boolean)).toHaveLength(5);
    expect(result[1].attributes.filter(Boolean)).toHaveLength(3);
  });

  test('should return all when shownAttributes is undefined (defaults to "all")', () => {
    const result = filterItemAttributes(phoneFetchedItems, undefined, undefined, viewId);
    expect(result).toHaveLength(2);
    expect(result[0].attributes.filter(Boolean)).toHaveLength(5);
  });

  // -- specific IDs shown --

  test("should show only attributes whose IDs are in shownAttributes list", () => {
    const result = filterItemAttributes(phoneFetchedItems, ["title", "brand"], [], viewId);
    const visibleAttrs = result[0].attributes.filter(Boolean);
    expect(visibleAttrs).toHaveLength(2);
    expect(visibleAttrs.map((a: any) => a.id)).toEqual(["title", "brand"]);
  });

  test("should return items with null entries for non-matching attributes", () => {
    const result = filterItemAttributes(phoneFetchedItems, ["title"], [], viewId);
    // The total attributes array should still have 5 entries (some null)
    expect(result[0].attributes).toHaveLength(5);
    // But only 1 non-null
    expect(result[0].attributes.filter(Boolean)).toHaveLength(1);
  });

  // -- hidden attributes --

  test("should hide attributes whose IDs are in hiddenAttributes", () => {
    const result = filterItemAttributes(phoneFetchedItems, "all", ["badge", "rating"], viewId);
    const visible = result[0].attributes.filter(Boolean);
    expect(visible).toHaveLength(3);
    const ids = visible.map((a: any) => a.id);
    expect(ids).not.toContain("badge");
    expect(ids).not.toContain("rating");
  });

  test("should hide attributes even when shown is 'all'", () => {
    const result = filterItemAttributes(phoneFetchedItems, "all", ["title"], viewId);
    const visible = result[0].attributes.filter(Boolean);
    expect(visible.find((a: any) => a.id === "title")).toBeUndefined();
  });

  // -- groups / nested attributes --

  test("should filter inside group attributes recursively", () => {
    const result = filterItemAttributes(phoneItemsWithGroups, ["title", "features.0", "features.1"], [], viewId);
    const visible = result[0].attributes.filter(Boolean);
    // "title" value attr + "features" group (since children matched)
    expect(visible.length).toBeGreaterThanOrEqual(2);
    const group = visible.find((a: any) => a.id === "features") as any;
    expect(group).toBeDefined();
    // features group should have its children filtered
    const groupChildren = group.attributes.filter(Boolean);
    expect(groupChildren).toHaveLength(2);
  });

  test("should hide a group child while keeping others visible", () => {
    const result = filterItemAttributes(
      phoneItemsWithGroups,
      "all",
      ["features.2"],
      viewId
    );
    const group = result[0].attributes.filter(Boolean).find((a: any) => a.id === "features") as any;
    expect(group).toBeDefined();
    const children = group.attributes.filter(Boolean);
    // 3 original features, 1 hidden → 2 remain
    expect(children).toHaveLength(2);
    expect(children.find((a: any) => a.id === "features.2")).toBeUndefined();
  });

  test("should keep group even when some children are null (group children > 0)", () => {
    const result = filterItemAttributes(
      phoneItemsWithGroups,
      ["features.0"],
      [],
      viewId
    );
    const group = result[0].attributes.filter(Boolean).find((a: any) => a.id === "features") as any;
    expect(group).toBeDefined();
    expect(group.attributes.filter(Boolean)).toHaveLength(1);
  });

  // -- attributes without an ID --

  test("should return null for attributes missing an id", () => {
    const items: FetchedItemType[] = [
      makeItem({
        attributes: [
          makeValueAttr({ id: undefined as any, index: 0, value: "no-id" }),
          makeValueAttr({ id: "valid", index: 1, value: "has-id" }),
        ],
      }),
    ];
    const result = filterItemAttributes(items, "all", [], viewId);
    expect(result[0].attributes[0]).toBeNull();
    expect(result[0].attributes[1]).not.toBeNull();
  });
});

// ── mapRecursiveAttributes ───────────────────────────────────────────

describe("mapRecursiveAttributes", () => {
  const viewId = "overview-1";

  test("should merge original item attributes onto attributeItems", () => {
    const attributeItems: FetchedItemType[] = [
      makeItem({
        itemId: "iphone-16-pro-max",
        attributes: [makeValueAttr({ id: "extra", value: "Extra Data" })],
      }),
    ];
    const result = mapRecursiveAttributes(attributeItems, phoneFetchedItems, viewId);
    expect(result).toHaveLength(1);
    // Should have the extra attr + all original attrs (5)
    expect(result[0].attributes.length).toBe(6);
  });

  test("should exclude attributes matching viewId from original items", () => {
    const originalItems: FetchedItemType[] = [
      makeItem({
        itemId: "item-1",
        attributes: [
          makeValueAttr({ id: "overview-1", value: "should be excluded" }),
          makeValueAttr({ id: "description", index: 1, value: "kept" }),
        ],
      }),
    ];
    const attributeItems: FetchedItemType[] = [
      makeItem({ itemId: "item-1", attributes: [] }),
    ];
    const result = mapRecursiveAttributes(attributeItems, originalItems, "overview-1");
    // Only "description" from original (overview-1 is excluded)
    expect(result[0].attributes).toHaveLength(1);
    expect((result[0].attributes[0] as any).id).toBe("description");
  });

  test("should handle no matching original item gracefully", () => {
    const attributeItems: FetchedItemType[] = [
      makeItem({ itemId: "nonexistent", attributes: [makeValueAttr({ id: "a" })] }),
    ];
    const result = mapRecursiveAttributes(attributeItems, phoneFetchedItems, viewId);
    // No match → only the attributeItems' own attributes
    expect(result[0].attributes).toHaveLength(1);
  });

  test("should return empty array when attributeItems is empty", () => {
    const result = mapRecursiveAttributes([], phoneFetchedItems, viewId);
    expect(result).toEqual([]);
  });
});

// ── getFirstDetail ───────────────────────────────────────────────────

describe("getFirstDetail", () => {
  test("should return the first detail view from the first overview that has one", () => {
    const odi = makeODIWithDetails();
    const detail = getFirstDetail(odi);
    expect(detail.type).toBe("basic");
    expect(detail.openIn).toBe("pop-up");
  });

  test("should return default detail when no overview has detailViews", () => {
    const odi = makeODI(); // no detailViews
    const detail = getFirstDetail(odi);
    expect(detail.type).toBe("basic");
    expect(detail.openIn).toBe("pop-up");
  });

  test("should resolve string detail ID from odi.detailViews", () => {
    const odi = makeODI({
      overviews: [{ type: "list", detailViews: ["my-detail"] }],
      detailViews: [
        {
          id: "my-detail",
          type: "basic",
          openIn: "side-panel",
          shownAttributes: "all",
        },
      ],
    });
    const detail = getFirstDetail(odi);
    expect(detail.openIn).toBe("side-panel");
    expect(detail.id).toBe("my-detail");
  });

  test("should return default detail when string ID not found in detailViews", () => {
    const odi = makeODI({
      overviews: [{ type: "list", detailViews: ["missing-id"] }],
      detailViews: [],
    });
    const detail = getFirstDetail(odi);
    // Falls back to defaultDetailView
    expect(detail.type).toBe("basic");
  });

  test("should skip overviews with empty detailViews array", () => {
    const odi = makeODI({
      overviews: [
        { type: "list", detailViews: [] },
        {
          type: "grid",
          detailViews: [{ type: "basic", openIn: "side-panel", shownAttributes: ["title"] }],
        },
      ],
    });
    const detail = getFirstDetail(odi);
    expect(detail.openIn).toBe("side-panel");
  });
});

// ── getFirstOverview ─────────────────────────────────────────────────

describe("getFirstOverview", () => {
  test("should return the first overview", () => {
    const odi = makeODI();
    const overview = getFirstOverview(odi);
    expect(overview.type).toBe("list");
  });

  test("should return the first overview from multi-overview ODI", () => {
    const odi = makeODI({
      overviews: [
        { type: "grid", id: "first" },
        { type: "list", id: "second" },
      ],
    });
    const overview = getFirstOverview(odi);
    expect(overview.type).toBe("grid");
    expect(overview.id).toBe("first");
  });

  test("should return default overview when overviews array is empty", () => {
    const odi = makeODI({ overviews: [] });
    const overview = getFirstOverview(odi);
    // Falls back to defaultOverview (type: "list")
    expect(overview.type).toBe("list");
  });
});
