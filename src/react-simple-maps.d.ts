declare module "react-simple-maps" {
  import { ComponentType, CSSProperties, ReactNode, SVGProps } from "react";

  interface ProjectionConfig {
    rotate?: [number, number, number];
    center?: [number, number];
    scale?: number;
  }

  interface ComposableMapProps {
    projectionConfig?: ProjectionConfig;
    projection?: string;
    width?: number;
    height?: number;
    style?: CSSProperties;
    children?: ReactNode;
  }

  interface ZoomableGroupProps {
    center?: [number, number];
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    translateExtent?: [[number, number], [number, number]];
    filterZoomEvent?: (event: unknown) => boolean;
    onMoveStart?: (position: { coordinates: [number, number]; zoom: number }, event: unknown) => void;
    onMove?: (position: { coordinates: [number, number]; zoom: number }, event: unknown) => void;
    onMoveEnd?: (position: { coordinates: [number, number]; zoom: number }, event: unknown) => void;
    className?: string;
    children?: ReactNode;
  }

  interface GeographiesChildrenArgs {
    geographies: GeographyType[];
  }

  interface GeographiesProps {
    geography: string | object;
    children: (args: GeographiesChildrenArgs) => ReactNode;
  }

  interface GeographyType {
    rsmKey: string;
    id: string;
    properties: { name: string; [key: string]: unknown };
    type: string;
    geometry: object;
  }

  interface GeographyStyleProps {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    outline?: string;
    cursor?: string;
  }

  interface GeographyProps extends SVGProps<SVGPathElement> {
    geography: GeographyType;
    style?: {
      default?: GeographyStyleProps;
      hover?: GeographyStyleProps;
      pressed?: GeographyStyleProps;
    };
  }

  export const ComposableMap: ComponentType<ComposableMapProps>;
  export const ZoomableGroup: ComponentType<ZoomableGroupProps>;
  export const Geographies: ComponentType<GeographiesProps>;
  export const Geography: ComponentType<GeographyProps>;
}
