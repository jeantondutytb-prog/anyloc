const MAPKIT_SCRIPT_URL = "https://cdn.apple-mapkit.com/mk/5.78.118/mapkit.js";

let mapKitLoader: Promise<typeof mapkit> | null = null;
let mapKitInitialized = false;

function loadMapKitScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("MapKit JS requires a browser environment."));
  }

  if (window.mapkit) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-mapkit="true"]'
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load MapKit JS.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = MAPKIT_SCRIPT_URL;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.mapkit = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load MapKit JS."));
    document.head.appendChild(script);
  });
}

export async function getMapKit(): Promise<typeof mapkit> {
  if (typeof window === "undefined") {
    throw new Error("MapKit JS requires a browser environment.");
  }

  if (!mapKitLoader) {
    mapKitLoader = loadMapKitScript().then(async () => {
      if (!mapKitInitialized) {
        await new Promise<void>((resolve, reject) => {
          window.mapkit.init({
            authorizationCallback: (done) => {
              fetch("/api/mapkit/token")
                .then(async (response) => {
                  if (!response.ok) {
                    throw new Error(await response.text());
                  }
                  return response.text();
                })
                .then((token) => {
                  done(token);
                  resolve();
                })
                .catch((error) => {
                  reject(
                    error instanceof Error
                      ? error
                      : new Error("MapKit authorization failed.")
                  );
                });
            },
          });
        });
        mapKitInitialized = true;
      }

      return window.mapkit;
    });
  }

  return mapKitLoader;
}
