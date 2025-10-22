import { useMemo } from "react";
import { useScreenSize } from "./useScreenSize";

export const DESKTOP_SCALING_FACTOR = 1.0;
export const TABLET_SCALING_FACTOR = 1.40625;
export const MOBILE_SCALING_FACTOR = 2.7480916;

/**
 * Device layout types including orientation variants
 */
export const enum EDeviceLayout {
  DesktopLandscape = "DesktopLandscape",
  TabletLandscape = "TabletLandscape",
  MobileLandscape = "MobileLandscape",
  DesktopPortrait = "DesktopPortrait",
  TabletPortrait = "TabletPortrait",
  MobilePortrait = "MobilePortrait",
}

/**
 * Device categories
 */
export const enum EDeviceCategory {
  Mobile,
  Tablet,
  Desktop,
}

/**
 * Orientation types
 */
export const enum EDeviceOrientation {
  Landscape,
  Portrait,
}

// Device dimension thresholds from research data
const DEVICE_THRESHOLDS = {
  MOBILE: {
    MAX_WIDTH: 915,
    MIN_WIDTH: 320,
    MIN_HEIGHT: 180,
  },
  TABLET: {
    MIN_WIDTH: 768,
    MAX_WIDTH: 1365,
    MIN_HEIGHT: 768,
  },
  DESKTOP: {
    MIN_WIDTH: 1366,
    MIN_HEIGHT: 1024,
  },
};

// Layout categorization
const LANDSCAPE_LAYOUTS = [
  EDeviceLayout.DesktopLandscape,
  EDeviceLayout.TabletLandscape,
  EDeviceLayout.MobileLandscape,
];

const PORTRAIT_LAYOUTS = [
  EDeviceLayout.DesktopPortrait,
  EDeviceLayout.TabletPortrait,
  EDeviceLayout.MobilePortrait,
];

// Type guards for layout orientations
const IsLandscapeLayout = (layout: EDeviceLayout): boolean =>
  LANDSCAPE_LAYOUTS.includes(layout);

const IsPortraitLayout = (layout: EDeviceLayout): boolean =>
  PORTRAIT_LAYOUTS.includes(layout);

// Device layouts mapping
const DEVICE_LAYOUTS: Record<
  EDeviceCategory,
  Record<EDeviceOrientation, EDeviceLayout>
> = {
  [EDeviceCategory.Desktop]: {
    [EDeviceOrientation.Landscape]: EDeviceLayout.DesktopLandscape,
    [EDeviceOrientation.Portrait]: EDeviceLayout.DesktopPortrait,
  },
  [EDeviceCategory.Tablet]: {
    [EDeviceOrientation.Landscape]: EDeviceLayout.TabletLandscape,
    [EDeviceOrientation.Portrait]: EDeviceLayout.TabletPortrait,
  },
  [EDeviceCategory.Mobile]: {
    [EDeviceOrientation.Landscape]: EDeviceLayout.MobileLandscape,
    [EDeviceOrientation.Portrait]: EDeviceLayout.MobilePortrait,
  },
};

/**
 * Returns the device category for a given layout
 */
export const GetDeviceCategory = (layout: EDeviceLayout): EDeviceCategory => {
  if (
    layout === EDeviceLayout.MobilePortrait ||
    layout === EDeviceLayout.MobileLandscape
  ) {
    return EDeviceCategory.Mobile;
  } else if (
    layout === EDeviceLayout.TabletPortrait ||
    layout === EDeviceLayout.TabletLandscape
  ) {
    return EDeviceCategory.Tablet;
  } else {
    return EDeviceCategory.Desktop;
  }
};

/**
 * Converts a layout to its opposite orientation while maintaining device category
 */
const ToggleLayoutOrientation = (layout: EDeviceLayout): EDeviceLayout => {
  const category = GetDeviceCategory(layout);
  const orientation = IsLandscapeLayout(layout)
    ? EDeviceOrientation.Portrait
    : EDeviceOrientation.Landscape;

  return DEVICE_LAYOUTS[category][orientation];
};

/**
 * Detects the device layout based on screen dimensions and aspect ratio
 */
const DetectDeviceLayout = (screen_size: Vector2): EDeviceLayout => {
  const { X, Y } = screen_size;
  const is_landscape = X > Y;
  const aspect_ratio = X / Y;

  // Get the smaller dimension (equivalent to smallestScreenWidth concept)
  const smallest_dimension = math.min(X, Y);

  // FIRST: Check if device is a tablet based on smallest dimension
  if (
    smallest_dimension >= 600 &&
    ((is_landscape && aspect_ratio <= 1.8) ||
      (!is_landscape && aspect_ratio >= 0.55))
  ) {
    const orientation = is_landscape
      ? EDeviceOrientation.Landscape
      : EDeviceOrientation.Portrait;
    return DEVICE_LAYOUTS[EDeviceCategory.Tablet][orientation];
  }

  // Modern smartphones check for remaining devices
  if (is_landscape && aspect_ratio >= 1.9 && aspect_ratio <= 2.3 && X < 900) {
    return DEVICE_LAYOUTS[EDeviceCategory.Mobile][EDeviceOrientation.Landscape];
  }

  // For portrait orientation phones
  if (!is_landscape && aspect_ratio >= 0.4 && aspect_ratio <= 0.55 && Y < 900) {
    return DEVICE_LAYOUTS[EDeviceCategory.Mobile][EDeviceOrientation.Portrait];
  }

  // Rest of the existing detection logic with adjusted thresholds
  const BUFFER = 20;
  let device_category: EDeviceCategory;

  const TABLET_MIN_WIDTH = DEVICE_THRESHOLDS.TABLET.MIN_WIDTH;

  // Handle edge cases near boundaries
  const is_near_mobile_tablet_boundary =
    math.abs(X - TABLET_MIN_WIDTH) <= BUFFER;
  const is_near_tablet_desktop_boundary =
    math.abs(X - DEVICE_THRESHOLDS.DESKTOP.MIN_WIDTH) <= BUFFER;

  if (is_near_mobile_tablet_boundary) {
    // Use aspect ratio as tie-breaker
    device_category =
      aspect_ratio >= 1.7 || (aspect_ratio <= 0.6 && aspect_ratio > 0.55)
        ? EDeviceCategory.Mobile
        : EDeviceCategory.Tablet;
  } else if (is_near_tablet_desktop_boundary) {
    device_category =
      aspect_ratio >= 1.7 || aspect_ratio <= 0.6
        ? EDeviceCategory.Desktop
        : EDeviceCategory.Tablet;
  } else if (X < TABLET_MIN_WIDTH) {
    device_category = EDeviceCategory.Mobile;
  } else if (X < DEVICE_THRESHOLDS.DESKTOP.MIN_WIDTH) {
    device_category = EDeviceCategory.Tablet;
  } else {
    device_category = EDeviceCategory.Desktop;
  }

  const orientation = is_landscape
    ? EDeviceOrientation.Landscape
    : EDeviceOrientation.Portrait;
  return DEVICE_LAYOUTS[device_category][orientation];
};

/**
 * Finds the closest layout from a whitelist
 */
const FindClosestLayout = (
  detected_layout: EDeviceLayout,
  white_listed_layouts: EDeviceLayout[]
): EDeviceLayout => {
  // If detected layout is in whitelist, return it
  if (white_listed_layouts.includes(detected_layout)) {
    return detected_layout;
  }

  // Device hierarchy (smallest to largest)
  const device_hierarchy: EDeviceCategory[] = [
    EDeviceCategory.Mobile,
    EDeviceCategory.Tablet,
    EDeviceCategory.Desktop,
  ];

  const detected_category = GetDeviceCategory(detected_layout);
  const is_detected_landscape = IsLandscapeLayout(detected_layout);

  // Try same category first
  const same_category_and_orientation = white_listed_layouts.find(
    (layout) =>
      GetDeviceCategory(layout) === detected_category &&
      IsLandscapeLayout(layout) === is_detected_landscape
  );

  if (same_category_and_orientation) return same_category_and_orientation;

  // Try same category, different orientation
  const same_category = white_listed_layouts.find(
    (layout) => GetDeviceCategory(layout) === detected_category
  );

  if (same_category) return same_category;

  // Try higher categories (more capable devices)
  const detected_category_index = device_hierarchy.indexOf(detected_category);
  for (let i = detected_category_index + 1; i < device_hierarchy.size(); i++) {
    const category = device_hierarchy[i];

    // First try same orientation
    const higher_category_same_orientation = white_listed_layouts.find(
      (layout) =>
        GetDeviceCategory(layout) === category &&
        IsLandscapeLayout(layout) === is_detected_landscape
    );

    if (higher_category_same_orientation)
      return higher_category_same_orientation;

    // Then any orientation
    const higher_category = white_listed_layouts.find(
      (layout) => GetDeviceCategory(layout) === category
    );

    if (higher_category) return higher_category;
  }

  // Try lower categories as last resort
  for (let i = detected_category_index - 1; i >= 0; i--) {
    const category = device_hierarchy[i];

    // First try same orientation
    const lower_category_same_orientation = white_listed_layouts.find(
      (layout) =>
        GetDeviceCategory(layout) === category &&
        IsLandscapeLayout(layout) === is_detected_landscape
    );

    if (lower_category_same_orientation) return lower_category_same_orientation;

    // Then any orientation
    const lower_category = white_listed_layouts.find(
      (layout) => GetDeviceCategory(layout) === category
    );

    if (lower_category) return lower_category;
  }

  // Fallback to first item in whitelist
  return white_listed_layouts[0];
};

/**
 * Hook that returns the current device layout with optional whitelist filtering
 * @param white_listed_layouts Optional list of allowed layouts. If provided, returns the closest match.
 */
export const useDeviceLayout = (
  white_listed_layouts?: EDeviceLayout[]
): EDeviceLayout => {
  const screen_size = useScreenSize();

  return useMemo(() => {
    const detected_layout = DetectDeviceLayout(screen_size);

    if (white_listed_layouts !== undefined && white_listed_layouts.size() > 0) {
      return FindClosestLayout(detected_layout, white_listed_layouts);
    }

    return detected_layout;
  }, [screen_size, ...(white_listed_layouts ?? [])]);
};

/**
 * Hook that returns a landscape device layout with optional whitelist filtering
 * @param white_listed_layouts Optional list of allowed layouts. If provided, returns the closest match.
 */
export const useDeviceLandscapeLayout = (
  white_listed_layouts?: EDeviceLayout[]
): EDeviceLayout => {
  const screen_size = useScreenSize();

  return useMemo(() => {
    let detected_layout = DetectDeviceLayout(screen_size);

    // Convert to landscape if in portrait mode
    if (IsPortraitLayout(detected_layout)) {
      detected_layout = ToggleLayoutOrientation(detected_layout);
    }

    // If no whitelist, return the landscape layout
    if (
      white_listed_layouts === undefined ||
      white_listed_layouts.size() === 0
    ) {
      return detected_layout;
    }

    // Filter whitelist to only landscape layouts
    const landscape_whitelist = white_listed_layouts.filter(IsLandscapeLayout);

    // If landscape layouts exist in whitelist, find closest
    if (landscape_whitelist.size() > 0)
      return FindClosestLayout(detected_layout, landscape_whitelist);

    // If no landscape layouts in whitelist, find closest from any layout
    return FindClosestLayout(detected_layout, white_listed_layouts);
  }, [screen_size, ...(white_listed_layouts ?? [])]);
};

/**
 * Hook that returns a portrait device layout with optional whitelist filtering
 * @param white_listed_layouts Optional list of allowed layouts. If provided, returns the closest match.
 */
export const useDevicePortraitLayout = (
  white_listed_layouts?: EDeviceLayout[]
): EDeviceLayout => {
  const screen_size = useScreenSize();

  return useMemo(() => {
    let detected_layout = DetectDeviceLayout(screen_size);

    // Convert to portrait if in landscape mode
    if (IsLandscapeLayout(detected_layout)) {
      detected_layout = ToggleLayoutOrientation(detected_layout);
    }

    // If no whitelist, return the portrait layout
    if (
      white_listed_layouts === undefined ||
      white_listed_layouts.size() === 0
    ) {
      return detected_layout;
    }

    // Filter whitelist to only portrait layouts
    const portrait_whitelist = white_listed_layouts.filter(IsPortraitLayout);

    // If portrait layouts exist in whitelist, find closest
    if (portrait_whitelist.size() > 0) {
      return FindClosestLayout(detected_layout, portrait_whitelist);
    }

    // If no portrait layouts in whitelist, find closest from any layout
    return FindClosestLayout(detected_layout, white_listed_layouts);
  }, [screen_size, ...(white_listed_layouts ?? [])]);
};

/** Hook that returns a value based on the current device landscape layout
 * @param whitelist Optional list of allowed layouts. If provided, returns the closest match.
 * @returns A function that takes a default value and an options object, returning the value corresponding to the current layout or the default value if not found.
 */
export function useSwitchLandscapeLayout<T>(whitelist?: EDeviceLayout[]): <T>(
  default_value: T,
  options: {
    [key in EDeviceLayout]?: T;
  }
) => T {
  const layout = useDeviceLandscapeLayout(whitelist);

  return (default_value, options) => {
    return options[layout] ?? default_value;
  };
}

/**
 * Hook that returns a value based on the current device portrait layout
 * @param whitelist Optional list of allowed layouts. If provided, returns the closest match.
 * @returns A function that takes a default value and an options object, returning the value corresponding to the current layout or the default value if not found.
 */

export function useSwitchPortraitLayout(whitelist?: EDeviceLayout[]): <T>(
  default_value: T,
  options: {
    [key in EDeviceLayout]?: T;
  }
) => T {
  const layout = useDevicePortraitLayout(whitelist);

  return (default_value, options) => {
    return options[layout] ?? default_value;
  };
}

/**
 * Hook that returns a value based on the current device layout
 * @param whitelist Optional list of allowed layouts. If provided, returns the closest match.
 * @returns A function that takes a default value and an options object, returning the value corresponding to the current layout or the default value if not found.
 */
export function useSwitchLayout(whitelist?: EDeviceLayout[]): <T>(
  default_value: T,
  options: {
    [key in EDeviceLayout]?: T;
  }
) => T {
  const layout = useDeviceLayout(whitelist);

  return (default_value, options) => {
    return options[layout] ?? default_value;
  };
}

/**
 * Hook that returns the device category based on the current layout
 * @returns The device category as an EDeviceCategory enum value
 */
export function useDeviceCategory(): EDeviceCategory {
  const layout = useDeviceLayout();
  return GetDeviceCategory(layout);
}

/**
 * Hook that returns a value based on the current device category
 * @param whitelist Optional list of allowed categories. If provided, returns the closest match.
 * @returns A function that takes a default value and an options object, returning the value corresponding to the current category or the default value if not found.
 */
export function useSwitchCategory<T>(
  whitelist?: EDeviceCategory[]
): <T>(default_value: T, options: { [key in EDeviceCategory]?: T }) => T {
  const category = useDeviceCategory();

  return (default_value, options) => {
    if (whitelist && !whitelist.includes(category)) {
      return default_value;
    }
    return options[category] ?? default_value;
  };
}
