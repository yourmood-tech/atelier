// Polyfills pour pdfjs-dist dans le runtime Node.js Vercel
// pdfjs-dist utilise DOMMatrix, ImageData, Path2D (globals browser)
// Ces classes minimales suffisent pour l'extraction de texte (pas le rendu)
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const g = globalThis as Record<string, unknown>;

    if (!g.DOMMatrix) {
      g.DOMMatrix = class DOMMatrix {
        a=1; b=0; c=0; d=1; e=0; f=0;
        m11=1; m12=0; m13=0; m14=0;
        m21=0; m22=1; m23=0; m24=0;
        m31=0; m32=0; m33=1; m34=0;
        m41=0; m42=0; m43=0; m44=1;
        isIdentity=true; is2D=true;
        constructor(_?: string | number[]) {}
        inverse() { return new (g.DOMMatrix as new() => unknown)(); }
        multiply() { return this; }
        translate() { return this; }
        scale() { return this; }
        rotate() { return this; }
        toFloat32Array() { return new Float32Array(6); }
        toFloat64Array() { return new Float64Array(16); }
      };
    }

    if (!g.ImageData) {
      g.ImageData = class ImageData {
        data: Uint8ClampedArray;
        width: number;
        height: number;
        colorSpace = "srgb";
        constructor(
          dataOrWidth: Uint8ClampedArray | number,
          widthOrHeight: number,
          heightOrSettings?: number | Record<string, unknown>
        ) {
          if (typeof dataOrWidth === "number") {
            this.width  = dataOrWidth;
            this.height = widthOrHeight;
            this.data   = new Uint8ClampedArray(dataOrWidth * widthOrHeight * 4);
          } else {
            this.data   = dataOrWidth;
            this.width  = widthOrHeight;
            this.height = typeof heightOrSettings === "number" ? heightOrSettings : dataOrWidth.length / widthOrHeight / 4;
          }
        }
      };
    }

    if (!g.Path2D) {
      g.Path2D = class Path2D {
        constructor(_?: string | unknown) {}
        addPath() {}
        closePath() {}
        moveTo() {}
        lineTo() {}
        bezierCurveTo() {}
        quadraticCurveTo() {}
        arc() {}
        arcTo() {}
        ellipse() {}
        rect() {}
      };
    }
  }
}
