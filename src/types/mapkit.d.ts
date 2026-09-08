declare namespace mapkit {
  class Coordinate {
    constructor(latitude: number, longitude: number);
    latitude: number;
    longitude: number;
  }

  class CoordinateSpan {
    constructor(latitudeDelta: number, longitudeDelta: number);
  }

  class CoordinateRegion {
    constructor(center: Coordinate, span: CoordinateSpan);
  }

  class MarkerAnnotation {
    constructor(
      coordinate: Coordinate,
      options?: {
        title?: string;
        subtitle?: string;
        color?: string;
        glyphText?: string;
        selected?: boolean;
      }
    );
    coordinate: Coordinate;
    title?: string;
    color?: string;
  }

  class CircleOverlay {
    constructor(
      coordinate: Coordinate,
      radius: number,
      options?: {
        style?: Style;
      }
    );
    coordinate: Coordinate;
    radius: number;
  }

  class Style {
    constructor(options?: {
      fillColor?: string;
      strokeColor?: string;
      lineWidth?: number;
      fillOpacity?: number;
      strokeOpacity?: number;
    });
  }

  class Map {
    constructor(
      parent: string | HTMLElement,
      options?: {
        center?: Coordinate;
        region?: CoordinateRegion;
        colorScheme?: string;
        showsZoomControl?: boolean;
        showsCompass?: string;
        showsMapTypeControl?: boolean;
        isRotationEnabled?: boolean;
      }
    );
    colorScheme: string;
    annotations: MarkerAnnotation[];
    addAnnotation(annotation: MarkerAnnotation): void;
    removeAnnotation(annotation: MarkerAnnotation): void;
    addOverlay(overlay: CircleOverlay): void;
    removeOverlay(overlay: CircleOverlay): void;
    setCenterAnimated(coordinate: Coordinate, animate: boolean): void;
    setRegionAnimated(region: CoordinateRegion, animate: boolean): void;
    convertPointOnPageToCoordinate(point: DOMPoint): Coordinate;
    addEventListener(
      type: "single-tap",
      listener: (event: { pointOnPage: DOMPoint; target: unknown }) => void
    ): void;
    removeEventListener(
      type: "single-tap",
      listener: (event: { pointOnPage: DOMPoint; target: unknown }) => void
    ): void;
    destroy(): void;
  }

  namespace Map {
    const ColorSchemes: {
      Light: string;
      Dark: string;
    };
    const FeatureVisibility: {
      Hidden: string;
      Visible: string;
    };
  }

  function init(options: {
    authorizationCallback: (done: (token: string) => void) => void;
  }): void;
}

declare const mapkit: typeof mapkit;

interface Window {
  mapkit: typeof mapkit;
}
