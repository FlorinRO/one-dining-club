import fs from "node:fs/promises";
import { image, shape, text } from "@oai/artifact-tool";

export const ASSETS = {
  logo: "/Users/florin/Desktop/ios-icon-yumzy.png",
  screenFeed: "/Users/florin/Desktop/IMG_3003.PNG",
  screenProduct: "/Users/florin/Desktop/IMG_3004.PNG",
  screenLogin: "/Users/florin/Desktop/IMG_3007.PNG",
  screenSushi: "/Users/florin/Desktop/IMG_3009 2.PNG",
  screenSalmon: "/Users/florin/Desktop/IMG_3002 (1).png",
};

export const COLORS = {
  bg: "#0B0B0D",
  bgSoft: "#15161B",
  panel: "#17181E",
  panelSoft: "#20222A",
  stroke: "#31343D",
  white: "#F5F6F7",
  muted: "#A7AAB3",
  green: "#59D97C",
  greenDeep: "#32BE67",
  greenSoft: "#CFF6DC",
  cream: "#F1ECDD",
  orange: "#E39A46",
};

const cache = new Map();

export async function asDataUrl(filePath) {
  if (cache.has(filePath)) return cache.get(filePath);
  const ext = filePath.toLowerCase().endsWith(".png") ? "png" : "jpeg";
  const buf = await fs.readFile(filePath);
  const url = `data:image/${ext};base64,${buf.toString("base64")}`;
  cache.set(filePath, url);
  return url;
}

export function addRect(slide, frame, fill, radius = 0, line = { width: 0, fill }) {
  slide.compose(shape({
    geometry: radius > 0 ? "roundRect" : "rect",
    fill,
    borderRadius: radius || undefined,
    line,
    width: "fill",
    height: "fill",
  }), { frame });
}

export function addText(slide, value, frame, style = {}) {
  slide.compose(text(value, {
    style: {
      typeface: "Aptos",
      fontSize: 20,
      color: COLORS.white,
      wrap: "square",
      ...style,
    },
  }), { frame });
}

export async function addPhone(slide, frame, assetPath, pad = 12, radius = 34) {
  const dataUrl = await asDataUrl(assetPath);
  addRect(slide, frame, "#0E0F12", radius, { width: 2, fill: "#1E2127" });
  slide.compose(image({
    dataUrl,
    fit: "cover",
    borderRadius: Math.max(20, radius - 8),
    alt: "YUMZY mobile screen",
    width: "fill",
    height: "fill",
  }), {
    frame: {
      left: frame.left + pad,
      top: frame.top + pad,
      width: frame.width - pad * 2,
      height: frame.height - pad * 2,
    },
  });
}

export async function addLogo(slide, x = 70, y = 56) {
  const logo = await asDataUrl(ASSETS.logo);
  slide.compose(image({
    dataUrl: logo,
    fit: "contain",
    alt: "YUMZY icon",
    width: "fill",
    height: "fill",
  }), { frame: { left: x, top: y, width: 62, height: 68 } });
  addText(slide, "YUMZY", { left: x + 78, top: y + 10, width: 240, height: 60 }, {
    typeface: "Aptos Display",
    fontSize: 34,
    bold: true,
    color: COLORS.white,
    wrap: "none",
  });
}

export function addAccentBar(slide, x, y, width) {
  addRect(slide, { left: x, top: y, width, height: 7 }, COLORS.green, 6);
  addRect(slide, { left: x + width, top: y, width: 86, height: 7 }, COLORS.white, 6);
}

export function addKicker(slide, label, index, frame) {
  addText(slide, label, frame, {
    fontSize: 14,
    bold: true,
    color: COLORS.green,
    wrap: "none",
  });
  addText(slide, index, { left: frame.left, top: frame.top + 22, width: 70, height: 22 }, {
    fontSize: 12,
    bold: true,
    color: COLORS.muted,
    wrap: "none",
  });
}

export function addFooter(slide, pageNumber) {
  addRect(slide, { left: 70, top: 680, width: 1140, height: 1 }, COLORS.stroke, 0, { width: 0, fill: COLORS.stroke });
  addText(slide, "YUMZY.ro", { left: 70, top: 688, width: 160, height: 18 }, {
    fontSize: 11,
    color: COLORS.muted,
    wrap: "none",
  });
  addText(slide, String(pageNumber).padStart(2, "0"), { left: 1140, top: 688, width: 70, height: 18 }, {
    fontSize: 11,
    color: COLORS.muted,
    bold: true,
    alignment: "right",
    wrap: "none",
  });
}

export function addPill(slide, label, frame, fill = COLORS.panelSoft, textColor = COLORS.white) {
  addRect(slide, frame, fill, 18, { width: 1, fill: COLORS.stroke });
  addText(slide, label, {
    left: frame.left + 16,
    top: frame.top + 10,
    width: frame.width - 32,
    height: frame.height - 20,
  }, {
    fontSize: 16,
    bold: true,
    color: textColor,
    alignment: "center",
  });
}

export function addBulletList(slide, items, frame, style = {}) {
  addText(slide, items.map((item) => `• ${item}`).join("\n"), frame, {
    fontSize: 20,
    lineSpacing: 1.28,
    color: COLORS.white,
    ...style,
  });
}

export function addStatCard(slide, value, label, frame) {
  addRect(slide, frame, COLORS.panel, 24, { width: 1, fill: COLORS.stroke });
  addText(slide, value, { left: frame.left + 20, top: frame.top + 18, width: frame.width - 40, height: 38 }, {
    typeface: "Aptos Display",
    fontSize: 28,
    bold: true,
    wrap: "none",
  });
  addText(slide, label, { left: frame.left + 20, top: frame.top + 60, width: frame.width - 40, height: 28 }, {
    fontSize: 15,
    color: COLORS.muted,
    bold: true,
    wrap: "none",
  });
}
