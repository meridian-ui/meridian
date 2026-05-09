import { useState, useEffect, useRef } from "react";
import { toTitleCase } from "../../helpers/utils.helper";
import { OverviewType } from "../../spec/spec";
import { useODI } from "../../store/odi.store";
import { DropdownMenu } from "../ui/dropdown-menu";
import { overviewTypesMap } from "../../renderer/renderer.defaults";
import "./malleability.scss";
// import { ReactComponent as DeleteIcon } from '../../assets/delete-tab.svg';

// Define view mode types
type ViewMode = "tabs" | "side-by-side" | "stacked";

export const MalleabilityOvervewTabs = () => {
  const {
    odi,
    activeOverview,
    setActiveOverview,
    addNewOverview,
    removeOverview,
    setLayoutOverview,
    setMalleabilityConsoleOpen,
    customLayouts,
    highlightAttributes,
    setHighlightAttributes,
    enabledMalleableContent,
    enabledMalleableComposition,
    enabledMalleableLayout,
    malleableCompositionSetting
  } = useODI();

  const [hoveredOverview, setHoveredOverview] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("tabs");
  const [showViewModeDropdown, setShowViewModeDropdown] = useState(false);
  const [showOverviewLayoutsDropdown, setShowOverviewLayoutsDropdown] = useState(false);
  const overviewLayoutsDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close overview layouts dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        overviewLayoutsDropdownRef.current &&
        !overviewLayoutsDropdownRef.current.contains(event.target as Node)
      ) {
        setShowOverviewLayoutsDropdown(false);
      }
    };

    if (showOverviewLayoutsDropdown) {
      document.addEventListener("mouseup", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mouseup", handleClickOutside);
    };
  }, [showOverviewLayoutsDropdown]);

  const viewModeOptions: ViewMode[] = ["tabs", "side-by-side", "stacked"];

  // Default layouts (hardcoded)
  const defaultLayoutTypes = ["list", "grid", "table", "map"];

  // Get all available overview types from the map
  const allOverviewTypes = Object.keys(overviewTypesMap);

  // Get custom layout IDs from UI (stored in localStorage)
  const uiCustomLayoutIds = customLayouts?.map(l => l.id) || [];

  // Separate default layouts from custom overview types
  const defaultLayouts = allOverviewTypes.filter(type => defaultLayoutTypes.includes(type));
  // Custom overview types from config (exclude UI-created ones to avoid duplicates)
  const configCustomOverviewTypes = allOverviewTypes.filter(
    type => !defaultLayoutTypes.includes(type) && !uiCustomLayoutIds.includes(type)
  );

  // Get icon for overview type (matching HTML toolbar icons)
  const getOverviewIcon = (type: string) => {
    switch (type) {
      case "map":
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 4L6 2L10 4L14 2V12L10 14L6 12L2 14V4Z"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        );
      case "grid":
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect
              x="2"
              y="2"
              width="5"
              height="5"
              rx="1"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <rect
              x="9"
              y="2"
              width="5"
              height="5"
              rx="1"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <rect
              x="2"
              y="9"
              width="5"
              height="5"
              rx="1"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <rect
              x="9"
              y="9"
              width="5"
              height="5"
              rx="1"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        );
      case "list":
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="3" width="12" height="2" rx="1" fill="currentColor" />
            <rect x="2" y="7" width="12" height="2" rx="1" fill="currentColor" />
            <rect x="2" y="11" width="12" height="2" rx="1" fill="currentColor" />
          </svg>
        );
      case "table":
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect
              x="2"
              y="2"
              width="12"
              height="12"
              rx="1"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <line
              x1="8"
              y1="2"
              x2="8"
              y2="14"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <line
              x1="2"
              y1="8"
              x2="14"
              y2="8"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        );
      default:
        // Custom layout icon (star)
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 2L10 6L14 7L11 10L12 14L8 12L4 14L5 10L2 7L6 6L8 2Z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="0.5"
            />
          </svg>
        );
    }
  };

  return (
    <>
      <div className="overview-tabs-container">
        {/* <div className="view-mode-selector">
          <button
            className="view-mode-button"
            onClick={() => setShowViewModeDropdown(!showViewModeDropdown)}
          >
            {toTitleCase(viewMode)}
            <svg
              width="6"
              height="10"
              viewBox="0 0 6 10"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`chevron ${showViewModeDropdown ? 'clicked' : ''}`}
            >
              <path
                d="M1 9L5 5"
                stroke="black"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M1 1L5 5"
                stroke="black"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          {showViewModeDropdown && (
            <div className="view-mode-dropdown">
              <DropdownMenu
                items={viewModeOptions}
                onSelectItem={(item) => {
                  setViewMode(item as ViewMode);
                  setShowViewModeDropdown(false);
                }}
                onClickAway={() => setShowViewModeDropdown(false)}
              />
            </div>
          )}
        </div> */}
        <div className={`overview-tabs overview-${viewMode}`}>
          <div className="toolbar-content">
            {malleableCompositionSetting().includes('tabs') && odi?.overviews.map((overview, index) => (
              <div
                key={`${overview.id}-${index}`}
                className={`overview-tab toolbar-item ${activeOverview === overview.id
                  ? "overview-tab-active"
                  : "overview-tab-inactive"
                  }`}
                onMouseEnter={() => setHoveredOverview(overview.id ?? null)}
                onMouseLeave={() => setHoveredOverview(null)}
                onClick={() => {
                  if (activeOverview !== overview.id) {
                    setActiveOverview(overview.id ?? "");
                  }
                }}
              >
                <span className="">{toTitleCase(overview.type)}</span>
                {odi.overviews.length > 1 && enabledMalleableComposition() ? (
                  <button
                    className="overview-tab-delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeOverview(overview.id ?? "");
                    }}
                  >
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 8 8"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M0.46967 6.46967C0.176777 6.76256 0.176777 7.23744 0.46967 7.53033C0.762563 7.82322 1.23744 7.82322 1.53033 7.53033L3.99902 5.06164L6.46967 7.53228C6.76256 7.82518 7.23744 7.82518 7.53033 7.53228C7.82322 7.23939 7.82322 6.76452 7.53033 6.47162L5.05968 4.00098L7.53033 1.53033C7.82322 1.23744 7.82322 0.762563 7.53033 0.46967C7.23744 0.176777 6.76256 0.176776 6.46967 0.46967L3.99902 2.94032L1.53033 0.471623C1.23744 0.17873 0.762563 0.17873 0.46967 0.471623C0.176777 0.764517 0.176777 1.23939 0.46967 1.53228L2.93836 4.00098L0.46967 6.46967Z"
                        fill="black"
                      />
                    </svg>
                  </button>
                ) : (
                  <div className="w-[4px]" />
                )}
                {/* Hover dropdown showing all available overview types (Figma-style) */}
                {hoveredOverview === overview.id && enabledMalleableLayout() && (
                  <div className="overview-hover-dropdown">
                    <div className="dropdown-section">
                      <div className="dropdown-section-label">Default Layouts</div>
                      {defaultLayouts.map((overviewType) => {
                        const isSelected = overview.type === overviewType;
                        return (
                          <button
                            key={overviewType}
                            className={`dropdown-item ${isSelected ? "active" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isSelected) {
                                setLayoutOverview(
                                  overview.id ?? "",
                                  overviewType as OverviewType
                                );
                              }
                              setHoveredOverview(null);
                            }}
                          >
                            {getOverviewIcon(overviewType)}
                            <span>{toTitleCase(overviewType)}</span>
                          </button>
                        );
                      })}
                    </div>
                    {(configCustomOverviewTypes.length > 0 || (customLayouts && customLayouts.length > 0)) && (
                      <>
                        <div className="dropdown-divider" style={{ height: "1px", background: "#e0e0e0", margin: "4px 0" }} />
                        <div className="dropdown-section">
                          <div className="dropdown-section-label">Custom Layouts</div>
                          {/* Custom overview types from config */}
                          {configCustomOverviewTypes.map((overviewType) => {
                            const isSelected = overview.type === overviewType;
                            const configType = overviewTypesMap[overviewType];
                            const displayName = configType?.type ? toTitleCase(configType.type) : toTitleCase(overviewType);
                            return (
                              <button
                                key={overviewType}
                                className={`dropdown-item custom-layout-item ${isSelected ? "active" : ""}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isSelected) {
                                    setLayoutOverview(
                                      overview.id ?? "",
                                      overviewType as OverviewType
                                    );
                                  }
                                  setHoveredOverview(null);
                                }}
                              >
                                {getOverviewIcon(overviewType)}
                                <span>{displayName}</span>
                              </button>
                            );
                          })}
                          {/* Custom layouts from UI */}
                          {customLayouts && customLayouts.map((layout) => {
                            const isSelected = overview.type === layout.id;
                            return (
                              <button
                                key={layout.id}
                                className={`dropdown-item custom-layout-item ${isSelected ? "active" : ""}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isSelected) {
                                    setLayoutOverview(
                                      overview.id ?? "",
                                      layout.id as OverviewType
                                    );
                                  }
                                  setHoveredOverview(null);
                                }}
                              >
                                {getOverviewIcon(layout.id)}
                                <span>{layout.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
            {malleableCompositionSetting().includes("tabs") && (
            <div className="toolbar-item">
              <button
                onClick={() => addNewOverview()}
                className="toolbar-btn overview-tab-add-button"
                title="Add new overview"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 1L6 11"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M1 6L11 6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            )}
            {malleableCompositionSetting().includes("toolbar") && (
            <div className="toolbar-item" id="overviewLayouts" ref={overviewLayoutsDropdownRef}>
              <button
                className="toolbar-btn"
                onClick={() => setShowOverviewLayoutsDropdown(!showOverviewLayoutsDropdown)}
                title="Overview Layouts"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="2" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="11" y="2" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="2" y="11" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="11" y="11" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <span>Overview Layouts</span>
              </button>
              {showOverviewLayoutsDropdown && (
                <div className="dropdown-menu" id="layoutsDropdown">
                  <div className="dropdown-section">
                    <div className="dropdown-section-label">Default Layouts</div>
                    {defaultLayouts.map((overviewType) => {
                      const activeOverviewData = odi?.overviews.find(ov => ov.id === activeOverview);
                      const isSelected = activeOverviewData?.type === overviewType;
                      return (
                        <button
                          key={overviewType}
                          className={`dropdown-item ${isSelected ? "active" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeOverview) {
                              setLayoutOverview(
                                activeOverview,
                                overviewType as OverviewType
                              );
                            }
                            setShowOverviewLayoutsDropdown(false);
                          }}
                        >
                          {getOverviewIcon(overviewType)}
                          <span>{toTitleCase(overviewType)}</span>
                        </button>
                      );
                    })}
                  </div>
                  {(configCustomOverviewTypes.length > 0 || (customLayouts && customLayouts.length > 0)) && (
                    <>
                      <div className="dropdown-divider" style={{ height: "1px", background: "#e0e0e0", margin: "4px 0" }} />
                      <div className="dropdown-section">
                        <div className="dropdown-section-label">Custom Layouts</div>
                        {/* Custom overview types from config */}
                        {configCustomOverviewTypes.map((overviewType) => {
                          const activeOverviewData = odi?.overviews.find(ov => ov.id === activeOverview);
                          const isSelected = activeOverviewData?.type === overviewType;
                          const configType = overviewTypesMap[overviewType];
                          const displayName = configType?.type ? toTitleCase(configType.type) : toTitleCase(overviewType);
                          return (
                            <button
                              key={overviewType}
                              className={`dropdown-item custom-layout-item ${isSelected ? "active" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeOverview) {
                                  setLayoutOverview(
                                    activeOverview,
                                    overviewType as OverviewType
                                  );
                                }
                                setShowOverviewLayoutsDropdown(false);
                              }}
                            >
                              {getOverviewIcon(overviewType)}
                              <span>{displayName}</span>
                            </button>
                          );
                        })}
                        {/* Custom layouts from UI */}
                        {customLayouts && customLayouts.map((layout) => {
                          const activeOverviewData = odi?.overviews.find(ov => ov.id === activeOverview);
                          const isSelected = activeOverviewData?.type === layout.id;
                          return (
                            <button
                              key={layout.id}
                              className={`dropdown-item custom-layout-item ${isSelected ? "active" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeOverview) {
                                  setLayoutOverview(
                                    activeOverview,
                                    layout.id as OverviewType
                                  );
                                }
                                setShowOverviewLayoutsDropdown(false);
                              }}
                            >
                              {getOverviewIcon(layout.id)}
                              <span>{layout.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            )}
            {enabledMalleableContent() &&
              !odi?.malleability?.content?.disabled &&
              odi?.malleability?.content?.types?.includes("toggle") && (
                <div className="toolbar-item">
                  <button
                    className={`toolbar-btn ${highlightAttributes ? "active" : ""}`}
                    onClick={() => setHighlightAttributes(!highlightAttributes)}
                    title={highlightAttributes ? "Turn off content customization" : "Customize Content"}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M11.25 3.75L16.25 8.75L6.25 18.75H1.25V13.75L11.25 3.75Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M14.25 1.25L18.75 5.75"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>{highlightAttributes ? "Customizing" : "Customize Content"}</span>
                  </button>
                </div>
            )}
            {enabledMalleableLayout() && (
            <div className="toolbar-item">
              <button
                className="toolbar-btn more-settings-button"
                onClick={() => setMalleabilityConsoleOpen(true)}
                title="Meridian UI Settings"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                  <path
                    d="M10 2.5V5M10 15V17.5M17.5 10H15M5 10H2.5M15.303 4.697L13.536 6.464M6.464 13.536L4.697 15.303M15.303 15.303L13.536 13.536M6.464 6.464L4.697 4.697"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <span>Meridian UI Settings</span>
              </button>
            </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
