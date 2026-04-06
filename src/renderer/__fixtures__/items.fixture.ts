/**
 * Shared test fixtures: FetchedItemType and FetchedAttributeType factories.
 * Inspired by the gallery example apps (phones, hotels).
 */
import {
  FetchedItemType,
  FetchedAttributeValueType,
  FetchedAttributeGroupType,
  FetchedAttributeType,
} from "../../spec/spec.internal";

// ── Attribute Factories ──────────────────────────────────────────────

export function makeValueAttr(
  overrides: Partial<FetchedAttributeValueType> = {}
): FetchedAttributeValueType {
  return {
    id: "attr-1",
    index: 0,
    itemIndex: 0,
    overviewIndex: 0,
    path: ".name",
    value: "Default Value",
    ...overrides,
  };
}

export function makeGroupAttr(
  overrides: Partial<FetchedAttributeGroupType> & {
    attributes?: FetchedAttributeType[];
  } = {}
): FetchedAttributeGroupType {
  return {
    id: "group-1",
    index: 0,
    itemIndex: 0,
    overviewIndex: 0,
    path: "",
    attributes: [],
    ...overrides,
  };
}

// ── Item Factory ─────────────────────────────────────────────────────

export function makeItem(
  overrides: Partial<FetchedItemType> = {}
): FetchedItemType {
  return {
    itemId: "item-0",
    index: 0,
    overviewIndex: 0,
    attributes: [],
    internalAttributes: [],
    ...overrides,
  };
}

// ── Realistic Phone Data (inspired by gallery/d2-1) ─────────────────

export const phoneRawData = [
  {
    id: "iphone-16-pro-max",
    type: "product",
    brand: "Apple",
    title: "iPhone 16 Pro Max",
    rating: 4.2,
    reviews: 8540,
    badge: "Trade an old iPhone, any condition",
    description: "iPhone 16 Pro Max. Built for Apple Intelligence.",
    features: ["Action button", "A18 Pro chip", "48MP camera"],
    colors: [
      { name: "Desert Titanium", hex: "#B79A86" },
      { name: "Natural Titanium", hex: "#C4C0B7" },
    ],
    capacity: [
      { capacity: "256 GB", price: 33.34, retailPrice: 1199.99 },
      { capacity: "512 GB", price: 40.0, retailPrice: 1399.99 },
    ],
  },
  {
    id: "galaxy-s24-ultra",
    type: "product",
    brand: "Samsung",
    title: "Galaxy S24 Ultra",
    rating: 4.5,
    reviews: 6200,
    badge: "New release",
    description: "Galaxy S24 Ultra with Galaxy AI.",
    features: ["S Pen built-in", "Snapdragon 8 Gen 3", "200MP camera"],
    colors: [{ name: "Titanium Black", hex: "#1A1A1A" }],
    capacity: [{ capacity: "256 GB", price: 30.56, retailPrice: 1099.99 }],
  },
  {
    id: "att-ad",
    type: "ad",
    title: "Switch to AT&T today",
    description: "Get up to $800 per line",
    tag: "Limited time offer",
    imgsrc: "/examples/r1/assets/card-offer.webp",
    offers: [
      { header: "", text: "Up to $800 via reward card", linkName: "See details" },
    ],
  },
];

// ── Realistic Hotel Data (inspired by gallery/hotels) ────────────────

export const hotelRawData = [
  {
    itemId: "77391",
    details: {
      name: "La Jolla Cove Hotel",
      description: "Escape to an oceanfront getaway",
      rating: "3.5",
      num_reviews: "1657",
      price_level: "$$$",
      latitude: "32.84991",
      longitude: "-117.2733",
      address_obj: {
        street1: "1155 Coast Blvd",
        city: "La Jolla",
        state: "California",
        country: "United States",
      },
      photos: [
        {
          images: {
            original: { url: "https://example.com/hotel1.jpg" },
            thumbnail: { url: "https://example.com/hotel1-thumb.jpg" },
          },
        },
      ],
    },
  },
  {
    itemId: "80075",
    details: {
      name: "Hotel del Coronado",
      description: "Historic beachfront resort",
      rating: "4.5",
      num_reviews: "9300",
      price_level: "$$$$",
      latitude: "32.6810",
      longitude: "-117.1783",
      address_obj: {
        street1: "1500 Orange Ave",
        city: "Coronado",
        state: "California",
        country: "United States",
      },
      photos: [
        {
          images: {
            original: { url: "https://example.com/hotel2.jpg" },
            thumbnail: { url: "https://example.com/hotel2-thumb.jpg" },
          },
        },
      ],
    },
  },
];

// ── Pre-built FetchedItemType arrays ─────────────────────────────────

/** A simple list of fetched items with value attributes and roles */
export const phoneFetchedItems: FetchedItemType[] = [
  makeItem({
    itemId: "iphone-16-pro-max",
    index: 0,
    attributes: [
      makeValueAttr({ id: "title", index: 0, path: ".title", value: "iPhone 16 Pro Max", roles: ["title"] }),
      makeValueAttr({ id: "brand", index: 1, path: ".brand", value: "Apple", roles: ["subtitle"] }),
      makeValueAttr({ id: "description", index: 2, path: ".description", value: "iPhone 16 Pro Max. Built for Apple Intelligence.", roles: ["description"] }),
      makeValueAttr({ id: "badge", index: 3, path: ".badge", value: "Trade an old iPhone, any condition", roles: ["badge"] }),
      makeValueAttr({ id: "rating", index: 4, path: ".rating", value: 4.2 as any, roles: ["key-attribute"] }),
    ],
  }),
  makeItem({
    itemId: "galaxy-s24-ultra",
    index: 1,
    attributes: [
      makeValueAttr({ id: "title", index: 0, path: ".title", value: "Galaxy S24 Ultra", roles: ["title"], itemIndex: 1 }),
      makeValueAttr({ id: "brand", index: 1, path: ".brand", value: "Samsung", roles: ["subtitle"], itemIndex: 1 }),
      makeValueAttr({ id: "description", index: 2, path: ".description", value: "Galaxy S24 Ultra with Galaxy AI.", roles: ["description"], itemIndex: 1 }),
    ],
  }),
];

/** Items with nested group attributes (features as a group) */
export const phoneItemsWithGroups: FetchedItemType[] = [
  makeItem({
    itemId: "iphone-16-pro-max",
    index: 0,
    attributes: [
      makeValueAttr({ id: "title", index: 0, path: ".title", value: "iPhone 16 Pro Max", roles: ["title"] }),
      makeGroupAttr({
        id: "features",
        index: 1,
        path: ".features",
        roles: ["spec"],
        attributes: [
          makeValueAttr({ id: "features.0", index: 0, path: ".features[0]", value: "Action button" }),
          makeValueAttr({ id: "features.1", index: 1, path: ".features[1]", value: "A18 Pro chip" }),
          makeValueAttr({ id: "features.2", index: 2, path: ".features[2]", value: "48MP camera" }),
        ],
      }),
      makeGroupAttr({
        id: "capacity",
        index: 2,
        path: ".capacity",
        attributes: [
          makeValueAttr({ id: "capacity.0", index: 0, path: ".capacity[0].capacity", value: "256 GB" }),
          makeValueAttr({ id: "capacity.1", index: 1, path: ".capacity[1].capacity", value: "512 GB" }),
        ],
      }),
    ],
  }),
];
