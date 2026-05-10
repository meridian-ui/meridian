import { addAttributeToScope, attributeInScope, filterAttributeFromScope } from "../helpers/attribute.helper";
import { findOverview, findOverviewFromItsDetail, getDataBindingById } from "../helpers/view.helper";
import { defaultDetailView, defaultOverview, overviewTypesMap, addOverviewType } from "../renderer/renderer.defaults";
import { denormalizeOverview } from "../renderer/renderer.denormalize";
import { MalleableCompositionType, OverviewConfig, OverviewType, } from "../spec/spec";
import { ViewType } from "../helpers/spec.helper";
import { ODIStore, ZustandGet, ZustandSet } from "./odi.store";
import { FetchedAttributeType } from "../spec/spec.internal";
import { getFetchedODIFromData } from "../renderer/renderer.data-bind";
import { OverviewCustom } from "../components/overviews/overview-custom";

export interface ODIMalleabilityStore {
  // ---- STATE CHECKERS ----

  malleabilityConsoleOpen: boolean;
  setMalleabilityConsoleOpen: (open: boolean) => void;
  enabledMalleability: () => boolean;
  enabledMalleableContent: () => boolean;
  enabledMalleableComposition: () => boolean;
  enabledMalleableLayout: () => boolean;
  malleableCompositionSetting: () => MalleableCompositionType[];


  // ---- CONTENT: STATE ----
  highlightAttributes: boolean;
  setHighlightAttributes: (highlightAttributes: boolean) => void;

  selectedAttributes: string[]; // list of attributeIds
  attributeIsSelected: (attribute: FetchedAttributeType) => boolean;
  toggleSelectedAttribute: (attribute: FetchedAttributeType) => void; // When you click an attribute, you either select or deselect it.

  lastSelected: {
    position: { x: number, y: number };
    view: ViewType;
    id: string;
  }
  setLastSelected: (x: number, y: number, view: ViewType, id: string) => void;
  clearSelection: () => void;

  // ---- COMPOSITION: STATE ----

  activeOverview: string; // Id of the active overview
  setActiveOverview: (overviewId: string) => void;
  // I need to support changes in multiple overviews?


  // ---- CONTENT: SPEC ----
  setSpecShownAttributes: (type: "show" | "hide") => void;


  // ---- COMPOSITION: SPEC ----

  addNewOverview: (overview?: OverviewConfig) => void;
  removeOverview: (overviewId: string) => void;

  addNewDetailView: () => void;
  removeDetailView: (detailViewId: string) => void;

  addDesignSpaceVariations: (attributeName: string, attributeValue: string | string[], allValues: string[] | undefined) => void;

  // ---- LAYOUT: SPEC ----

  setLayoutOverview: (overviewId: string, type: OverviewType) => void;
  // setLayoutItem: (itemId: string, type: Overview['type']) => void;
  // setLayoutDetail: (detailId: string, type: Overview['type']) => void;

  // Add the missing type definitions
  itemViewStyle: { [key: string]: any };
  setItemViewStyle: (style: { [key: string]: any }) => void;

  // ---- CUSTOM LAYOUTS ----
  customLayouts: CustomLayout[];
  getCustomLayouts: () => CustomLayout[];
  addCustomLayout: (name: string, id: string, code: string) => boolean;
  removeCustomLayout: (id: string) => void;
}

export interface CustomLayout {
  name: string;
  id: string;
  code: string;
}

const CUSTOM_LAYOUTS_STORAGE_KEY = "meridian-custom-layouts";

const loadCustomLayouts = (): CustomLayout[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(CUSTOM_LAYOUTS_STORAGE_KEY);
    const layouts = stored ? JSON.parse(stored) : [];
    // Register all custom layouts with overviewTypesMap
    layouts.forEach((layout: CustomLayout) => {
      if (!overviewTypesMap[layout.id]) {
        addOverviewType({
          type: layout.id,
          view: OverviewCustom,
          defaultSpec: {},
        });
      }
    });
    return layouts;
  } catch {
    return [];
  }
};

const saveCustomLayouts = (layouts: CustomLayout[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CUSTOM_LAYOUTS_STORAGE_KEY, JSON.stringify(layouts));
  } catch (error) {
    console.error("Failed to save custom layouts:", error);
  }
};

// Add this helper function before the useODIMalleability definition
export const createNewOverview = (
  odi: any,
  activeOverviewId: string,
  customOverview?: OverviewConfig,
  newId?: boolean
): OverviewConfig => {
  // Find the active overview to copy
  const activeOverview = odi.overviews.find((o: any) => o.id === activeOverviewId);

  // Ensure the new overview has a unique ID
  const newOverview = {
    id: `${odi.overviews.length}`,
    ...(customOverview ??
      (activeOverview ? JSON.parse(JSON.stringify(activeOverview)) : defaultOverview)),
    ...customOverview,
    ...(newId ? { id: `${odi.overviews.length}` } : {})
  };


  return newOverview;
};

export const createODIMalleabilityStore = (set: ZustandSet, get: ZustandGet): ODIMalleabilityStore => ({

  // ---- STATE CHECKERS ----

  malleabilityConsoleOpen: false,
  setMalleabilityConsoleOpen: (open) => set({ malleabilityConsoleOpen: open }),

  enabledMalleability: () => {
    const { odi } = get();
    if (odi?.malleability?.disabled) return false;
    return !odi?.malleability?.content?.disabled ||
    !odi?.malleability?.composition?.disabled ||
    !odi?.malleability?.layout?.disabled;
  },

  enabledMalleableContent: () => {
    const { odi } = get();
    return !odi?.malleability?.disabled && !odi?.malleability?.content?.disabled;
  },
  enabledMalleableComposition: () => {
    const { odi } = get();
    return !odi?.malleability?.disabled && !odi?.malleability?.composition?.disabled;
  },
  enabledMalleableLayout: () => {
    const { odi } = get();
    return !odi?.malleability?.disabled && !odi?.malleability?.layout?.disabled;
  },
  malleableCompositionSetting: () => {
    const { odi } = get();
    return (!odi?.malleability?.disabled && !odi?.malleability?.composition?.disabled)
      ? odi?.malleability?.composition?.types ?? []
      : [];
  },


  // ---- CONTENT: STATE ----

  highlightAttributes: false,
  setHighlightAttributes: (highlightAttributes) => set({
    highlightAttributes,
    ...(highlightAttributes === false ? { selectedAttributes: [] } : {})
  }),

  selectedAttributes: [],
  attributeIsSelected: (attribute) => {
    const { selectedAttributes } = get();
    return !!attributeInScope(selectedAttributes, attribute);
  },
  toggleSelectedAttribute: (attribute) =>
    set((state) => {
      if (!attribute) return {};

      const exists = state.selectedAttributes.find(attributeId => attributeId === attribute.id);

      return {
        selectedAttributes: exists
          ? filterAttributeFromScope(state.selectedAttributes, attribute)
          : addAttributeToScope(state.selectedAttributes, attribute),
      } as Partial<ODIStore>;
    }),

  lastSelected: {
    position: { x: 0, y: 0 },
    view: "overview",
    id: "",
  },
  setLastSelected: (x, y, view, id) => set({ lastSelected: { position: { x, y }, view, id } }),
  clearSelection: () => set({
    selectedAttributes: [], lastSelected: {
      position: { x: 0, y: 0 },
      view: "overview",
      id: "",
    }
  }),

  // ---- COMPOSITION: STATE ----

  activeOverview: "0",
  setActiveOverview: (overviewId) => set({ activeOverview: overviewId }),

  // ---- CONTENT: SPEC ----

  /**
   * This function is tasked to change the list of shownAttributes and hiddenAttributes. These lists are already "flattened",
   * in other words, even if the spec contains Role or Id strings, or even "all" a processing function has already processed
   * the lists and replaced them with an entire list of Ids.
   * @param type - 'show' | 'hide'
   */
  setSpecShownAttributes: (type) => set((state) => {
    if (!state.lastSelected.id) return {};

    if (state.lastSelected.view === "detail" && type === "show") {
      // * For now, if one is true the other should be true as well. Just adding this to make sure.

      const foundOverview = findOverviewFromItsDetail(state.odi, state.lastSelected.id);

      if (foundOverview) {
        if (!foundOverview.shownAttributes) {
          // if shownAttributes doesn't exist. But it should be there by default from the processing algorithm.
          foundOverview.shownAttributes = [...state.selectedAttributes];
        } else if (foundOverview.shownAttributes !== "all") {
          // Likely the case that shownAttributes already exists. Add the selectedAttributes to the list

          // Remove selectedAttributes from the hiddenAttributes if it exists in there.
          foundOverview.hiddenAttributes = foundOverview.hiddenAttributes?.filter(scope =>
            // If the Id exists, remove that.
            !state.selectedAttributes.includes(scope)
          );
          console.log("sdfadsa", state.selectedAttributes);

          foundOverview.shownAttributes.push(...state.selectedAttributes);
        }
        return { odi: state.odi };
      }

    } else if (state.lastSelected.view === "overview" && type === "hide") {
      // * For now, if one is true the other should be true as well. Just adding this to make sure.

      const foundOverview = findOverview(state.odi, state.lastSelected.id);

      if (foundOverview) {
        if (!foundOverview.hiddenAttributes) {
          foundOverview.hiddenAttributes = [...state.selectedAttributes];
        } else {
          foundOverview.hiddenAttributes!.push(...state.selectedAttributes);
        }
        return { odi: state.odi };
      }
    }
    return {};
  }),

  // ---- COMPOSITION SPEC ----

  addNewOverview: (overview) => set((state) => {
    const odi = state.odi;
    if (odi) {
      // Use the helper function to create a new overview
      const newOverview = createNewOverview(odi, state.activeOverview, overview, true);
      console.log("overviews", odi.overviews);
      console.log("newOverview", newOverview);
      odi.overviews.push(newOverview);
      const fetchedODI = getFetchedODIFromData(state.data, odi);
      return { odi: fetchedODI ?? undefined };  // Convert null to undefined
    }
    return {};
  }),
  removeOverview: (overviewId: string) => set((state) => {
    const odi = state.odi;
    if (odi) {
      odi.overviews = odi.overviews.filter(overview => overview.id !== overviewId);
      const fetchedODI = getFetchedODIFromData(state.data, odi);
      return { odi: fetchedODI ?? undefined };  // Convert null to undefined
    }
    return {};
  }),

  addNewDetailView: () => set((state) => {
    const odi = state.odi;
    if (odi) {
      const overview = odi.overviews.find(o => o.id === state.activeOverview);
      if (overview && overview.detailViews) {
        overview.detailViews.push(defaultDetailView);
      }
      const fetchedODI = getFetchedODIFromData(state.data, odi);
      return { odi: fetchedODI ?? undefined };  // Convert null to undefined
    }
    return {};
  }),
  removeDetailView: (detailViewId: string) => set((state) => {
    const odi = state.odi;
    if (odi) {
      const overview = odi.overviews.find(o => o.id === state.activeOverview);
      if (overview && overview.detailViews) {
        overview.detailViews = overview.detailViews.filter(detailView => (typeof detailView === "string" ? detailView : detailView.id) !== detailViewId);
      }
      const fetchedODI = getFetchedODIFromData(state.data, odi);
      return { odi: fetchedODI ?? undefined };  // Convert null to undefined
    }
    return {};
  }),

  // Add this function to your ODI store
  addDesignSpaceVariations: (attributeName: string, attributeValue: string | string[], allValues: string[] | undefined) => set((state) => {
    const odi = state.odi;
    if (odi) {

      if (allValues) {
        const newOverviews = allValues.filter(value => value !== attributeValue).map((value, index) => {
          // Make a copy of the current ODI spec
          const currentSpec = JSON.parse(JSON.stringify(odi));

          if (!currentSpec.overviews) {
            currentSpec.overviews = [];
          }

          // Add the new overview to the spec
          const newOverview = createNewOverview(currentSpec, state.activeOverview, {
            type: attributeValue,
            [attributeName]: value,
            id: `${currentSpec.overviews.length + index}`,
          } as OverviewConfig);
          return newOverview;
        });

        odi.overviews.push(...newOverviews);
      }

      // Process through getFetchedODIFromData to ensure proper typing
      const fetchedODI = getFetchedODIFromData(state.data, odi);
      return { odi: fetchedODI ?? undefined };
    }
    return {};
  }),




  // ---- LAYOUT: SPEC ----

  setLayoutOverview: (overviewId, type) => set((state) => {
    const foundOverview = findOverview(state.odi, overviewId);
    if (state.odi && foundOverview) {
      foundOverview.type = type;
      state.odi.overviews = state.odi.overviews.map((overview, i) =>
      ({
        ...(overview.id === foundOverview.id
          ? denormalizeOverview(
            state.odi!,
            foundOverview,
            0,
            overviewTypesMap[type]?.defaultSpec,
            getDataBindingById(state.odi, foundOverview.bindingId),
            true
          )
          : overview),
        id: overview.id,
      })
      );
      return { odi: state.odi };
    }
    return {};
  }),
  itemViewStyle: {
    width: "300px",
    height: "auto",
    transform: "scale(1)",
  },
  setItemViewStyle: (style) =>
    set({ itemViewStyle: style }),

  // ---- CUSTOM LAYOUTS ----
  customLayouts: loadCustomLayouts(),
  getCustomLayouts: () => {
    const { customLayouts } = get();
    return customLayouts;
  },
  addCustomLayout: (name, id, code) => {
    // Validate ID
    if (!/^[a-z0-9-]+$/.test(id)) {
      return false;
    }

    const { customLayouts } = get();

    // Check if ID already exists in custom layouts or in overviewTypesMap (including config-based custom overview types)
    if (customLayouts.find(l => l.id === id) || overviewTypesMap[id]) {
      return false;
    }

    // Register the custom layout with overviewTypesMap
    addOverviewType({
      type: id,
      view: OverviewCustom,
      defaultSpec: {},
    });

    const newLayouts = [...customLayouts, { name, id, code }];
    saveCustomLayouts(newLayouts);
    set({ customLayouts: newLayouts });
    return true;
  },
  removeCustomLayout: (id) => {
    const { customLayouts } = get();
    const newLayouts = customLayouts.filter(l => l.id !== id);
    saveCustomLayouts(newLayouts);
    // Note: We don't remove from overviewTypesMap to avoid breaking existing overviews
    // The component will handle missing layouts gracefully
    set({ customLayouts: newLayouts });
  },

});

// getSelectedAttributeSet: () => AttributeSet | undefined;
