import {
  AdvancedMarker,
  APIProvider,
  Map,
} from "@vis.gl/react-google-maps";
import { MeridianItem } from "../../renderer/renderer";
import { OverviewConfig } from "../../spec/spec";
import { useODI } from "../../store/odi.store";
import { useState } from "react";
import {
  FetchedItemType,
  ViewOptions,
  FetchedAttributeValueType,
} from "../../spec/spec.internal";

export interface OverviewBasicMapType extends OverviewConfig {
  type: "map";
  // positions: { lat: number; lng: number }[];
  // googleMapsAPIKey: string | undefined;
  // itemType: ''
  // details: [
  //   {
  //     type: "basic";
  //     openFrom: ["item"];
  //   }
  // ];
}

export const basicMapDefault: Partial<OverviewBasicMapType> = {
  shownAttributes: ["key-attribute"],
  itemView: { type: "pin" },
  detailViews: [
    {
      type: "basic",
      openIn: "pop-up",
      openFrom: ["item"],
    },
  ],
};

const getCoords = (items: FetchedItemType[]): (Position | undefined)[] => {
  const coordinates = items.map((item) => {
    // Collect coordinates from internalAttributes
    const latAttribute = item.internalAttributes?.find(
      (attr) => attr && 'path' in attr && typeof attr === "object" 
      && (attr as FetchedAttributeValueType).path === ".lat"
    ) as FetchedAttributeValueType || undefined;

    const lngAttribute = item.internalAttributes?.find(
      (attr) => attr && 'path' in attr && typeof attr === "object" 
      && (attr as FetchedAttributeValueType).path === ".lng"
    ) as FetchedAttributeValueType || undefined;

    const numberCoordinate = {
      lat: parseFloat(
        (latAttribute as FetchedAttributeValueType)?.value ?? "0"
      ),
      lng: parseFloat(
        (lngAttribute as FetchedAttributeValueType)?.value ?? "0"
      ),
    };

    // Check for Google Maps API Key in internalAttributes (if defined that way)
    // if (
    //   !googleMapsAPIKey &&
    //   typeof item.internalAttributes?.googleMapsAPIKey === 'string'
    // ) {
    //   googleMapsAPIKey = item.internalAttributes.googleMapsAPIKey;
    // }

    // Optional: Check attributes as a fallback for information
    // if (!googleMapsAPIKey) {
    //   const apiKeyAttr = item.attributes.find(
    //     (attr) => attr && "value" in attr && attr.id === "googleMapsAPIKey"
    //   );
    //   if (apiKeyAttr) {
    //     googleMapsAPIKey = String((apiKeyAttr as any).value);
    //   }
    // }
    return numberCoordinate;
  });

  return coordinates;
};

export const OverviewBasicMap = (options: ViewOptions) => {
  const mapOverview = options.overview as OverviewBasicMapType;

  const { odi, setSelectedItemEntity, highlightAttributes } = useODI();
  const [hoveredItemId, setHoveredItemId] = useState("");

  const coordinates = getCoords(odi?.dataBinding[0].items ?? []);
  const googleMapsAPIKey = mapOverview.googleMapsAPIKey;
  const googleMapsAPIId = mapOverview.googleMapsAPIId;

  // console.log(coordinates, googleMapsAPIKey);

  // Ensure every position has both lat and lng defined
  if (!coordinates?.every((p) => p && p.lat && p.lng)) {
    return <>No positions</>;
  }

  const { defaultCenter, defaultZoom } = calculateMapBounds(coordinates);

  // Find the detail view that should open from clicking this attribute
  const detailToOpen = mapOverview.detailViews?.find(
    (detail) => typeof detail === "object" && detail.openFrom?.includes("item")
  );

  return (
    <div
      className={`w-full h-full flex flex-col items-center py-8 px-4 ${options.overview.className ?? ''}`}
      style={options.overview.style}
    >
      {/* <div className="flex flex-row flex-wrap gap-4">
        {options.items.map((item, index) => (
          <div key={index} className="w-[500px]">
            <MeridianItem
              options={options}
              item={item}
              index={index}
              type={options.overview.itemType ?? 'profile'}
            />
          </div>
        ))}
      </div> */}
      {/* api: {mapOverview.googleMapsAPIKey} */}
      <div className="w-full h-[90vh]">
        <APIProvider apiKey={googleMapsAPIKey ?? ""}>
          <Map
            key={"map" + mapOverview.id}
            mapId={googleMapsAPIId}
            style={{
              width: "100%",
              height: "100%",
            }}
            // className="gm-style"
            defaultCenter={defaultCenter}
            defaultZoom={defaultZoom}
            // maxZoom={6}
            // minZoom={4}
            // gestureHandling={'greedy'}
            // isFractionalZoomEnabled={true}
            // disableDoubleClickZoom={true}
            // disableDefaultUI={true}
            // onZoomChanged={(e) => {
            //   // console.log('zoom changed', e);
            //   setZoom(e.detail.zoom);
            // }}
            // onClick={(e) => {
            //   console.log(zoom, e.map.getCenter()?.toString());
            //   clearSelectedProperties();
            //   setIsSelecting(false);
            // }}
          >
            {coordinates &&
              options.items.map((item, index) => {
                // const location = item.;
                const position = coordinates.at(index);
                return (
                  <AdvancedMarker
                    key={`${item?.itemId}-${index}`}
                    position={position}
                    zIndex={hoveredItemId === item?.itemId ? 6 : 3}
                  >
                    <div
                      className={`w-[fit-content] max-w-[500px] bg-white border border-gray-400 rounded-2xl shadow-md shadow-black/40
                      transition ${
                        detailToOpen && !highlightAttributes
                          ? "hover:scale-[1.12] active:scale-[1]"
                          : ""
                      }
                      `}
                      onMouseDown={(e) => e.stopPropagation()}
                      onWheel={(e) => {
                        const detailItem = document.getElementById(
                          `map-item-${item?.itemId}`
                        );
                        if (
                          detailItem &&
                          detailItem.scrollHeight > detailItem.clientHeight
                        ) {
                          e.stopPropagation();
                        }
                      }}
                      onMouseOver={() => setHoveredItemId(item?.itemId ?? "")}
                      // onClick={() => {
                      //   if (detailToOpen && !highlightAttributes) {
                      //     const generalItem = options.items.at(index);
                      //     if (generalItem && !('value' in generalItem)) {
                      //       // console.log('test', detailToOpen, options, attribute.itemIndex);
                      //       setSelectedItemEntity(
                      //         detailToOpen,
                      //         generalItem.overviewIndex ?? 0,
                      //         index,
                      //         {
                      //           ...options,
                      //           viewType: 'detail',
                      //           overview: {
                      //             ...options.overview,
                      //             details: options.overview.details,
                      //           },
                      //         }
                      //       );
                      //     }
                      //     if (detailToOpen.openIn === 'new-page') {
                      //       // If open in new page, run callback function to route.
                      //       options.onOpenDetailNewPage(options.items[index]);
                      //     }
                      //   }
                      // }}
                      // onMouseOver={() => setHoveredItemId(item.__id)}
                    >
                      <MeridianItem
                        item={item}
                        options={options}
                        index={index}
                        itemView={options.overview.itemView}
                        className={options.overview.itemClassName}
                        style={options.overview.itemStyle}
                      />
                    </div>
                  </AdvancedMarker>
                );
              })}
            {/* {items.map((item) => {
                  const location = getLocation(item);
                  return (
                    <AdvancedMarker
                      key={location.key}
                      position={location.location}
                      className={`max-w-[700px]`}
                      zIndex={
                        selectedItemId === item.__id ||
                        hoveredItemId === item.__id
                          ? 6
                          : 3
                      }
                      onClick={() => {}}
                    >
                      <div
                        className="w-[fit-content]"
                        onMouseDown={(e) => e.stopPropagation()}
                        onWheel={(e) => {
                          const detailItem = document.getElementById(
                            `map-detail-master-${item.__id}`
                          );
                          if (
                            detailItem &&
                            detailItem.scrollHeight > detailItem.clientHeight
                          ) {
                            e.stopPropagation();
                          }
                        }}
                        onClick={() => {
                          setSelectedItemId(item.__id);
                        }}
                        // onMouseOver={() => setHoveredItemId(item.__id)}
                      >
                        <BookingMapDetail
                          type="master"
                          item={item}
                          masterView={masterView}
                        />
                      </div>
                    </AdvancedMarker>
                  );
                })} */}
          </Map>
        </APIProvider>
      </div>
    </div>
  );
};

type Position = {
  lat: number;
  lng: number;
};

type MapBounds = {
  defaultCenter: Position;
  defaultZoom: number;
};

const calculateMapBounds = (positions: (Position | undefined)[]): MapBounds => {
  const positionsFiltered = positions.filter(Boolean) as Position[];

  // Handle empty array or undefined positions
  if (!positionsFiltered || positionsFiltered.length === 0) {
    return {
      defaultCenter: { lat: 0, lng: 0 },
      defaultZoom: 2,
    };
  }

  // If only one position exists, center on it with a higher zoom
  if (positionsFiltered.length === 1) {
    return {
      defaultCenter: positionsFiltered[0],
      defaultZoom: 14, // Increased from 13
    };
  }

  // Find the bounds of all positions
  const bounds = {
    north: -90,
    south: 90,
    east: -180,
    west: 180,
  };

  // Calculate the bounds that contain all markers
  positionsFiltered.forEach((position) => {
    bounds.north = Math.max(bounds.north, position.lat);
    bounds.south = Math.min(bounds.south, position.lat);
    bounds.east = Math.max(bounds.east, position.lng);
    bounds.west = Math.min(bounds.west, position.lng);
  });

  // Calculate center
  const defaultCenter: Position = {
    lat: (bounds.north + bounds.south) / 2,
    lng: (bounds.east + bounds.west) / 2,
  };

  // Calculate zoom based on the size of the bounding box
  const latDistance = bounds.north - bounds.south;
  const lngDistance = bounds.east - bounds.west;

  // Reduce padding to allow for closer zoom
  const padding = 2; // Reduced from 0.5
  const paddedLatDistance = latDistance + padding;
  const paddedLngDistance = lngDistance + padding;

  // Calculate zoom based on the larger of the two dimensions
  const latZoom = Math.log2(360 / paddedLatDistance);
  const lngZoom = Math.log2(360 / paddedLngDistance);

  // Use the smaller zoom level to ensure all markers are visible
  let defaultZoom = Math.floor(Math.min(latZoom, lngZoom));

  // Add a zoom boost to get closer by default
  const zoomBoost = 5; // Increase this value for more zoom
  defaultZoom += zoomBoost;

  // Constrain zoom to reasonable limits
  defaultZoom = Math.max(defaultZoom, 4); // Don't zoom out beyond minZoom
  defaultZoom = Math.min(defaultZoom, 15); // Don't zoom in too far

  return { defaultCenter, defaultZoom };
};
