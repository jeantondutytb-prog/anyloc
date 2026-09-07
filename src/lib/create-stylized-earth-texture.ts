import * as THREE from "three";

const OCEAN = { r: 8, g: 16, b: 30 };
const LAND = { r: 98, g: 124, b: 152 };

export function createStylizedEarthTexture(): Promise<THREE.CanvasTexture> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Canvas unavailable"));
      return;
    }

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#0c1528");
    gradient.addColorStop(1, "#060b14");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = canvas.width;
      maskCanvas.height = canvas.height;
      const maskCtx = maskCanvas.getContext("2d");

      if (!maskCtx) {
        reject(new Error("Mask canvas unavailable"));
        return;
      }

      maskCtx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = maskCtx.getImageData(0, 0, canvas.width, canvas.height);
      const output = ctx.createImageData(canvas.width, canvas.height);

      for (let index = 0; index < pixels.data.length; index += 4) {
        const brightness = pixels.data[index];
        const isLand = brightness > 28;

        if (isLand) {
          output.data[index] = LAND.r;
          output.data[index + 1] = LAND.g;
          output.data[index + 2] = LAND.b;
        } else {
          output.data[index] = OCEAN.r;
          output.data[index + 1] = OCEAN.g;
          output.data[index + 2] = OCEAN.b;
        }
        output.data[index + 3] = 255;
      }

      ctx.putImageData(output, 0, 0);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      resolve(texture);
    };

    image.onerror = () => reject(new Error("Topology image failed to load"));
    image.src = "/textures/earth-topology.png";
  });
}
