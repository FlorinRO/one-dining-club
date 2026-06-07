import { COLORS, ASSETS, addBulletList, addFooter, addKicker, addPhone, addRect, addText } from "./shared.mjs";

export async function slide08(presentation) {
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.bg;

  addKicker(slide, "Exemple de Campanii", "08", { left: 70, top: 56, width: 240, height: 24 });
  addText(slide, "Growth Partner", { left: 70, top: 114, width: 320, height: 44 }, {
    typeface: "Aptos Display",
    fontSize: 36,
    bold: true,
    color: COLORS.white,
    wrap: "none",
  });
  addText(slide, "€5.000 / lună", { left: 70, top: 166, width: 240, height: 34 }, {
    typeface: "Aptos Display",
    fontSize: 28,
    bold: true,
    color: COLORS.green,
    wrap: "none",
  });
  addText(slide, "Pentru brandurile care doresc vizibilitate constantă și integrare în experiența utilizatorului.", { left: 70, top: 214, width: 560, height: 62 }, {
    fontSize: 19,
    color: COLORS.muted,
    lineSpacing: 1.2,
  });

  addRect(slide, { left: 70, top: 304, width: 620, height: 300 }, COLORS.panel, 30, { width: 1, fill: COLORS.stroke });
  addBulletList(slide, [
    "Până la 3 campanii active / lună",
    "Video Ads premium",
    "Product Placement",
    "Sponsored Products",
    "Sampling în comenzile livrate",
    "Campanii și produse exclusive",
    "Promovare prioritară în aplicație",
    "Raportare avansată",
    "Consultanță strategică",
  ], { left: 104, top: 342, width: 482, height: 220 }, {
    fontSize: 18,
    lineSpacing: 1.22,
  });

  await addPhone(slide, { left: 820, top: 72, width: 310, height: 582 }, ASSETS.screenSushi, 12, 34);

  addFooter(slide, 8);
  return slide;
}
