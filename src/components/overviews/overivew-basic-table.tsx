import { isAttributeType } from "../../helpers/spec.helper";
import { toTitleCase } from "../../helpers/utils.helper";
import { OverviewConfig } from "../../spec/spec";
import {
  FetchedAttributeGroupType,
  FetchedItemType,
  ViewOptions,
} from "../../spec/spec.internal";
import { useODI } from "../../store/odi.store";
import { Attribute } from "../../renderer/attribute";
import "./overview-basic.scss";
import { findItemDetailViewToOpen } from "../../helpers/view.helper";

export interface OverviewBasicTableType extends OverviewConfig {
  type: "table";
}

export const basicTableDefaultSpec: Partial<OverviewBasicTableType> = {
  shownAttributes: "all",
  itemView: { type: "row" },
};

export const OverviewBasicTable = (options: ViewOptions) => {
  const { odi, setSelectedItemEntity, highlightAttributes } = useODI();

  const sampleItem = options.items[0] as FetchedItemType | undefined;

  // Build header information from sample item attributes
  // Filter out null/hidden attributes to ensure headers align with visible columns
  // Use label if available, otherwise fall back to role (converted to title case)
  const headerInfo = sampleItem?.attributes
    .filter((attr) => attr !== null && attr !== undefined) // Filter out hidden attributes
    .map((attr) => {
      const role = attr?.id ?? "Attribute";
      // Get label if available (for regular attributes)
      const label = isAttributeType(attr) ? attr?.label : undefined;
      return {
        role,
        label,
        headerText: label || toTitleCase(role)
      };
    }) || [];

  // Use the function to get the detail view
  const detailToOpen = findItemDetailViewToOpen(options, odi);

  return (
    <div
      className={`overview-basic overview-basic-table ${options.overview.className ?? ''}`}
      style={options.overview.style}
    >
      <div className="table-container">
        <table>
          <thead>
            <tr>
              {headerInfo.map((header, index) => (
                <th key={index}>{header.headerText}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {options.items.map((item, index) => (
              <tr
                key={index}
                className={options.overview.itemClassName}
                style={{
                  cursor:
                    detailToOpen && !highlightAttributes ? "pointer" : "auto",
                  ...options.overview.itemStyle,
                }}
                onClick={(e) => {
                  if (detailToOpen && !highlightAttributes) {
                    setSelectedItemEntity(
                      detailToOpen,
                      item.overviewIndex ?? 0,
                      item.itemId ?? "",
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
                {item.attributes
                  .filter((attr) => attr !== null && attr !== undefined) // Filter out hidden attributes
                  .map((attribute, i) => {
                    // Handle both regular attributes and attribute groups
                    if (isAttributeType(attribute)) {
                      return (
                        <td key={`a-v-${index}-${i}-${attribute?.id}`}>
                          <Attribute
                            className={`attribute
                            ${attribute.type === "image" ? "image" : "non-image"
                              }`}
                            options={options}
                            attribute={attribute}
                          />
                        </td>
                      );
                    } else if (
                      (attribute as FetchedAttributeGroupType)?.attributes
                    ) {
                      // Handle attribute groups by rendering their nested attributes
                      const attrGroup = attribute as FetchedAttributeGroupType;
                      // Also filter out null nested attributes
                      const visibleNestedAttrs = attrGroup.attributes.filter(
                        (nested) => nested !== null && nested !== undefined
                      );
                      return visibleNestedAttrs.map((nestedAttr, j) => (
                        <td key={`a-v-${index}-${i}-${j}-${nestedAttr?.id}`}>
                          <Attribute
                            className={`attribute
                            ${isAttributeType(nestedAttr) &&
                                nestedAttr.type === "image"
                                ? "image"
                                : "non-image"
                              }`}
                            style={{
                              width: "200px",
                            }}
                            options={options}
                            attribute={nestedAttr}
                          />
                        </td>
                      ));
                    }
                    return null;
                  })}
                {/* <MeridianItem options={options} item={item} index={index} /> */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
