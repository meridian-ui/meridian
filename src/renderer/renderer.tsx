"use client";

import {
  ItemView,
} from "../spec/spec";
import { useODI } from "../store/odi.store";
import { OverviewBasicList } from "../components/overviews/overview-basic-list";
import { DetailBasic } from "../components/detail-views/detail-basic";
import { useEffect } from "react";
import { denormalizeODI } from "./renderer.denormalize";
import {
  getFirstDetail,
  getFirstOverview,
  filterItemAttributes,
  mapRecursiveAttributes,
} from "./renderer.filter";
import React from "react";
import { MalleabilityAttributesToggle } from "../components/malleability/malleability-content-toggle";
import { ItemProfile } from "../components/item-views/item-profile";
import { rolesToIds } from "../helpers/attribute.helper";
import { MalleabilityOvervewTabs } from "../components/malleability/malleability-overview-tabs";
import {
  detailViewTypesMap,
  itemViewTypesMap,
  overviewTypesMap,
} from "./renderer.defaults";
import {
  getDataBindingById,
  findItemDetailViewToOpen,
  findOverviewById,
  getAttributeDataBindingById,
} from "../helpers/view.helper";


import {
  FetchedItemType,
  FetchedODI,
  ViewOptions,
  FetchedAttributeGroupType,
} from "../spec/spec.internal";

// const ODIRenderer: React.FC<{ odi: BookingODI }> = ({ odi }) => {
//   return (
//     <div>
//       {odi.overviews.map((overview, index) => {
//         switch (overview.type) {
//           case 'basic-list':
//             return <BasicListComponent key={index} {...overview} />;
//           case 'basic-map':
//             return <BasicMapComponent key={index} {...overview} />;
//           default:
//             return null;
//         }
//       })}
//     </div>
//   );
// };

export const MeridianOverview = ({
  overviewIdToShow,
  attribute,
}: {
  overviewIdToShow?: string;
  attribute?: FetchedAttributeGroupType;
}) => {
  const {
    selectedItemEntity,
    odi,
    data: dataLists,
    getSelectedAttributeSet,
    onOpenDetailNewPage,
    onOpenOverviewNewPage,
    enabledMalleability,
    enabledMalleableContent,
    enabledMalleableComposition,
    malleableCompositionSetting,
    activeOverview,
  } = useODI();

  if (!odi) return <></>;
  if (overviewIdToShow) {
    const overview = findOverviewById(odi, overviewIdToShow);

    if (overview) {
      const OverviewComponent =
        overviewTypesMap[overview.type]?.view ?? OverviewBasicList;
      const OverviewWrapper = React.Fragment;

      let items: FetchedItemType[] = [];

      if (attribute) {
        const attributeItems = (getAttributeDataBindingById(
          odi,
          overview.bindingId,
          attribute
        )?.attributes ?? []) as unknown as FetchedItemType[];

        const parentItems = getDataBindingById(odi, overview.bindingId).items;

        const mappedAttributeItems = mapRecursiveAttributes(
          attributeItems,
          parentItems,
          overview.id ?? ""
        );

        // console.log('1', attributeItems, mappedAttributeItems);

        items = filterItemAttributes(
          mappedAttributeItems,
          rolesToIds(
            [...parentItems, ...attributeItems],
            overview.shownAttributes ?? []
          ),
          rolesToIds(attributeItems, overview.hiddenAttributes ?? []),
          ""
        ).map((item) => ({
          ...item,
          id: item.itemId,
        }));
      } else {
        items = filterItemAttributes(
          getDataBindingById(odi, overview.bindingId).items,
          overview.shownAttributes,
          overview.hiddenAttributes,
          overview?.id ?? ""
        );
      }

      // console.log('2', getDataBindingById(odi, overview.bindingId).items);

      // console.log('overview', overview, overview.shownAttributes);
      return (
        <OverviewWrapper key={`${overview.id}-${0}`}>
          {!attribute && enabledMalleableContent() && (
            <MalleabilityAttributesToggle />
          )}
          <OverviewComponent
            overview={overview}
            items={items}
            viewType={"overview"}
            onOpenDetailNewPage={onOpenDetailNewPage ?? (() => {})}
            onOpenOverviewNewPage={onOpenOverviewNewPage ?? (() => {})}
          />
        </OverviewWrapper>
      );
    }
  }

  // console.log("bbbb", odi);

  return (
    <div>
      <div className="flex flex-col">
        {enabledMalleability() && (
          <MalleabilityOvervewTabs />
        )}
        {/* Only show toggle when tabs are not enabled (it's in the toolbar when tabs are enabled) */}
        {/* {enabledMalleableContent() && !malleableCompositionSetting().includes("tabs") && !malleableCompositionSetting().includes("toolbar") && <MalleabilityAttributesToggle />} */}
      </div>
      {odi.overviews
        .filter(
          (overview) =>
            !enabledMalleableComposition() ||
            activeOverview === overview.id
        )
        .map((overview, index) => {
          const OverviewComponent =
            overviewTypesMap[overview.type]?.view ?? OverviewBasicList;
          const OverviewWrapper = React.Fragment;
          const items = filterItemAttributes(
            getDataBindingById(odi, overview.bindingId).items,
            overview.shownAttributes,
            overview.hiddenAttributes,
            "6734625345" // It's empty because I don't need to filter by viewId. This basically removes attributes with the same id as the overview.
          );

          return (
            <OverviewWrapper key={`${overview.id}-${index}`}>
              <OverviewComponent
                overview={overview}
                items={items}
                viewType={"overview"}
                onOpenDetailNewPage={onOpenDetailNewPage ?? (() => {})}
                onOpenOverviewNewPage={onOpenOverviewNewPage ?? (() => {})}
              />
            </OverviewWrapper>
          );
        })}
      {
        // ---- SIDE BY SIDE VIEW ----
        selectedItemEntity?.detail.openIn === "side-by-side" && (
          <div className="">
            <MeridianDetail
              dataLists={dataLists}
              odi={odi}
              itemId={selectedItemEntity?.itemId}
            />
          </div>
        )
      }
    </div>
  );
};

export const MeridianItem = ({
  options,
  item,
  index,
  itemView,
  style,
  className,
}: {
  options: ViewOptions;
  item: FetchedItemType;
  index: number;
  itemView?: ItemView;
  style?: React.CSSProperties;
  className?: string;
}) => {
  const {
    odi,
    selectedItemEntity,
    setSelectedItemEntity,
    getSelectedAttributeSet,
    highlightAttributes,
    onOpenDetailNewPage,
    onOpenOverviewNewPage,
  } = useODI();

  const itemViewType =
    itemView?.type ??
    overviewTypesMap[options.overview.type]?.defaultSpec.itemView?.type ??
    "profile";

  const ItemComponent = itemViewTypesMap[itemViewType]?.view ?? ItemProfile;

  // console.log('detailToOpen', options, odi);
  // Find the detail view that should open from clicking this attribute
  const detailToOpen = findItemDetailViewToOpen(options, odi);

  return (
    <div
      // className="w-fit relative"
      className={`${className}`}
      style={{
        cursor: detailToOpen && !highlightAttributes ? "pointer" : "auto",
        ...style,
      }}
      onClick={(e) => {
        if (detailToOpen && !highlightAttributes) {
          setSelectedItemEntity(
            detailToOpen,
            item.overviewIndex ?? 0,
            item.itemId,
            {
              ...options,
              viewType: "detail",
              overview: {
                ...options.overview,
                detailViews: options.overview.detailViews,
              },
              // details: detailToOpen.details,
            },
            { x: e.clientX, y: e.clientY }
          );
        }
        if (detailToOpen?.openIn === "new-page") {
          // If open in new page, run callback function to route.
          options.onOpenDetailNewPage(options.items[index]);
        }
      }}
    >
      {odi &&
        selectedItemEntity?.itemId === item.itemId &&
        selectedItemEntity?.detail.openIn === "tooltip" && (
          <div
            className="absolute w-[400px] h-fit max-h-[500px] bg-white shadow-2xl h-[96%] rounded-md z-10 overflow-scroll"
            style={{
              left: "calc(50% - 200px)",
              top: -520,
            }}
          >
            <MeridianDetail odi={odi} itemId={item.itemId} />
          </div>
        )}
      <ItemComponent
        options={options}
        item={item}
        index={index}
        className={className + (detailToOpen ? " item-hover" : "")}
        style={style}
      />
    </div>
  );
};

// * Another application idea, that's not really ODI toolkit, but more specification+demo:
// * 1. Specification --> UI --> Screenshot can then provide more info about the spec from the UI
// * 2. A coding framework for ODIs through the spec??
export const MeridianDetail = ({
  odi: fetchedODI,
  dataLists,
  itemId,
  detailId,
  onAction,
}: {
  odi?: FetchedODI; // Accept either FetchedODI or ODI
  dataLists?: any[][];
  itemId: string | undefined;
  // item: FetchedItemType | undefined;
  detailId?: string;
  onAction?: React.MouseEventHandler<HTMLButtonElement>;
}) => {
  const {
    odi,
    setODI,
    setOriginalODI,
    selectedItemEntity,
    setSelectedItemEntity,
    getSelectedAttributeSet,
    setOnOpenNewPage,
  } = useODI();

  // Only set the ODI from the imported spec variable if DNE in the store.
  useEffect(() => {
    if (fetchedODI && !odi && dataLists) {
      if (fetchedODI) {
        setODI(denormalizeODI(fetchedODI));
        setOriginalODI(denormalizeODI(fetchedODI));
      }
    }
  }, [fetchedODI]);

  // Get default overview and detail view if selected detail content isn't found in the store.
  useEffect(() => {
    if (!selectedItemEntity && odi) {
      if (detailId) {
        const allDetailViews = odi.overviews
          .flatMap((overview) =>
            overview.detailViews
              ?.map((d) => {
                // Convert string references to actual detail view objects
                const detailView =
                  typeof d === "string"
                    ? odi.detailViews?.find((dv) => dv.id === d)
                    : d;
                return detailView ? { detailView, overview } : null;
              })
              .filter(Boolean)
          )
          .concat(
            odi.detailViews?.map((d) => ({
              detailView: d,
              overview: odi.overviews[0],
            })) || []
          );
        const overviewDetailObject = allDetailViews.find(
          (detail) => detail?.detailView.id === detailId
        );

        if (overviewDetailObject && itemId) {
          setSelectedItemEntity(
            overviewDetailObject.detailView,
            odi.overviews.findIndex(
              (overview) => overview.id === overviewDetailObject.overview.id
            ),
            itemId,
            {
              overview: overviewDetailObject.overview,
              items:
                getDataBindingById(
                  odi,
                  overviewDetailObject?.overview?.bindingId ??
                    overviewDetailObject?.detailView?.bindingId
                )?.items || [],
              viewType: "detail",
              onOpenDetailNewPage: () => {},
              onOpenOverviewNewPage: () => {},
            },
            { x: 0, y: 0 }
          );
        }
      } else {
        const firstOverview = getFirstOverview(odi);
        const firstDetail = getFirstDetail(odi);
        if (itemId) {
          setSelectedItemEntity(
            firstDetail,
            0,
            itemId,
            {
              overview: firstOverview,
              items:
                getDataBindingById(
                  odi,
                  firstOverview?.bindingId ?? firstDetail?.bindingId
                )?.items || [],
              viewType: "detail",
              onOpenDetailNewPage: () => {},
              onOpenOverviewNewPage: () => {},
            },
            { x: 0, y: 0 }
          );
        }
      }
    }
  }, [itemId, odi]);

  const selectedItem = getSelectedAttributeSet();
  if (selectedItem && odi) {
    const DetailComponent =
      detailViewTypesMap[selectedItemEntity?.detail.type ?? "basic"]?.view ??
      DetailBasic;

    return (
      <div className="">
        {(odi?.malleability?.disabled === false ||
          odi?.malleability?.disabled === undefined) && (
          <MalleabilityAttributesToggle />
        )}
        <DetailComponent item={selectedItem} />
      </div>
    );
  } else {
    return <div></div>;
  }
};
