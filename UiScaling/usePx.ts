import { effect } from "@rbxts/charm";
import { useBinding, useEffect, useMemo } from "@rbxts/react";
import {
  EDeviceCategory,
  EDeviceLayout,
  GetDeviceCategory,
  useDeviceLayout,
} from "./useDeviceLayoutType";
import { GetScreenSizeAtom, useScreenSize } from "./useScreenSize";

/**
 * @see https://discord.com/channels/476080952636997633/476080952636997635/1146857136358432900
 */
function CalculateScale(
  viewport: Vector2,
  base_resolution: Vector2,
  dominant_axis: number
) {
  const width = math.log(viewport.X / base_resolution.X, 2);
  const height = math.log(viewport.Y / base_resolution.Y, 2);
  const centered = width + (height - width) * dominant_axis;

  return 2 ** centered;
}

const DEVICE_CATEGORY_TO_DOMINANT_AXIS = {
  // Mobile devices often have varied aspect ratios, height scaling works better
  [EDeviceCategory.Mobile]: 1,
  // Tablets have more balanced aspect ratios
  [EDeviceCategory.Tablet]: 0.7,
  // Desktops have wide screens, use a mix with height preference
  [EDeviceCategory.Desktop]: 0.8,
};

/**
 * Returns the recommended dominant axis value based on device category
 * @param device_layout The current device layout
 * @returns Optimal dominant axis value (0-1)
 */
export function GetOptimalDominantAxis(device_layout: EDeviceLayout): number {
  const category = GetDeviceCategory(device_layout);

  return DEVICE_CATEGORY_TO_DOMINANT_AXIS[category] ?? 1;
}

/**
 * @param dominant_axis 0 - prefer width, 1 - prefer height, defaults to .5
 */
export function usePx(
  base_resolution: Vector2 = new Vector2(1920, 1080),
  dominant_axis: number = 1 // Changed default to 1 (height-based) since designs are 1080p height
) {
  const resolution = useScreenSize();
  return useMemo(() => {
    const scale = CalculateScale(resolution, base_resolution, dominant_axis);
    return (value: number) => value * scale;
  }, [resolution, dominant_axis]);
}

/**
 * Hook that provides a binding for UI scaling based on screen resolution
 * Useful for animations and dynamic UI changes
 *
 * @param base_resolution The resolution UI was designed for (default 1920x1080)
 * @param dominant_axis Scaling preference (default 1 = height-based)
 * @returns A binding containing the current scale factor
 */
export function usePxBinding(
  base_resolution: Vector2 = new Vector2(1920, 1080),
  dominant_axis: number = 1 // Changed default to 1 (height-based)
) {
  const [scale_binding, SetScale] = useBinding(1);
  useEffect(() => {
    return effect(() => {
      const scale = CalculateScale(
        GetScreenSizeAtom(),
        base_resolution,
        dominant_axis
      );
      SetScale(scale);
    });
  }, [dominant_axis, base_resolution]);
  return scale_binding;
}

/**
 * Hook that provides a scaling function optimized for the current device layout
 *
 * @param base_resolution The resolution UI was designed for (default 1920x1080)
 * @returns A function that scales pixel values to the current screen with optimal settings
 */
export function useAdaptivePx(
  base_resolution: Vector2 = new Vector2(1920, 1080)
) {
  const deviceLayout = useDeviceLayout();
  const dominant_axis = GetOptimalDominantAxis(deviceLayout);

  return usePx(base_resolution, dominant_axis);
}

export function useAdaptivePxBinding(
  base_resolution: Vector2 = new Vector2(1920, 1080)
) {
  const deviceLayout = useDeviceLayout();
  const dominant_axis = GetOptimalDominantAxis(deviceLayout);

  return usePxBinding(base_resolution, dominant_axis);
}
