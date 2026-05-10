import { create } from "zustand";
import { AttributeType, DetailView, ODI } from "../spec/spec";
import { filterItemAttributes } from "../renderer/renderer.filter";
import { emptyAttributeSet, addOverviewType, addItemViewType, addDetailViewType, addAttributeType } from "../renderer/renderer.defaults";
import { XYPosition } from "../helpers/utils.helper";
import { FetchedItemType, FetchedODI, ViewOptions } from "../spec/spec.internal";
import { getFetchedODIFromData } from "../renderer/renderer.data-bind";
import { checkDataLists } from "../helpers/view.helper";

// Import the store creators but don't spread them yet
import { createODIMalleabilityStore, ODIMalleabilityStore } from "./odi-malleability.store";
import { createODINavigationStore, ODINavigationStore } from "./odi-navigation.store";

export type ZustandSet = {
  (partial: ODIStore | Partial<ODIStore> | ((state: ODIStore) => ODIStore | Partial<ODIStore>), replace?: false): void;
  (state: ODIStore | ((state: ODIStore) => ODIStore), replace: true): void;
}
export type ZustandGet = () => ODIStore

export interface ODIStore extends ODIMalleabilityStore, ODINavigationStore {
  odi: FetchedODI | undefined;
  originalOdi: FetchedODI | undefined;
  data: any;
  setODI: (odi: Partial<FetchedODI> | undefined) => void;
  setOriginalODI: (originalOdi: FetchedODI) => void;
  setData: (data: any) => void;
  initialize: (data: any, odi: ODI, customTypes?: {
    customOverviewTypes?: any[];
    customItemViewTypes?: any[];
    customDetailViewTypes?: any[];
    customAttributeTypes?: any[];
  }, navigationHandlers?: {
    onOpenDetailNewPage: (item: FetchedItemType) => void;
    onOpenOverviewNewPage: () => void;
  }) => void;

  addAttributeBinding: (attribute: AttributeType, isInternal?: boolean) => AttributeType | undefined;
  removeAttributeBinding: (attribute: AttributeType) => void;

  selectedItemEntity: { detail: DetailView; overviewIndex: number, itemId: string, options: ViewOptions, mousePosition: XYPosition } | null;
  setSelectedItemEntity: (detail: DetailView, overviewIndex: number, itemId: string, options: ViewOptions, mousePosition: XYPosition) => void;
  clearSelectedItemEntity: () => void;
  getSelectedAttributeSet: () => FetchedItemType | undefined;
}

export const useODI = create<ODIStore>((set, get) => {
  // Create the store slices
  const malleabilityStore = createODIMalleabilityStore(set, get);
  const navigationStore = createODINavigationStore(set, get);

  return {
    // Main store state
    odi: undefined,
    originalOdi: undefined,
    data: [],
    setODI: (odi) => set((state) => ({ odi: 
      odi ? {
        ...state.odi,
        ...odi,
        dataBinding: odi.dataBinding ?? []
      } as FetchedODI : undefined
    })),
    setOriginalODI: (originalOdi) => set({originalOdi}),
    setData: (data) => set({data}),
    initialize: (dataInitial, odiInitial, customTypes, navigationHandlers) => {
      const processedData = checkDataLists(dataInitial);
      set({ data: processedData });
      
      if (customTypes) {
        customTypes.customOverviewTypes?.forEach(overviewType => addOverviewType(overviewType));
        customTypes.customItemViewTypes?.forEach(itemViewType => addItemViewType(itemViewType));
        customTypes.customDetailViewTypes?.forEach(detailViewType => addDetailViewType(detailViewType));
        customTypes.customAttributeTypes?.forEach(attributeType => addAttributeType(attributeType));
      }

      const fetchedODI = getFetchedODIFromData(processedData, odiInitial);

      if (fetchedODI) {
        set({ 
          odi: fetchedODI,
          originalOdi: fetchedODI
        });
        
        if (navigationHandlers) {
          const { setOnOpenNewPage } = get();
          setOnOpenNewPage(navigationHandlers);
        }
      }
    },
    addAttributeBinding: (attribute: AttributeType, isInternal?: boolean) => {
      const { data } = get();
      if (!data) return;

      const { odi } = get();
      if (!odi) return;

      const updatedOdi = getFetchedODIFromData(
        data,
        {
          ...odi,
          dataBinding: odi.dataBinding.map(source => ({
            ...source,
            binding: {
              ...source.binding,
              ...(isInternal ? { internalAttributes: [
                ...(source.binding.internalAttributes ?? []),
                attribute
              ] } : {}),
              attributes: [...source.binding.attributes, !isInternal ? attribute : undefined].filter(Boolean) as AttributeType[]
            }
          }))
        }
      );

      if (updatedOdi) {
        set({ odi: updatedOdi });
        const newAttribute = updatedOdi.dataBinding?.[0]?.binding?.attributes?.find(
          attr => attr.value === attribute.value
        );
        return newAttribute;
      }

      return undefined;
    },

    removeAttributeBinding: (attribute: AttributeType) => {
      const { data } = get();
      if (!data) return;

      const { odi } = get();
      if (!odi) return;

      const updatedOdi = getFetchedODIFromData(
        data,
        {
          ...odi,
          dataBinding: odi.dataBinding.map(source => ({
            ...source,
            binding: {
              ...source.binding,
              attributes: source.binding.attributes.filter(
                attr => attr.value !== attribute.value
              )
            }
          }))
        }
      );

      if (updatedOdi) {
        set({ odi: updatedOdi });
      }
    },

    selectedItemEntity: null,
    setSelectedItemEntity: (detail, overviewIndex, itemId, options, mousePosition) => {
      const safeDetail = detail || null;
      set({ selectedItemEntity: { 
        detail: safeDetail, 
        overviewIndex, 
        itemId, 
        options, 
        mousePosition 
      }});
    },
    clearSelectedItemEntity: () => set({ selectedItemEntity: null }),
    getSelectedAttributeSet: () => {
      const { selectedItemEntity, odi } = get();

      if (!selectedItemEntity || !odi) return undefined;

      const overview = odi.overviews && selectedItemEntity.overviewIndex >= 0 ? 
        odi.overviews[selectedItemEntity.overviewIndex] : undefined;

      const overviewItem = overview?.items && selectedItemEntity.itemId ? 
      overview.items.find(item => item.itemId === selectedItemEntity.itemId) : undefined;

      const detailItem = selectedItemEntity.detail?.items && selectedItemEntity.itemId ? 
      selectedItemEntity.detail.items.find(item => item.itemId === selectedItemEntity.itemId) : undefined;

      const mergedAttributes = overviewItem || detailItem || emptyAttributeSet;
      const shownAttributes = selectedItemEntity.detail?.shownAttributes || [];
      const hiddenAttributes =selectedItemEntity.detail?.hiddenAttributes || [];

      const filteredAttributes = filterItemAttributes(
        [mergedAttributes],
        shownAttributes,
        hiddenAttributes,
        selectedItemEntity.options.viewType || "default"
      )[0];

      return filteredAttributes;
    },

    // Spread the store slices
    ...malleabilityStore,
    ...navigationStore,
  };
});