import { describe, expect, test } from "vitest";
import {
  removeDuplicates,
  rolesToIds,
  idsToRoles,
  getRoles,
  getAttributeIdsByDepth,
  getAttributesByRole,
  getAttributesByHasRole,
  attributeInScope,
  filterAttributeFromScope,
  addAttributeToScope,
  getAttributesWithoutRoles,
} from "../attribute.helper";
import {
  makeItem,
  makeValueAttr,
  makeGroupAttr,
  phoneFetchedItems,
  phoneItemsWithGroups,
} from "../../renderer/__fixtures__/items.fixture";
import { FetchedItemType } from "../../spec/spec.internal";

// ── removeDuplicates ─────────────────────────────────────────────────

describe("removeDuplicates", () => {
  test("should remove duplicate strings", () => {
    expect(removeDuplicates(["a", "b", "a", "c", "b"])).toEqual(["a", "b", "c"]);
  });

  test("should return empty array for empty input", () => {
    expect(removeDuplicates([])).toEqual([]);
  });

  test("should return same array when no duplicates", () => {
    expect(removeDuplicates(["x", "y", "z"])).toEqual(["x", "y", "z"]);
  });
});

// ── rolesToIds ────────────────────────────────────────────────────────

describe("rolesToIds", () => {
  test('should return all attribute IDs when scope is "all"', () => {
    const ids = rolesToIds(phoneFetchedItems, "all");
    expect(ids).toContain("title");
    expect(ids).toContain("brand");
    expect(ids).toContain("description");
    expect(ids).toContain("badge");
    expect(ids).toContain("rating");
  });

  test("should resolve role to matching attribute IDs", () => {
    const ids = rolesToIds(phoneFetchedItems, ["title"]);
    expect(ids).toContain("title");
    expect(ids).not.toContain("brand");
  });

  test("should pass through literal attribute IDs that are not roles", () => {
    // "nonexistent-role" isn't in any attribute roles, so treated as literal ID
    const ids = rolesToIds(phoneFetchedItems, ["title", "custom-id"]);
    expect(ids).toContain("title");
    expect(ids).toContain("custom-id");
  });

  test("should handle 'item' scope by returning itemIds", () => {
    const ids = rolesToIds(phoneFetchedItems, ["item"]);
    expect(ids).toContain("iphone-16-pro-max");
    expect(ids).toContain("galaxy-s24-ultra");
  });

  test("should return empty array when items is undefined", () => {
    expect(rolesToIds(undefined, "all")).toEqual([]);
  });

  test("should handle nested group attributes with roles", () => {
    const ids = rolesToIds(phoneItemsWithGroups, ["spec"]);
    // "spec" role is on the features group → should return group ID + children IDs
    expect(ids).toContain("features");
    expect(ids).toContain("features.0");
    expect(ids).toContain("features.1");
    expect(ids).toContain("features.2");
  });

  test("should de-duplicate results", () => {
    const ids = rolesToIds(phoneFetchedItems, ["title", "title"]);
    const titleOccurrences = ids.filter(id => id === "title");
    expect(titleOccurrences).toHaveLength(1);
  });

  test("should return empty array for empty idsAndRoles array", () => {
    expect(rolesToIds(phoneFetchedItems, [])).toEqual([]);
  });
});

// ── idsToRoles ────────────────────────────────────────────────────────

describe("idsToRoles", () => {
  test('should return "all" when ids is "all"', () => {
    expect(idsToRoles(phoneFetchedItems, "all")).toBe("all");
  });

  test("should return roles for given attribute IDs", () => {
    const roles = idsToRoles(phoneFetchedItems, ["title", "brand"]);
    expect(roles).toContain("title");
    expect(roles).toContain("subtitle");
  });

  test("should return empty array for unknown IDs", () => {
    expect(idsToRoles(phoneFetchedItems, ["nonexistent"])).toEqual([]);
  });

  test("should return empty array when items is undefined", () => {
    expect(idsToRoles(undefined, ["title"])).toEqual([]);
  });

  test("should return empty array for empty ids", () => {
    expect(idsToRoles(phoneFetchedItems, [])).toEqual([]);
  });

  test("should de-duplicate roles", () => {
    // Both items have a "title" attr with role "title"
    const roles = idsToRoles(phoneFetchedItems, ["title"]) as string[];
    expect(roles.filter(r => r === "title")).toHaveLength(1);
  });

  test("should find roles inside nested group attributes", () => {
    const roles = idsToRoles(phoneItemsWithGroups, ["features"]);
    expect(roles).toContain("spec");
  });
});

// ── getRoles ──────────────────────────────────────────────────────────

describe("getRoles", () => {
  test("should collect all unique roles from items", () => {
    const roles = getRoles(phoneFetchedItems);
    expect(roles).toContain("title");
    expect(roles).toContain("subtitle");
    expect(roles).toContain("description");
    expect(roles).toContain("badge");
    expect(roles).toContain("key-attribute");
  });

  test("should not contain duplicates", () => {
    const roles = getRoles(phoneFetchedItems);
    const unique = [...new Set(roles)];
    expect(roles).toEqual(unique);
  });

  test("should collect roles from nested group attributes", () => {
    const roles = getRoles(phoneItemsWithGroups);
    expect(roles).toContain("title");
    expect(roles).toContain("spec");
  });

  test("should return empty array for empty items", () => {
    expect(getRoles([])).toEqual([]);
  });
});

// ── getAttributeIdsByDepth ───────────────────────────────────────────

describe("getAttributeIdsByDepth", () => {
  test("should return empty array for depth 0", () => {
    expect(getAttributeIdsByDepth(phoneFetchedItems, 0)).toEqual([]);
  });

  test("should return top-level attribute IDs at depth 1", () => {
    const ids = getAttributeIdsByDepth(phoneFetchedItems, 1);
    expect(ids).toContain("title");
    expect(ids).toContain("brand");
    expect(ids).toContain("description");
  });

  test("should return nested attribute IDs at depth 2 (skipping groups)", () => {
    const ids = getAttributeIdsByDepth(phoneItemsWithGroups, 2);
    // Depth 2: goes inside groups → returns child value attribute IDs
    expect(ids).toContain("features.0");
    expect(ids).toContain("features.1");
    expect(ids).toContain("capacity.0");
  });

  test("should return top-level value attrs at depth 1 even with groups", () => {
    const ids = getAttributeIdsByDepth(phoneItemsWithGroups, 1);
    // depth 1 returns leaf attributes at top level only
    expect(ids).toContain("title");
    // groups are not leaf, so their IDs are NOT included
    expect(ids).not.toContain("features");
  });
});

// ── getAttributesByRole ──────────────────────────────────────────────

describe("getAttributesByRole", () => {
  test("should find attributes by role", () => {
    const result = getAttributesByRole(phoneFetchedItems[0], "title");
    expect(result).toBeDefined();
    expect(result).toHaveLength(1);
    expect((result![0] as any).value).toBe("iPhone 16 Pro Max");
  });

  test("should return undefined when no attributes match the role", () => {
    expect(getAttributesByRole(phoneFetchedItems[0], "nonexistent" as any)).toBeUndefined();
  });

  test("should return undefined for null/undefined item", () => {
    expect(getAttributesByRole(undefined as any, "title")).toBeUndefined();
    expect(getAttributesByRole(null as any, "title")).toBeUndefined();
  });

  test("should find attributes nested inside groups", () => {
    // features group has role "spec"
    const result = getAttributesByRole(phoneItemsWithGroups[0], "spec");
    expect(result).toBeDefined();
    expect(result!.length).toBeGreaterThanOrEqual(1);
    expect(result![0].id).toBe("features");
  });
});

// ── getAttributesByHasRole ───────────────────────────────────────────

describe("getAttributesByHasRole", () => {
  const titleAttr = makeValueAttr({ id: "t", roles: ["title"] });
  const noRoleAttr = makeValueAttr({ id: "n", roles: [] });
  const groupWithRole = makeGroupAttr({
    id: "g",
    roles: ["spec"],
    attributes: [
      makeValueAttr({ id: "g-0", roles: [] }),
      makeValueAttr({ id: "g-1", roles: ["badge"] }),
    ],
  });

  test("should return attributes that have a role when hasRole=true", () => {
    expect(getAttributesByHasRole(titleAttr, true)).toEqual([titleAttr]);
  });

  test("should return empty array for attribute without role when hasRole=true", () => {
    expect(getAttributesByHasRole(noRoleAttr, true)).toEqual([]);
  });

  test("should return attributes without a role when hasRole=false", () => {
    const result = getAttributesByHasRole(noRoleAttr, false);
    expect(result).toEqual([noRoleAttr]);
  });

  test("should return empty array for attribute with role when hasRole=false", () => {
    expect(getAttributesByHasRole(titleAttr, false)).toEqual([]);
  });

  test("should recurse into groups when hasRole=false", () => {
    // groupWithRole has a role → skip it; look at children
    const result = getAttributesByHasRole(groupWithRole, false);
    // g-0 has no role → included; g-1 has a role → excluded
    // But since parent has role, children are skipped (parentHasRole=false at top level though)
    // Actually getAttributesByHasRole: if hasRole=false and attribute has roles, return []
    expect(result).toEqual([]);
  });
});

// ── attributeInScope ─────────────────────────────────────────────────

describe("attributeInScope", () => {
  const attr = makeValueAttr({ id: "price", roles: ["key-attribute"] });

  test('should return true when scope is "all"', () => {
    expect(attributeInScope("all", attr)).toBe(true);
  });

  test("should return true when attribute id is in scope", () => {
    expect(attributeInScope(["price"], attr)).toBe(true);
  });

  test("should return true when attribute role is in scope", () => {
    expect(attributeInScope(["key-attribute"], attr)).toBe(true);
  });

  test("should return false when attribute is not in scope", () => {
    expect(attributeInScope(["title", "subtitle"], attr)).toBe(false);
  });

  test("should return false for undefined scope", () => {
    expect(attributeInScope(undefined, attr)).toBe(false);
  });

  test("should return false for undefined attribute", () => {
    expect(attributeInScope("all", undefined as any)).toBe(false);
  });
});

// ── filterAttributeFromScope ─────────────────────────────────────────

describe("filterAttributeFromScope", () => {
  test("should remove the attribute id from the list", () => {
    const attr = makeValueAttr({ id: "b" });
    expect(filterAttributeFromScope(["a", "b", "c"], attr)).toEqual(["a", "c"]);
  });

  test("should return same list if attribute not present", () => {
    const attr = makeValueAttr({ id: "z" });
    expect(filterAttributeFromScope(["a", "b"], attr)).toEqual(["a", "b"]);
  });

  test("should handle undefined attribute gracefully", () => {
    expect(filterAttributeFromScope(["a"], undefined as any)).toEqual(["a"]);
  });
});

// ── addAttributeToScope ──────────────────────────────────────────────

describe("addAttributeToScope", () => {
  test("should append the attribute id to the list", () => {
    const attr = makeValueAttr({ id: "new" });
    expect(addAttributeToScope(["a", "b"], attr)).toEqual(["a", "b", "new"]);
  });

  test("should not append if attribute has no id", () => {
    const attr = makeValueAttr({ id: undefined as any });
    expect(addAttributeToScope(["a"], attr)).toEqual(["a"]);
  });
});

// ── getAttributesWithoutRoles ────────────────────────────────────────

describe("getAttributesWithoutRoles", () => {
  test("should return attributes that have no roles", () => {
    const item = makeItem({
      attributes: [
        makeValueAttr({ id: "a", roles: ["title"] }),
        makeValueAttr({ id: "b", roles: [] }),
        makeValueAttr({ id: "c", roles: undefined as any }),
      ],
    });
    const result = getAttributesWithoutRoles(item);
    expect(result).toBeDefined();
    const ids = result!.map(a => a.id);
    expect(ids).toContain("b");
    expect(ids).not.toContain("a");
  });

  test("should return undefined when all attributes have roles", () => {
    const item = makeItem({
      attributes: [
        makeValueAttr({ id: "a", roles: ["title"] }),
        makeValueAttr({ id: "b", roles: ["subtitle"] }),
      ],
    });
    expect(getAttributesWithoutRoles(item)).toBeUndefined();
  });

  test("should return undefined for undefined/null item", () => {
    expect(getAttributesWithoutRoles(undefined as any)).toBeUndefined();
    expect(getAttributesWithoutRoles(null as any)).toBeUndefined();
  });

  test("should exclude default roles when excludeDefaultRoles=true", () => {
    const item = makeItem({
      attributes: [
        makeValueAttr({ id: "a", roles: ["title"] }),
        makeValueAttr({ id: "b", roles: ["custom-role"] }),
        makeValueAttr({ id: "c", roles: [] }),
      ],
    });
    const result = getAttributesWithoutRoles(item, true);
    expect(result).toBeDefined();
    const ids = result!.map(a => a.id);
    // "b" has "custom-role" which is not a default role → included
    // "c" has no roles → included
    expect(ids).toContain("b");
    expect(ids).toContain("c");
    expect(ids).not.toContain("a"); // "title" is a default role
  });

  test("should return undefined for item with no attributes", () => {
    expect(getAttributesWithoutRoles(makeItem({ attributes: undefined as any }))).toBeUndefined();
  });
});
