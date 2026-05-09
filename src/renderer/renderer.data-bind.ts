// Functions that will map a JSON list object to FetchedItemType[], using a DataBinding object

import { isAttributeType } from "../helpers/spec.helper";
import { AttributeTransformType, AttributeConditionType, AttributeType, BindingItemType, ODI, Overview, DataBindingType } from "../spec/spec";
import { FetchedAttributeType, FetchedAttributeGroupType, FetchedAttributeValueType, FetchedItemType, FetchedODI } from "../spec/spec.internal";
import { denormalizeODI } from "./renderer.denormalize";

// ---- ---------------- ----
// ---- HELPER FUNCTIONS ----
// ---- ---------------- ----

/**
 * Resolve a value from an object using a path string.
 * Supports simple dot-notation and array indices.
 * E.g. ".details.photos[0]?.images.original.url"
 */
export function resolveValue(obj: any, path: string | undefined): any {
  if (!path) return undefined;
  // Ensure path is a string
  if (typeof path !== "string") {
    console.warn("resolveValue received non-string path:", path);
    return undefined;
  }
  // Remove a leading '.' if present.
  if (path[0] === ".") path = path.substring(1);

  const parts = path.split(".").filter(part => part !== "");
  let current = obj;
  for (let part of parts) {
    if (current == null) return undefined;
    // Handle optional chaining if provided (e.g., "photos[0]?" or "[0]?")
    part = part.replace(/\?$/, "");
    // Check for array notation e.g., "photos[0]"
    const arrayMatch = part.match(/(.*?)\[(\d+)\]$/);
    if (arrayMatch) {
      const prop = arrayMatch[1];
      const index = parseInt(arrayMatch[2], 10);
      current = current[prop];
      if (Array.isArray(current)) {
        current = current[index];
      } else {
        return null;
      }
    } else {
      current = current[part];
    }
  }
  return current;
}

/**
 * Recursively resolves an internalAttributes value.
 * If the value is a string starting with a dot, it is treated as a binding path.
 * Arrays and objects are processed recursively.
 */
function resolveInternalAttributes(internalAttrs: any, item: any): any {
  if (typeof internalAttrs === "string") {
    // If the string starts with a dot, treat it as a binding path.
    if (internalAttrs.startsWith(".")) {
      return resolveValue(item, internalAttrs);
    } else {
      return internalAttrs;
    }
  } else if (Array.isArray(internalAttrs)) {
    return internalAttrs.map(attr => resolveInternalAttributes(attr, item));
  } else if (internalAttrs !== null && typeof internalAttrs === "object") {
    const result: any = {};
    Object.keys(internalAttrs).forEach(key => {
      result[key] = resolveInternalAttributes(internalAttrs[key], item);
    });
    return result;
  }
  return internalAttrs;
}

/**
 * Apply any transforms to a value.
 * Each transform can specify:
 * - A new value via a path (t.value)
 * - A mapping operation (t.map) that works on arrays or objects
 *   - Can be a string path or an object with attributes for nested mapping
 * - A filter operation (t.filter) that filters an array based on a condition string or AttributeConditionType.
 * - A slice operation (t.slice) that extracts a subset of an array using start and end indices.
 */
function applyTransform(value: any, transforms: AttributeTransformType[], item: any, parentId?: string): any {
  let transformed = value;
  transforms.forEach(t => {
    if (t.value) {
      // Replace the value with the one resolved from the item.
      transformed = resolveValue(item, t.value);
    }
    if (t.map) {
      if (typeof t.map === "string") {
        // If transformed is an array, map each element using the string path
        if (Array.isArray(transformed)) {
          transformed = transformed.map(elem => {
            // Special case: if map is just ".", return the element itself
            if (t.map === ".") {
              return elem;
            }
            return resolveValue(elem, t.map as string);
          });
        } else {
          // Special case: if map is just ".", return the value itself
          if (t.map === ".") {
            transformed = transformed;
          } else {
            transformed = resolveValue(transformed, t.map as string);
          }
        }
      } else if (typeof t.map === "object" && t.map?.attributes) {
        // Handle the case where map contains attributes for nested mapping
        if (Array.isArray(transformed)) {
          // Map each element using the attributes definition
          transformed = transformed.map(elem => {
            // Process each attribute with its transforms before mapping
            const processedAttributes = (t.map as {attributes: AttributeType[]}).attributes.map(attr => {
              // Create a copy of the attribute to avoid modifying the original
              const attrCopy = {...attr};
              return attrCopy;
            });
            // Return a properly structured object with attributes instead of just the mapped attributes
            return {
              attributes: mapAttributes(elem, 0, processedAttributes, parentId)
            };
          });
        } else if (transformed) {
          // Apply to a single object
          const processedAttributes = (t.map as {attributes: AttributeType[]}).attributes.map(attr => {
            // Create a copy of the attribute to avoid modifying the original
            const attrCopy = {...attr};
            return attrCopy;
          });
          transformed = mapAttributes(transformed, 0, processedAttributes, parentId);
        }
      }
    }
    if (t.filter) {
      // For a filter, we assume transformed is an array.
      if (Array.isArray(transformed)) {
        if (typeof t.filter === "string") {
          // Use the string-based filter evaluator
          transformed = transformed.filter(elem => {
            return evalFilter(t.filter as string, elem);
          });
        } else {
          // Use the condition-based filter
          transformed = transformed.filter(elem => {
            return evaluateCondition(elem, t.filter as AttributeConditionType);
          });
        }
      }
    }
    if (t.slice && Array.isArray(transformed)) {
      // Apply slice operation to extract a subset of the array
      const start = t.slice.start || 0;
      const end = t.slice.end !== undefined ? t.slice.end : transformed.length;
      transformed = transformed.slice(start, end);
    }
  });
  return transformed;
}

/**
 * A very basic filter evaluator.
 * WARNING: For a production system, use a safe evaluation method.
 */
function evalFilter(filterExpr: string, datum: any): boolean {
  try {
    // `datum` is passed in as a parameter to the function.
    return Function("datum", `return ${filterExpr}`)(datum);
  } catch (e) {
    console.error("Error evaluating filter:", filterExpr, e);
    return false;
  }
}


// ---- -------------------- ----
// ---- CONDITION EVALUATION ----
// ---- -------------------- ----

/**
 * Evaluates an AttributeConditionType against an item.
 */
function evaluateCondition(item: any, condition: AttributeConditionType): boolean {
  // Check an "exists" condition.
  if (condition.exists) {
    const existsValue = resolveValue(item, condition.exists);
    if (!existsValue) return false;
  }
  // Check a "comparison" condition.
  if (condition.comparison) {
    const { field, operator, value } = condition.comparison;
    const fieldValue = resolveValue(item, field);
    switch (operator) {
      case "==": if (fieldValue != value) return false; break;
      case "!=": if (fieldValue == value) return false; break;
      case ">":  if (fieldValue <= value) return false; break;
      case "<":  if (fieldValue >= value) return false; break;
      case ">=": if (fieldValue < value) return false; break;
      case "<=": if (fieldValue > value) return false; break;
    }
  }
  // Evaluate "and" conditions.
  if (condition.and) {
    for (const cond of condition.and) {
      if (!evaluateCondition(item, cond)) return false;
    }
  }
  // Evaluate "or" conditions.
  if (condition.or) {
    let any = false;
    for (const cond of condition.or) {
      if (evaluateCondition(item, cond)) {
        any = true;
        break;
      }
    }
    if (!any) return false;
  }
  // Evaluate "not" conditions (if any condition is true, return false).
  if (condition.not) {
    for (const cond of condition.not) {
      if (evaluateCondition(item, cond)) return false;
    }
  }
  return true;
}

// ---- ----------------- ----
// ---- ATTRIBUTE MAPPING ----
// ---- ----------------- ----

/**
 * Maps an array of AttributeType to an array of FetchedAttributeType.
 * This function handles both value attributes and groups (nested attributes).
 */
function mapAttributes(item: any, itemIndex: number, attributes: AttributeType[], parentId?: string): FetchedAttributeType[] {
  const mapped: FetchedAttributeType[] = [];
  attributes.forEach((attr, attrIndex) => {
    // If a condition is defined and fails, skip this attribute.
    if (attr.condition && !evaluateCondition(item, attr.condition)) {
      return;
    }
    const id = attr.type === "overview" 
      ? attr.id??"" 
      : attr.id 
        ? attr.id : (parentId && parentId !== "undefined") 
          ? `${parentId}-${attrIndex}` : `${attrIndex}`;

    // If there are nested attributes, treat this as a group.
    if (attr.attributes && attr.attributes.length > 0) {
      const group: FetchedAttributeGroupType = {
        id,
        index: attrIndex,
        overviewIndex: -1, // To be assigned overviewIndex in denormalizer
        itemIndex,
        label: attr.label,
        roles: attr.roles,
        path: attr.value || "",
        type: attr.type,
        attributes: mapAttributes(item, itemIndex, attr.attributes, id)
      };
      mapped.push(group);
    } else {
      // For a simple value attribute.
      let val = resolveValue(item, attr.value || "");
      
      // Apply transforms if present
      if (attr.transform) {
        val = applyTransform(val, attr.transform, item, id);
      }

      // Special case for the 'features' role with map: '.' transform
      // Check if this is a features attribute with a transform that maps to '.'
      if (attr.roles?.includes("features") && 
          attr.transform?.some(t => t.map === ".") && 
          Array.isArray(val)) {
        // Create a group attribute to hold the features
        const group: FetchedAttributeGroupType = {
          id,
          index: attrIndex,
          overviewIndex: -1,
          itemIndex,
          label: attr.label,
          roles: attr.roles,
          path: attr.value || "",
          type: attr.type || "group",
          attributes: val.map((feature, idx) => ({
            id: `${id}-${idx}`,
            index: idx,
            itemIndex: itemIndex,
            overviewIndex: -1,
            label: "",
            roles: [],
            path: "",
            value: feature,
            type: "text"
          }))
        };
        mapped.push(group);
      } else if (attr.type === "overview" && Array.isArray(val) && val.length > 0 && val[0]?.attributes) {

        // Create a group attribute to hold the list of items with attributes
        const group: FetchedAttributeGroupType = {
          id,
          index: attrIndex,
          overviewIndex: -1, // To be assigned overviewIndex in denormalizer
          itemIndex,
          label: attr.label,
          roles: attr.roles,
          path: attr.value || "",
          type: attr.type,
          attributes: val.map((item, idx) => {
            const overviewAttributes = mapAttributes(item, itemIndex, item.attributes, `${id}-${idx}`);
            const attribute = overviewAttributes.find(a => a && "path" in a && a.path === attr.itemId);
            return {
              id: `${id}-${idx}`,
              index: idx,
              overviewIndex: idx,
              itemId: attribute ? (isAttributeType(attribute) ? attribute.value : attribute.itemId) : undefined,
              attributes: overviewAttributes
            };
          }) as FetchedAttributeType[]
        };
        mapped.push(group);
      } else if (Array.isArray(val) && val.length > 0 && val[0]?.attributes) {
        // Create a group attribute to hold the list of items with attributes
        const group: FetchedAttributeGroupType = {
          id,
          index: attrIndex,
          overviewIndex: -1, // To be assigned overviewIndex in denormalizer
          itemIndex,
          label: attr.label,
          roles: attr.roles,
          path: attr.value || "",
          type: attr.type,
          attributes: val.map((item, idx) => ({
            id: `${id}-${idx}`,
            index: idx,
            itemIndex: itemIndex,
            itemId: attr.itemId,
            attributes: mapAttributes(item, itemIndex, item.attributes, `${id}-${idx}`)
          })) as FetchedAttributeType[]
        };
        mapped.push(group);
      } else {
        // Handle as a regular value attribute
        // if (attr.value === '.term') {
        //   console.log('val', val, attr)
        // }



        const fetchedValue: FetchedAttributeValueType = {
          id,
          index: attrIndex,
          itemIndex,
          overviewIndex: -1, // To be assigned overviewIndex in denormalizer
          label: attr.label,
          roles: attr.roles,
          path: "path" in attr ? attr.path as string : attr.value || "",
          value: val ?? attr.value, // ?? attr.value,
          type: attr.type
        };


        // if (itemIndex === 0 &&'itemIndex' in attr && attr.itemIndex === 0 && attr.id === 'synonyms-list-0') {
        //   if (val) {
        //     console.log('val', attr.value, fetchedValue)
        //   } else {
        //     console.log('no val', attr.value, fetchedValue)
        //   }
        // }
  

        mapped.push(fetchedValue);
      }
    }
  });
  return mapped;
}

// ---- --------------------- ----
// ---- MAIN MAPPING FUNCTION ----
// ---- --------------------- ----

/**
 * Maps a list of JSON objects to a FetchedItemType[] list
 * This can be either a JSON list or a CSV list.
 * based on a DataBinding configuration.
 */
export const mapDataToFetchedItems = (data: any[], binding: BindingItemType): FetchedItemType[] => {
  // console.log('json', jsonList)
  return data.map((item, index) => {
    const fetchedItem: FetchedItemType = {
      itemId: resolveValue(item, binding.itemId),
      index,
      attributes: mapAttributes(item, index, binding.attributes),
      internalAttributes: mapAttributes(item, index, binding.internalAttributes ?? []),
    };

    return fetchedItem;
  });
};

/**
 * Recursively finds all overview objects that reference their ancestors.
 * @param overview The current overview to check
 * @param ancestors Set of ancestor IDs to check against
 * @returns Array of recursive overviews
 */
const findRecursiveOverviews = (
  overview: Overview, 
  ancestors: Set<string> = new Set()
): Overview[] => {
  const recursiveViews: Overview[] = [];
  const currentAncestors = new Set(ancestors);
  
  // Add current overview ID to ancestors
  if (overview.id) {
    currentAncestors.add(overview.id);
  }
  
  // Check if any detail view references an ancestor
  if (overview.detailViews) {
    for (const detailView of overview.detailViews) {
      // Extract the ID whether detailView is a string or an object
      const detailViewId = typeof detailView === "string" ? detailView : detailView.id;
      if (detailViewId && currentAncestors.has(detailViewId)) {
        // This overview references an ancestor, so it's recursive
        recursiveViews.push(overview);
        break;
      }
    }
  }
  
  // Recursively check nested overviews if they exist
  if (overview.overviews) {
    for (const nestedItem of overview.overviews) {
      // Skip if it's just a string ID reference
      if (typeof nestedItem === "string") continue;

      const nestedRecursiveViews = findRecursiveOverviews(nestedItem, currentAncestors);
      recursiveViews.push(...nestedRecursiveViews);
    }
  }
  
  return recursiveViews;
};

/**
 * Finds all recursive views in an ODI specification.
 * A view is recursive if it references one of its ancestors.
 * @param odi The ODI specification
 * @returns Array of recursive overviews
 */
export const getRecursiveAttributes = (odi: ODI | FetchedODI): AttributeType[] => {
  const recursiveViews: Overview[] = [];
  
  // Check top-level overviews
  if (odi.overviews) {
    for (const overview of odi.overviews) {
      const foundViews = findRecursiveOverviews(overview);
      recursiveViews.push(...foundViews);
    }
  }
  
  // Check detail views that might contain overviews
  if (odi.detailViews) {
    for (const detailView of odi.detailViews) {
      if (detailView.overviews) {
        for (const overview of detailView.overviews) {
          if (typeof overview === "string") continue;
          // For detail view overviews, include the detail view ID in ancestors
          const ancestors = new Set<string>();
          if (detailView.id) {
            ancestors.add(detailView.id);
          }
          const foundViews = findRecursiveOverviews(overview, ancestors);
          recursiveViews.push(...foundViews);
        }
      }
    }
  }
  
  // Turn the recursive views into attributes with the type 'overview' and roles being the value of showIn.
  const recursiveAttributes = recursiveViews.map((view) => {
    return {
      id: view.id,
      label: "Overview",
      roles: view.showIn,
      path: "",
      value: view.attributeBindingId,
      type: "overview"
    };
  });

  return recursiveAttributes;
};

const getGetFetchedBindingsOfViews = (recursiveAttributes: AttributeType[], dataBinding: DataBindingType[]) => {

  const newDataBinding = dataBinding.map(db => {
    // Create new attributes for each recursive attribute by duplicating the referenced attribute
    const newAttributes = recursiveAttributes.flatMap(recAttr => {
      // Find the original attribute to duplicate (like 'synonyms')
      const originalAttr = db.binding.attributes.find(attr => attr.id === recAttr.value);
      if (!originalAttr) return [];

      // Create a new attribute based on the original one
      return {
        ...JSON.parse(JSON.stringify(originalAttr)), // Deep clone
        ...recAttr,
        path: originalAttr.id,
        value: originalAttr.value,

      };
    });

    return {
      ...db,
      binding: {
        ...db.binding,
        attributes: db.binding.attributes.map(attr => {
          const newAttr = newAttributes.find(newAttr => newAttr.path === attr.id);
          return newAttr ? {
            ...attr,
            ...newAttr
          } : attr;
        })
      }
    };
  });

  return newDataBinding;
};

export const getFetchedODIFromData = (data: any, odi: ODI): FetchedODI | null => {


  // Find recursive views that will need special handling
  const recursiveAttributes = getRecursiveAttributes(odi);

  const newBinding = getGetFetchedBindingsOfViews(recursiveAttributes, odi.dataBinding);

  // console.log('newBinding', newBinding);

  // Create a mapped ODI with fetched items for each data binding
  const mappedODI: FetchedODI = {
    ...odi,
    dataBinding: newBinding.map((source) => {
      // Get the collection of items using pathToItems (default to the data object itself)
      const pathToItems = source.binding.pathToItems || ".";
      const items = resolveValue(data, pathToItems);

      if (!items) {
        console.error(`Could not find items at path: ${pathToItems}`);
        return {
          ...source,
          items: []
        };
      }

      // Map the items using the binding configuration
      return {
        ...source,
        items: mapDataToFetchedItems(Array.isArray(items) ? items : [items], source.binding)
      };
    })
  };

  console.log("mappedODI", mappedODI);

  return denormalizeODI(mappedODI);
};