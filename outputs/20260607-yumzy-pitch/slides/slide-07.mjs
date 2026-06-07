import { COLORS, ASSETS, addBulletList, addFooter, addKicker, addPhone, addRect, addText } from "./shared.mjs";

export async function slide07(presentation) {
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.bg;

  addKicker(slide, "Launch Partner", "07", { left: 70, top: 56, width: 180, height: 24 });
  addText(slide, "YUMZY este un nou canal media pe care agențiile îl pot activa lunar pentru clienții lor.", { left: 70, top: 116, width: 580, height: 96 }, {
    typeface: "Aptos Display",
    fontSize: 26,
    bold: true,
    lineSpacing: 1.12,
  });
  addText(slide, "Combină video ads, product placement și experiențe reale livrate consumatorului.", { left: 70, top: 214, width: 590, height: 56 }, {
    fontSize: 19,
    color: COLORS.muted,
    lineSpacing: 1.2,
  });

  addRect(slide, { left: 70, top: 316, width: 620, height: 276 }, COLORS.panel, 30, { width: 1, fill: COLORS.stroke });
  addText(slide, "€2.500 / lună", { left: 104, top: 350, width: 220, height: 42 }, {
    typeface: "Aptos Display",
    fontSize: 34,
    bold: true,
    color: COLORS.green,
    wrap: "none",
  });
  addText(slide, "Pentru brandurile care vor să fie printre primii parteneri ai platformei.", { left: 104, top: 398, width: 476, height: 56 }, {
    fontSize: 18,
    color: COLORS.white,
    lineSpacing: 1.2,
  });
  addBulletList(slide, [
    "1 campanie activă în YUMZY",
    "Video Ads în feed",
    "Product Placement în conținut video",
    "Sponsored Products",
    "Raportare campanie",
    "Suport dedicat",
    "Menționare în comunicările YUMZY",
  ], { left: 104, top: 470, width: 480, height: 150 }, {
    fontSize: 18,
    lineSpacing: 1.24,
  });

  await addPhone(slide, { left: 840, top: 78, width: 286, height: 564 }, ASSETS.screenLogin, 12, 34);

  addFooter(slide, 7);
  return slide;
}
