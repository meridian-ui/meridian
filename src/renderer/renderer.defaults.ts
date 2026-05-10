import { JSX } from "react";
import { OverviewBasicGrid } from "../components/overviews/overview-basic-grid";
import { OverviewBasicList } from "../components/overviews/overview-basic-list";
import { basicMapDefault, OverviewBasicMap } from "../components/overviews/overview-basic-map";
import { Overview,DetailView, Malleability, OverviewConfig, ItemViewConfig, DetailViewConfig, Role, AttributeValueType } from "../spec/spec";
import { ItemProfile } from "../components/item-views/item-profile";
import { DetailBasic } from "../components/detail-views/detail-basic";
import { ItemPin } from "../components/item-views/item-pin";
import { basicTableDefaultSpec, OverviewBasicTable } from "../components/overviews/overivew-basic-table";
import { ItemCompact } from "../components/item-views/item-compact";
import { FetchedItemType, ViewOptions } from "../spec/spec.internal";
import { AttributePrice } from "../components/attributes/attribute-price";
import { AttributeProps } from "./renderer.props";
import { ItemVertical } from "../components/item-views/item-vertical";

// ---- ROLE TYPES ----

export const roleTypesMap: Record<string, Role> = {
  "title": "title",
  "subtitle": "subtitle",
  "description": "description",
  "key-attribute": "key-attribute",
  "action": "action",
  "link": "link",
  "tag": "tag",
  "badge": "badge",
  "thumbnail": "thumbnail",
  "caption": "caption",
  "spec": "spec",
  "footer": "footer",
};


// ---- OVERVIEW TYPES ----

export interface CustomOverviewType extends OverviewConfig {
  type: string;
  [key: string]: any;
}

export type OverviewTypeConfig<T extends OverviewConfig> = {
  type: string;
  view: (overviewOptions: ViewOptions) => JSX.Element;
  defaultSpec: Partial<T>;
};

export const overviewTypesMap: Record<string, OverviewTypeConfig<Overview>> = {
  "list": { type: "list", view: OverviewBasicList, defaultSpec: {} },
  "grid": { type: "grid", view: OverviewBasicGrid, defaultSpec: { itemView: { type: "vertical" } } },
  "table": { type: "table", view: OverviewBasicTable, defaultSpec: basicTableDefaultSpec },
  "map": { type: "map", view: OverviewBasicMap, defaultSpec: basicMapDefault },
};

export const getOverviewTypesMap = () => ({ ...overviewTypesMap });

export const addOverviewType = <T extends Overview>(
  config: OverviewTypeConfig<T>
) => {
  overviewTypesMap[config.type] = config;
};

// ---- ITEM TYPES ----

export interface CustomItemViewType extends ItemViewConfig {
  type: string;
  [key: string]: any;
}

export type ItemViewTypeConfig = {
  type: string;
  view: (({
    options,
    item,
    index,
  }: {
    options: ViewOptions;
    item: FetchedItemType;
    index: number;
    className?: string;
    style?: React.CSSProperties;
  }) => JSX.Element) | React.FC<{
    options: ViewOptions;
    item: FetchedItemType;
    index: number;
    className?: string;
    style?: React.CSSProperties;
  }>;
};

export const itemViewTypesMap: Record<string, ItemViewTypeConfig> = {
  "profile": { type: "profile", view: ItemProfile },
  "pin": { type: "pin", view: ItemPin },
  "compact": { type: "compact", view: ItemCompact },
  "vertical": { type: "vertical", view: ItemVertical },
};

export const getItemViewTypesMap = () => ({ ...itemViewTypesMap });

export const addItemViewType = (config: ItemViewTypeConfig) => {
  itemViewTypesMap[config.type] = config;
};

// ---- DETAIL TYPES ----

export interface CustomDetailViewType extends DetailViewConfig {
  type: string;
  [key: string]: any;
}

export type DetailViewTypeConfig<T extends CustomDetailViewType> = {
  type: string;
  view: ({ item }: { item: FetchedItemType | undefined }) => JSX.Element;
  defaultSpec: Partial<T>;
};

export const detailViewTypesMap: Record<string, DetailViewTypeConfig<CustomDetailViewType>> = {
  "basic": { type: "basic", view: DetailBasic, defaultSpec: {} },
};

export const getDetailViewTypesMap = () => ({ ...detailViewTypesMap });

export const addDetailViewType = (config: DetailViewTypeConfig<CustomDetailViewType>) => {
  detailViewTypesMap[config.type] = config;
};


// ---- ATTRIBUTE TYPES ----

export interface AttributeTypeConfig {
  type: AttributeValueType;
  view: (options: AttributeProps) => JSX.Element;
}

export const attributeTypesMap: Record<string, AttributeTypeConfig> = {
  "price": { type: "price", view: AttributePrice },
};

export const getAttributeTypesMap = () => ({ ...attributeTypesMap });

export const addAttributeType = (config: AttributeTypeConfig) => {
  attributeTypesMap[config.type] = config;
};



export const emptyAttributeSet: FetchedItemType = {
  itemId: "",
  index: 0,
  overviewIndex: 0,
  roles: [],
  attributes: [],
  internalAttributes: [],
};


export const defaultDetailView: DetailView = {
  type: "basic",
  openIn: "pop-up",
  // openFrom: { title: true, thumbnail: true },
  openFrom: ["thumbnail", "title"],
  openBy: "click",
  shownAttributes: "all",
};

export const defaultOverview: Overview = {
  type: "list",
  detailViews: [defaultDetailView],
};



// ---- MALLEABILITY TYPES ----

export const defaultMalleability: Malleability = {
  disabled: false,
  content: {
    disabled: false,
    types: ["toggle"],
  },
  composition: {
    disabled: false,
    types: ["tabs", "toolbar"],
  },
  layout: {
    disabled: false,
    types: ["menus"],
  }
};

export const defaultMalleabilityDimension = {
  content: ["toggle"],
  composition: ["tabs", "toolbar"],
  layout: ["menus"],
};