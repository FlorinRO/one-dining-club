import { COLORS, ASSETS, addBulletList, addFooter, addKicker, addPhone, addRect, addText } from "./shared.mjs";

export async function slide05(presentation) {
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.bg;

  addKicker(slide, "De ce este diferit?", "05", { left: 70, top: 56, width: 220, height: 24 });
  addText(slide, "YUMZY este un nou canal de media și eCommerce\nunde reclamele video devin vânzări\nși experiențe livrate consumatorului.", { left: 70, top: 114, width: 560, height: 130 }, {
    typeface: "Aptos Display",
    fontSize: 27,
    bold: true,
    lineSpacing: 1.08,
  });

  addRect(slide, { left: 70, top: 278, width: 610, height: 250 }, COLORS.panel, 28, { width: 1, fill: COLORS.stroke });
  addText(slide, "Agențiile pot activa campanii prin:", { left: 100, top: 316, width: 300, height: 36 }, {
    fontSize: 18,
    color: COLORS.green,
    bold: true,
    wrap: "none",
  });
  addBulletList(slide, [
    "video ads",
    "product placement",
    "lansări exclusive",
    "sampling prin livrare",
  ], { left: 100, top: 362, width: 220, height: 160 }, {
    fontSize: 21,
    bold: true,
  });
  addText(slide, "Fiecare campanie devine conversie reală și experiență de brand.", { left: 356, top: 364, width: 268, height: 112 }, {
    fontSize: 24,
    typeface: "Aptos Display",
    bold: true,
    lineSpacing: 1.14,
  });

  await addPhone(slide, { left: 824, top: 72, width: 310, height: 582 }, ASSETS.screenFeed, 12, 34);

  addFooter(slide, 5);
  return slide;
}
