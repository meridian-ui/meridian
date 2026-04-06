import { describe, test, expect } from "vitest";
import {
  denormalizeODI,
  denormalizeOverview,
  denormalizeDetail,
  denormalizeComposedOverview,
  makeDetails,
} from "../renderer.denormalize";
import { defaultDetailView, defaultMalleability, overviewTypesMap } from "../renderer.defaults";
import {
  makeFetchedODI,
  makeFetchedODIWithDetails,
  makeFetchedDataBinding,
  phoneBinding,
} from "../__fixtures__/odi.fixture";
import {
  phoneFetchedItems,
  makeItem,
  makeValueAttr,
  makeGroupAttr,
} from "../__fixtures__/items.fixture";
import { FetchedODI, FetchedDataBindingType } from "../../spec/spec.internal";
import { DetailView, Overview } from "../../spec/spec";

// ── denormalizeODI ───────────────────────────────────────────────────

describe("denormalizeODI", () => {
  test("should assign default overview id from index if missing", () => {
    const odi = makeFetchedODI(); // overview has no id
    const result = denormalizeODI(odi);
    expect(result.overviews[0].id).toBe("0");
  });

  test("should preserve existing overview id", () => {
    const odi = makeFetchedODI({
      overviews: [{ type: "list", id: "my-overview" }],
    });
    const result = denormalizeODI(odi);
    expect(result.overviews[0].id).toBe("my-overview");
  });

  test("should assign default itemView if missing", () => {
    const odi = makeFetchedODI();
    const result = denormalizeODI(odi);
    // Default itemView for list type is "profile"
    expect(result.overviews[0].itemView).toEqual({ type: "profile" });
  });

  test("should use overview type default itemView (grid → vertical)", () => {
    const odi = makeFetchedODI({
      overviews: [{ type: "grid" }],
    });
    const result = denormalizeODI(odi);
    expect(result.overviews[0].itemView).toEqual({ type: "vertical" });
  });

  test("should assign overviewIndex to items in dataBinding", () => {
    const odi = makeFetchedODI();
    const result = denormalizeODI(odi);
    result.dataBinding[0].items.forEach((item) => {
      expect(item.overviewIndex).toBe(0);
    });
  });

  test("should denormalize multiple overviews with correct indices", () => {
    const odi = makeFetchedODI({
      overviews: [
        { type: "list", id: "first" },
        { type: "grid", id: "second" },
      ],
    });
    const result = denormalizeODI(odi);
    expect(result.overviews).toHaveLength(2);
    expect(result.overviews[0].id).toBe("first");
    expect(result.overviews[1].id).toBe("second");
  });

  test("should assign default malleability when undefined", () => {
    const odi = makeFetchedODI(); // no malleability
    const result = denormalizeODI(odi);
    expect(result.malleability).toEqual(defaultMalleability);
  });

  test("should merge partial malleability with defaults", () => {
    const odi = makeFetchedODI({
      malleability: { disabled: true },
    });
    const result = denormalizeODI(odi);
    expect(result.malleability!.disabled).toBe(true);
    // Should still have defaults for sub-properties
    expect(result.malleability!.content).toBeDefined();
    expect(result.malleability!.composition).toBeDefined();
    expect(result.malleability!.layout).toBeDefined();
  });

  test("should merge nested malleability content with defaults", () => {
    const odi = makeFetchedODI({
      malleability: {
        content: { disabled: true },
      },
    });
    const result = denormalizeODI(odi);
    expect(result.malleability!.content!.disabled).toBe(true);
    // types should come from defaults
    expect(result.malleability!.content!.types).toEqual(["toggle"]);
  });

  test("should populate items on overviews from data source", () => {
    const odi = makeFetchedODI();
    const result = denormalizeODI(odi);
    expect(result.overviews[0].items).toBeDefined();
    expect(result.overviews[0].items!.length).toBeGreaterThan(0);
  });

  test("should denormalize detailViews at ODI root", () => {
    const odi = makeFetchedODIWithDetails();
    const result = denormalizeODI(odi);
    expect(result.detailViews).toBeDefined();
    expect(result.detailViews!.length).toBeGreaterThan(0);
    const detail = result.detailViews![0] as DetailView;
    expect(detail.id).toBeDefined();
    expect(detail.openIn).toBeDefined();
  });

  test("should resolve shownAttributes to IDs array", () => {
    const odi = makeFetchedODI({
      overviews: [{ type: "list", shownAttributes: ["title", "subtitle"] }],
    });
    const result = denormalizeODI(odi);
    // rolesToIds converts role names to actual attribute IDs from items
    const shown = result.overviews[0].shownAttributes;
    expect(Array.isArray(shown)).toBe(true);
  });

  test("should handle empty overviews array", () => {
    const odi = makeFetchedODI({ overviews: [] });
    const result = denormalizeODI(odi);
    expect(result.overviews).toEqual([]);
  });
});

// ── denormalizeOverview ──────────────────────────────────────────────

describe("denormalizeOverview", () => {
  const dataSource = makeFetchedDataBinding();

  test("should set default id from overviewIndex", () => {
    const overview: Overview = { type: "list" } as Overview;
    const result = denormalizeOverview(
      makeFetchedODI(), overview, 3, {}, dataSource
    );
    expect(result.id).toBe("3");
  });

  test("should set default type to list when missing", () => {
    const overview = { type: undefined } as any;
    const result = denormalizeOverview(
      makeFetchedODI(), overview, 0, {}, dataSource
    );
    expect(result.type).toBe("list");
  });

  test("should assign items from data source", () => {
    const overview: Overview = { type: "list" } as Overview;
    const result = denormalizeOverview(
      makeFetchedODI(), overview, 0, {}, dataSource
    );
    expect(result.items).toBe(dataSource.items);
  });

  test("should resolve shownAttributes roles to IDs", () => {
    const overview: Overview = {
      type: "list",
      shownAttributes: ["title"],
    } as Overview;
    const result = denormalizeOverview(
      makeFetchedODI(), overview, 0, {}, dataSource
    );
    // rolesToIds converts "title" role to actual attribute IDs that have role "title"
    expect(Array.isArray(result.shownAttributes)).toBe(true);
    const shown = result.shownAttributes as string[];
    expect(shown).toContain("title");
  });

  test("should resolve hiddenAttributes roles to IDs", () => {
    const overview: Overview = {
      type: "list",
      hiddenAttributes: ["description"],
    } as Overview;
    const result = denormalizeOverview(
      makeFetchedODI(), overview, 0, {}, dataSource
    );
    expect(Array.isArray(result.hiddenAttributes)).toBe(true);
    const hidden = result.hiddenAttributes as string[];
    expect(hidden).toContain("description");
  });

  test("should create default detail view when no detailViews provided", () => {
    const overview: Overview = { type: "list" } as Overview;
    const result = denormalizeOverview(
      makeFetchedODI(), overview, 0, {}, dataSource
    );
    expect(result.detailViews).toBeDefined();
    expect(result.detailViews!.length).toBeGreaterThan(0);
  });

  test("should preserve overview type defaults for itemView", () => {
    // Grid type has default itemView: { type: "vertical" }
    const overview: Overview = { type: "grid" } as Overview;
    const gridDefaults = overviewTypesMap["grid"]?.defaultSpec ?? {};
    const result = denormalizeOverview(
      makeFetchedODI(), overview, 0, gridDefaults, dataSource
    );
    expect(result.itemView).toEqual({ type: "vertical" });
  });

  test("should preserve user-specified itemView over defaults", () => {
    const overview: Overview = {
      type: "grid",
      itemView: { type: "compact" },
    } as Overview;
    const gridDefaults = overviewTypesMap["grid"]?.defaultSpec ?? {};
    const result = denormalizeOverview(
      makeFetchedODI(), overview, 0, gridDefaults, dataSource
    );
    expect(result.itemView).toEqual({ type: "compact" });
  });

  test("should set itemView to null when isChange is true", () => {
    const overview: Overview = {
      type: "list",
      itemView: { type: "profile" },
    } as Overview;
    const result = denormalizeOverview(
      makeFetchedODI(), overview, 0, {}, dataSource, true
    );
    expect(result.itemView).toBeNull();
  });
});

// ── denormalizeDetail ────────────────────────────────────────────────

describe("denormalizeDetail", () => {
  const dataSource = makeFetchedDataBinding();
  const odi = makeFetchedODI();

  test("should assign default id from overviewIndex and detailId", () => {
    const detail: DetailView = { type: "basic" } as DetailView;
    const result = denormalizeDetail(odi, detail, 0, "0", dataSource);
    expect(typeof result).not.toBe("string");
    expect((result as DetailView).id).toBe("0-d0");
  });

  test("should preserve existing id", () => {
    const detail: DetailView = { type: "basic", id: "my-detail" } as DetailView;
    const result = denormalizeDetail(odi, detail, 0, "0", dataSource);
    expect((result as DetailView).id).toBe("my-detail");
  });

  test("should default openIn to pop-up for normal overviewIndex", () => {
    const detail: DetailView = { type: "basic" } as DetailView;
    const result = denormalizeDetail(odi, detail, 0, "0", dataSource) as DetailView;
    expect(result.openIn).toBe("pop-up");
  });

  test("should default openIn to new-page when overviewIndex is -10 (no overviews)", () => {
    const detail: DetailView = { type: "basic" } as DetailView;
    const result = denormalizeDetail(odi, detail, -10, "0", dataSource) as DetailView;
    expect(result.openIn).toBe("new-page");
  });

  test("should preserve existing openIn", () => {
    const detail: DetailView = { type: "basic", openIn: "side-by-side" } as DetailView;
    const result = denormalizeDetail(odi, detail, 0, "0", dataSource) as DetailView;
    expect(result.openIn).toBe("side-by-side");
  });

  test("should resolve shownAttributes to IDs", () => {
    const detail: DetailView = {
      type: "basic",
      shownAttributes: ["title", "description"],
    } as DetailView;
    const result = denormalizeDetail(odi, detail, 0, "0", dataSource) as DetailView;
    expect(Array.isArray(result.shownAttributes)).toBe(true);
  });

  test("should default shownAttributes to 'all' resolved as IDs", () => {
    const detail: DetailView = { type: "basic" } as DetailView;
    const result = denormalizeDetail(odi, detail, 0, "0", dataSource) as DetailView;
    // "all" is passed to rolesToIds which returns all attribute IDs
    expect(result.shownAttributes).toBeDefined();
  });

  test("should resolve hiddenAttributes to IDs", () => {
    const detail: DetailView = {
      type: "basic",
      hiddenAttributes: ["badge"],
    } as DetailView;
    const result = denormalizeDetail(odi, detail, 0, "0", dataSource) as DetailView;
    expect(Array.isArray(result.hiddenAttributes)).toBe(true);
  });

  test("should assign items from data source", () => {
    const detail: DetailView = { type: "basic" } as DetailView;
    const result = denormalizeDetail(odi, detail, 0, "0", dataSource) as DetailView;
    expect(result.items).toBe(dataSource.items);
  });

  test("should return string as-is if detail is a string reference", () => {
    const result = denormalizeDetail(odi, "detail-ref" as any, 0, "0", dataSource);
    expect(result).toBe("detail-ref");
  });

  test("should recursively denormalize nested detailViews", () => {
    const detail: DetailView = {
      type: "basic",
      detailViews: [{ type: "basic" } as DetailView],
    } as DetailView;
    const result = denormalizeDetail(odi, detail, 0, "0", dataSource) as DetailView;
    expect(result.detailViews).toBeDefined();
    const nested = result.detailViews![0] as DetailView;
    expect(nested.id).toBeDefined();
    expect(nested.openIn).toBeDefined();
  });

  test("should denormalize nested overviews via denormalizeComposedOverview", () => {
    const detail: DetailView = {
      type: "basic",
      overviews: [{ type: "list" } as Overview],
    } as DetailView;
    const result = denormalizeDetail(odi, detail, 0, "0", dataSource) as DetailView;
    expect(result.overviews).toBeDefined();
    expect(result.overviews!.length).toBe(1);
    const nestedOverview = result.overviews![0] as Overview;
    expect(nestedOverview.id).toBeDefined();
  });
});

// ── denormalizeComposedOverview ───────────────────────────────────────

describe("denormalizeComposedOverview", () => {
  const dataSource = makeFetchedDataBinding();
  const odi = makeFetchedODI();

  test("should assign id from parentId and overviewIndex", () => {
    const overview: Overview = { type: "list" } as Overview;
    const result = denormalizeComposedOverview(odi, overview, 0, dataSource, "parent");
    expect((result as Overview).id).toBe("parent-0");
  });

  test("should preserve existing id", () => {
    const overview: Overview = { type: "list", id: "existing-id" } as Overview;
    const result = denormalizeComposedOverview(odi, overview, 0, dataSource, "parent");
    expect((result as Overview).id).toBe("existing-id");
  });

  test("should return string as-is if composed overview is string reference", () => {
    const result = denormalizeComposedOverview(odi, "overview-ref" as any, 0, dataSource);
    expect(result).toBe("overview-ref");
  });

  test("should handle undefined parentId", () => {
    const overview: Overview = { type: "list" } as Overview;
    const result = denormalizeComposedOverview(odi, overview, 2, dataSource);
    expect((result as Overview).id).toBe("undefined-2");
  });
});

// ── makeDetails ──────────────────────────────────────────────────────

describe("makeDetails", () => {
  const dataSource = makeFetchedDataBinding();
  const odi = makeFetchedODI();

  test("should create default detail view when no details provided", () => {
    const result = makeDetails(odi, undefined, undefined, 0, dataSource);
    expect(result).toHaveLength(1);
    const detail = result[0] as DetailView;
    expect(detail.type).toBe("basic");
    expect(detail.openIn).toBeDefined();
  });

  test("should use provided details over defaults", () => {
    const details: DetailView[] = [
      { type: "basic", openIn: "side-by-side" } as DetailView,
    ];
    const result = makeDetails(odi, details, undefined, 0, dataSource);
    expect(result).toHaveLength(1);
    expect((result[0] as DetailView).openIn).toBe("side-by-side");
  });

  test("should fallback to defaultDetails when details is undefined", () => {
    const defaultDetails: DetailView[] = [
      { type: "basic", openIn: "tooltip" } as DetailView,
    ];
    const result = makeDetails(odi, undefined, defaultDetails, 0, dataSource);
    expect(result).toHaveLength(1);
    expect((result[0] as DetailView).openIn).toBe("tooltip");
  });

  test("should pass through string references unchanged", () => {
    const details: (DetailView | string)[] = ["detail-ref-1"];
    const result = makeDetails(odi, details, undefined, 0, dataSource);
    expect(result[0]).toBe("detail-ref-1");
  });

  test("should denormalize multiple detail views", () => {
    const details: DetailView[] = [
      { type: "basic" } as DetailView,
      { type: "basic", openIn: "tooltip" } as DetailView,
    ];
    const result = makeDetails(odi, details, undefined, 0, dataSource);
    expect(result).toHaveLength(2);
    expect((result[0] as DetailView).id).toBeDefined();
    expect((result[1] as DetailView).id).toBeDefined();
  });

  test("should merge defaultDetailView into provided details", () => {
    const details: DetailView[] = [
      { type: "basic" } as DetailView,
    ];
    const result = makeDetails(odi, details, undefined, 0, dataSource);
    const detail = result[0] as DetailView;
    // Should inherit defaults like openIn from defaultDetailView
    expect(detail.openIn).toBe("pop-up");
    expect(detail.shownAttributes).toBeDefined();
  });
});
