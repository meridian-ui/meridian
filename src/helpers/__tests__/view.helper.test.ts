import { describe, expect, test } from "vitest";
import {
  findOverview,
  findOverviewById,
  findOverviewFromItsDetail,
  findDetail,
  getBottomCenter,
  checkDataLists,
  getDataBindingById,
  findDetailViewToOpen,
  findItemDetailViewToOpen,
  getDetailViewById,
  findDetailViewById,
} from "../view.helper";
import {
  makeODI,
  makeODIWithDetails,
  makeFetchedODI,
  makeFetchedODIWithDetails,
} from "../../renderer/__fixtures__/odi.fixture";
import { makeValueAttr, phoneFetchedItems } from "../../renderer/__fixtures__/items.fixture";
import { ODI } from "../../spec/spec";
import { FetchedODI, ViewOptions } from "../../spec/spec.internal";

// ── findOverview ─────────────────────────────────────────────────────

describe("findOverview", () => {
  test("should find an overview by id", () => {
    const odi = makeODI({
      overviews: [
        { type: "list", id: "list-1" },
        { type: "grid", id: "grid-1" },
      ],
    });
    const result = findOverview(odi, "grid-1");
    expect(result).toBeDefined();
    expect(result!.type).toBe("grid");
  });

  test("should return undefined for unknown id", () => {
    expect(findOverview(makeODI(), "nope")).toBeUndefined();
  });

  test("should return undefined for undefined odi", () => {
    expect(findOverview(undefined, "id")).toBeUndefined();
  });
});

// ── findOverviewById ─────────────────────────────────────────────────

describe("findOverviewById", () => {
  test("should find top-level overview by id", () => {
    const odi = makeODI({
      overviews: [{ type: "list", id: "o1" }],
    });
    expect(findOverviewById(odi, "o1")?.type).toBe("list");
  });

  test("should find overview nested in detailViews", () => {
    const odi: ODI = {
      dataBinding: [],
      overviews: [{ type: "list", id: "top" }],
      detailViews: [
        {
          id: "detail-1",
          type: "basic",
          overviews: [{ type: "grid", id: "nested-overview" }],
        },
      ],
    };
    const result = findOverviewById(odi, "nested-overview");
    expect(result).toBeDefined();
    expect(result!.type).toBe("grid");
  });

  test("should return undefined when odi is undefined", () => {
    expect(findOverviewById(undefined, "id")).toBeUndefined();
  });
});

// ── findOverviewFromItsDetail ────────────────────────────────────────

describe("findOverviewFromItsDetail", () => {
  test("should find overview that contains the given detail id", () => {
    const odi = makeODIWithDetails();
    const detailId = (odi.overviews[0].detailViews![0] as any).id;
    if (detailId) {
      const result = findOverviewFromItsDetail(odi, detailId);
      expect(result).toBeDefined();
      expect(result!.type).toBe("list");
    }
  });

  test("should find overview when detailViews uses string references", () => {
    const odi: ODI = {
      dataBinding: [],
      overviews: [{ type: "grid", id: "ov-1", detailViews: ["d-ref"] }],
    };
    const result = findOverviewFromItsDetail(odi, "d-ref");
    expect(result).toBeDefined();
    expect(result!.id).toBe("ov-1");
  });

  test("should return undefined when detail not found", () => {
    expect(findOverviewFromItsDetail(makeODI(), "nope")).toBeUndefined();
  });

  test("should return undefined for undefined odi", () => {
    expect(findOverviewFromItsDetail(undefined, "id")).toBeUndefined();
  });
});

// ── findDetail ───────────────────────────────────────────────────────

describe("findDetail", () => {
  test("should find a detail view by id (inline object)", () => {
    const odi = makeODIWithDetails();
    const detailId = (odi.overviews[0].detailViews![0] as any).id;
    if (detailId) {
      const result = findDetail(odi, detailId);
      expect(result).toBeDefined();
      expect(result!.type).toBe("basic");
    }
  });

  test("should resolve string reference from odi.detailViews", () => {
    const odi: ODI = {
      dataBinding: [],
      overviews: [{ type: "list", detailViews: ["detail-ref"] }],
      detailViews: [{ id: "detail-ref", type: "basic", openIn: "side-panel" }],
    };
    const result = findDetail(odi, "detail-ref");
    expect(result).toBeDefined();
    expect(result!.openIn).toBe("side-panel");
  });

  test("should return undefined for unknown id", () => {
    expect(findDetail(makeODI(), "nope")).toBeUndefined();
  });

  test("should return undefined for undefined odi", () => {
    expect(findDetail(undefined, "id")).toBeUndefined();
  });
});

// ── getBottomCenter ──────────────────────────────────────────────────

describe("getBottomCenter", () => {
  test("should compute bottom-center from top-left and size", () => {
    const result = getBottomCenter({ x: 100, y: 200 }, { width: 80, height: 50 });
    expect(result.left).toBe(60); // 100 - 80/2
    expect(result.top).toBe(150); // 200 - 50
  });

  test("should handle zero-size view", () => {
    const result = getBottomCenter({ x: 50, y: 50 }, { width: 0, height: 0 });
    expect(result.left).toBe(50);
    expect(result.top).toBe(50);
  });
});

// ── checkDataLists ───────────────────────────────────────────────────

describe("checkDataLists", () => {
  test("should return skeleton data for undefined data", () => {
    const result = checkDataLists(undefined);
    expect(result).toHaveLength(1);
    // skeleton data is the imported JSON
    expect(result[0]).toBeDefined();
  });

  test("should return skeleton data for empty array", () => {
    const result = checkDataLists([]);
    expect(result).toHaveLength(1);
  });

  test("should return skeleton data when all datasets are empty", () => {
    const result = checkDataLists([[], []]);
    expect(result).toHaveLength(1);
  });

  test("should return original data when it has content", () => {
    const data = [[{ id: 1 }]];
    expect(checkDataLists(data)).toBe(data);
  });

  test("should return non-array data as-is", () => {
    const data = { key: "value" };
    expect(checkDataLists(data)).toBe(data);
  });
});

// ── getDataBindingById ───────────────────────────────────────────────

describe("getDataBindingById", () => {
  test("should return binding matching the id", () => {
    const odi = makeFetchedODI({
      dataBinding: [
        { binding: {} as any, items: [], id: "b1" },
        { binding: {} as any, items: phoneFetchedItems, id: "b2" },
      ],
    });
    const result = getDataBindingById(odi, "b2");
    expect(result.id).toBe("b2");
    expect(result.items).toBe(phoneFetchedItems);
  });

  test("should fallback to first binding when id not found", () => {
    const odi = makeFetchedODI();
    const result = getDataBindingById(odi, "nonexistent");
    expect(result).toBe(odi.dataBinding[0]);
  });

  test("should fallback to first binding when id is undefined", () => {
    const odi = makeFetchedODI();
    const result = getDataBindingById(odi, undefined);
    expect(result).toBe(odi.dataBinding[0]);
  });
});

// ── getDetailViewById ────────────────────────────────────────────────

describe("getDetailViewById", () => {
  test("should return inline detail view object as-is", () => {
    const detail = { id: "d", type: "basic" as const };
    expect(getDetailViewById(detail, undefined)).toBe(detail);
  });

  test("should resolve string id from odi.detailViews", () => {
    const odi: ODI = {
      dataBinding: [],
      overviews: [],
      detailViews: [{ id: "d1", type: "basic", openIn: "side-panel" }],
    };
    const result = getDetailViewById("d1", odi);
    expect(result).toBeDefined();
    expect(result!.openIn).toBe("side-panel");
  });

  test("should return undefined for unknown string id", () => {
    expect(getDetailViewById("nope", makeODI())).toBeUndefined();
  });
});

// ── findDetailViewById ───────────────────────────────────────────────

describe("findDetailViewById", () => {
  test("should find detail view in odi.detailViews by id", () => {
    const odi: ODI = {
      dataBinding: [],
      overviews: [],
      detailViews: [{ id: "d1", type: "basic" }],
    };
    expect(findDetailViewById(odi, "d1")?.type).toBe("basic");
  });

  test("should return undefined when odi is undefined", () => {
    expect(findDetailViewById(undefined, "id")).toBeUndefined();
  });

  test("should return undefined when no match", () => {
    expect(findDetailViewById(makeODI(), "nope")).toBeUndefined();
  });
});

// ── findDetailViewToOpen ─────────────────────────────────────────────

describe("findDetailViewToOpen", () => {
  const buildOptions = (overrides: Partial<ViewOptions> = {}): ViewOptions => ({
    items: phoneFetchedItems,
    overview: {
      type: "list",
      detailViews: [
        {
          id: "detail-1",
          type: "basic",
          openFrom: ["title", "thumbnail"],
          openBy: "click",
          shownAttributes: "all",
        },
      ],
    },
    ...overrides,
  } as ViewOptions);

  test("should find a detail view that matches attribute scope", () => {
    const attr = makeValueAttr({ id: "t", roles: ["title"], itemIndex: 0 });
    const result = findDetailViewToOpen(buildOptions(), undefined, attr);
    expect(result).toBeDefined();
    expect((result as any).id).toBe("detail-1");
  });

  test('should match detail with openFrom "all"', () => {
    const options = buildOptions({
      overview: {
        type: "list",
        detailViews: [{ type: "basic", openFrom: "all", shownAttributes: "all" }],
      },
    });
    const attr = makeValueAttr({ id: "any", roles: ["anything"], itemIndex: 0 });
    const result = findDetailViewToOpen(options, undefined, attr);
    expect(result).toBeDefined();
  });

  test("should return undefined when no detail matches", () => {
    const options = buildOptions({
      overview: { type: "list", detailViews: [] },
    });
    const attr = makeValueAttr({ id: "x", roles: ["x"], itemIndex: 0 });
    expect(findDetailViewToOpen(options, undefined, attr)).toBeUndefined();
  });

  test("should resolve string detail reference from odi.detailViews", () => {
    const odi: FetchedODI = {
      dataBinding: [],
      overviews: [],
      detailViews: [{ id: "d-ref", type: "basic", openFrom: ["title"], shownAttributes: "all" }],
    };
    const options = buildOptions({
      overview: { type: "list", detailViews: ["d-ref"] },
    });
    const attr = makeValueAttr({ id: "t", roles: ["title"], itemIndex: 0 });
    const result = findDetailViewToOpen(options, odi, attr);
    expect(result).toBeDefined();
    expect(result!.id).toBe("d-ref");
  });
});

// ── findItemDetailViewToOpen ─────────────────────────────────────────

describe("findItemDetailViewToOpen", () => {
  const buildOptions = (overrides: Partial<ViewOptions> = {}): ViewOptions => ({
    items: phoneFetchedItems,
    overview: {
      type: "list",
      detailViews: [
        {
          id: "detail-1",
          type: "basic",
          openFrom: ["item"],
          openBy: "click",
          shownAttributes: "all",
        },
      ],
    },
    ...overrides,
  } as ViewOptions);

  test('should find detail with openFrom including "item"', () => {
    const result = findItemDetailViewToOpen(buildOptions(), undefined);
    expect(result).toBeDefined();
    expect((result as any).id).toBe("detail-1");
  });

  test('should find detail with openFrom "all"', () => {
    const options = buildOptions({
      overview: {
        type: "list",
        detailViews: [{ type: "basic", openFrom: "all", shownAttributes: "all" }],
      },
    });
    const result = findItemDetailViewToOpen(options, undefined);
    expect(result).toBeDefined();
  });

  test("should return undefined when no detail has item in openFrom", () => {
    const options = buildOptions({
      overview: {
        type: "list",
        detailViews: [{ type: "basic", openFrom: ["title"], shownAttributes: "all" }],
      },
    });
    expect(findItemDetailViewToOpen(options, undefined)).toBeUndefined();
  });

  test("should resolve string detail reference from odi.detailViews", () => {
    const odi: FetchedODI = {
      dataBinding: [],
      overviews: [],
      detailViews: [{ id: "d-ref", type: "basic", openFrom: ["item"], shownAttributes: "all" }],
    };
    const options = buildOptions({
      overview: { type: "list", detailViews: ["d-ref"] },
    });
    const result = findItemDetailViewToOpen(options, odi);
    expect(result).toBeDefined();
    expect(result!.id).toBe("d-ref");
  });
});
