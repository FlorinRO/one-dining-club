import fs from "node:fs/promises";
import { image, shape, text } from "@oai/artifact-tool";

const SCREEN = "/Users/florin/Desktop/IMG_3003.PNG";
const LOGO = "/Users/florin/Desktop/ios-icon-yumzy.png";

async function asDataUrl(filePath) {
  const ext = filePath.toLowerCase().endsWith(".png") ? "png" : "jpeg";
  const buf = await fs.readFile(filePath);
  return `data:image/${ext};base64,${buf.toString("base64")}`;
}

export async function slide01(presentation) {
  const slide = presentation.slides.add();
  slide.background.fill = "#0B0B0D";
  const screenUrl = await asDataUrl(SCREEN);
  const logoUrl = await asDataUrl(LOGO);

  slide.compose(shape({
    geometry: "rect",
    fill: "#0B0B0D",
    line: { fill: { type: "none" } },
    width: "fill",
    height: "fill",
  }), { frame: slide.frame });

  slide.compose(image({
    dataUrl: screenUrl,
    fit: "contain",
    width: "fill",
    height: "fill",
    borderRadius: 28,
    alt: "YUMZY screen",
  }), { frame: { left: 720, top: 60, width: 470, height: 600 } });

  slide.compose(image({
    dataUrl: logoUrl,
    fit: "contain",
    width: "fill",
    height: "fill",
    alt: "YUMZY logo",
  }), { frame: { left: 74, top: 72, width: 70, height: 78 } });

  slide.compose(text("YUMZY", {
    style: {
      typeface: "Aptos Display",
      fontSize: 44,
      bold: true,
      color: "#FFFFFF",
    },
  }), { frame: { left: 156, top: 82, width: 240, height: 56 } });

  slide.compose(text("Watch. Discover. Order.", {
    style: {
      typeface: "Aptos",
      fontSize: 22,
      bold: false,
      color: "#62D784",
    },
  }), { frame: { left: 74, top: 198, width: 420, height: 36 } });

  slide.compose(text("Primul ecosistem în care conținutul video, comerțul și livrarea se întâlnesc într-o singură experiență.", {
    style: {
      typeface: "Aptos Display",
      fontSize: 34,
      bold: true,
      color: "#FFFFFF",
      lineSpacing: 1.1,
      wrap: "square",
    },
  }), { frame: { left: 74, top: 252, width: 520, height: 180 } });

  return slide;
}
