/**
 * Shared test fixtures: ODI and FetchedODI factories.
 */
import { ODI, DataBindingType, BindingItemType, AttributeType, DetailView, Malleability } from "../../spec/spec";
import { FetchedODI, FetchedDataBindingType, FetchedItemType } from "../../spec/spec.internal";
import { phoneFetchedItems, makeItem, makeValueAttr, makeGroupAttr } from "./items.fixture";

// ── Binding Factories ────────────────────────────────────────────────

export const phoneBinding: BindingItemType = {
  itemId: ".id",
  attributes: [
    { value: ".title", roles: ["title"] },
    { value: ".brand", roles: ["subtitle"] },
    { value: ".description", roles: ["description"] },
    { value: ".badge", roles: ["badge"] },
    { value: ".rating", roles: ["key-attribute"] },
  ],
};

export const phoneBindingWithTransforms: BindingItemType = {
  itemId: ".id",
  attributes: [
    { value: ".title", roles: ["title"] },
    { value: ".brand", roles: ["subtitle"] },
    {
      value: ".features",
      roles: ["spec"],
      transform: [{ map: "." }],
    },
    {
      value: ".capacity",
      transform: [
        {
          map: {
            attributes: [
              { value: ".capacity", roles: ["title"] },
              { value: ".price", roles: ["key-attribute"], type: "price" },
            ],
          },
        },
      ],
    },
  ],
};

export const phoneBindingWithConditions: BindingItemType = {
  itemId: ".id",
  internalAttributes: [{ id: "type", value: ".type" }],
  attributes: [
    {
      condition: { comparison: { field: ".type", operator: "==", value: "product" } },
      attributes: [
        { value: ".title", roles: ["title"] },
        { value: ".brand", roles: ["subtitle"] },
        { value: ".description", roles: ["description"] },
      ],
    },
    {
      condition: { comparison: { field: ".type", operator: "==", value: "ad" } },
      attributes: [
        { value: ".title", roles: ["title"] },
        { value: ".tag", roles: ["badge"] },
        { value: ".description", roles: ["description"] },
      ],
    },
  ],
};

export const hotelBinding: BindingItemType = {
  itemId: ".itemId",
  attributes: [
    { value: ".details.name", roles: ["title"] },
    { value: ".details.description", roles: ["description"] },
    { value: ".details.rating", roles: ["key-attribute"] },
    { value: ".details.photos[0].images.thumbnail.url", roles: ["thumbnail"], type: "image" },
  ],
  internalAttributes: [
    { id: "lat", value: ".details.latitude" },
    { id: "lng", value: ".details.longitude" },
  ],
};

// ── ODI Factories ────────────────────────────────────────────────────

export function makeODI(overrides: Partial<ODI> = {}): ODI {
  return {
    dataBinding: [{ binding: phoneBinding }],
    overviews: [{ type: "list" }],
    ...overrides,
  };
}

export function makeODIWithDetails(overrides: Partial<ODI> = {}): ODI {
  return {
    dataBinding: [{ binding: phoneBinding }],
    overviews: [
      {
        type: "list",
        detailViews: [
          {
            type: "basic",
            openIn: "pop-up",
            openFrom: ["title", "thumbnail"],
            openBy: "click",
            shownAttributes: "all",
          },
        ],
      },
    ],
    ...overrides,
  };
}

export function makeODIMultiOverview(): ODI {
  return {
    dataBinding: [{ binding: phoneBinding }],
    overviews: [
      { type: "list", id: "overview-list" },
      { type: "grid", id: "overview-grid" },
    ],
  };
}

export function makeODIWithMalleability(malleability: Partial<Malleability> = {}): ODI {
  return {
    dataBinding: [{ binding: phoneBinding }],
    overviews: [{ type: "list" }],
    malleability: {
      disabled: false,
      content: { disabled: false, types: ["toggle"] },
      composition: { disabled: false, types: ["tabs"] },
      layout: { disabled: false, types: ["menus"] },
      ...malleability,
    },
  };
}

// ── FetchedODI Factories ─────────────────────────────────────────────

export function makeFetchedODI(overrides: Partial<FetchedODI> = {}): FetchedODI {
  return {
    dataBinding: [
      {
        binding: phoneBinding,
        items: phoneFetchedItems,
      },
    ],
    overviews: [{ type: "list" }],
    ...overrides,
  };
}

export function makeFetchedODIWithDetails(): FetchedODI {
  return {
    dataBinding: [
      {
        binding: phoneBinding,
        items: phoneFetchedItems,
      },
    ],
    overviews: [
      {
        type: "list",
        id: "overview-1",
        detailViews: [
          {
            id: "detail-1",
            type: "basic",
            openIn: "pop-up",
            openFrom: ["title", "thumbnail"],
            openBy: "click",
            shownAttributes: "all",
          },
        ],
      },
    ],
    detailViews: [
      {
        id: "detail-1",
        type: "basic",
        openIn: "pop-up",
        openFrom: ["title", "thumbnail"],
        openBy: "click",
        shownAttributes: "all",
      },
    ],
  };
}

export function makeFetchedDataBinding(
  overrides: Partial<FetchedDataBindingType> = {}
): FetchedDataBindingType {
  return {
    binding: phoneBinding,
    items: phoneFetchedItems,
    ...overrides,
  };
}
