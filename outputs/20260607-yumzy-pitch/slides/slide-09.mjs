import { COLORS, ASSETS, addBulletList, addFooter, addKicker, addPhone, addRect, addText } from "./shared.mjs";

export async function slide09(presentation) {
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.bg;

  addKicker(slide, "Exclusive Partner", "09", { left: 70, top: 56, width: 220, height: 24 });
  addText(slide, "€10.000 / lună", { left: 70, top: 114, width: 260, height: 40 }, {
    typeface: "Aptos Display",
    fontSize: 34,
    bold: true,
    color: COLORS.green,
    wrap: "none",
  });
  addText(slide, "Pentru brandurile care vor exclusivitate și activări complete.", { left: 70, top: 170, width: 500, height: 40 }, {
    fontSize: 19,
    color: COLORS.muted,
    wrap: "square",
  });

  addRect(slide, { left: 70, top: 252, width: 660, height: 378 }, COLORS.panel, 30, { width: 1, fill: COLORS.stroke });
  addBulletList(slide, [
    "Campanii nelimitate în perioada contractuală",
    "Priority Placement în aplicație",
    "Exclusivitate pe categorie",
    "Video Ads premium",
    "Product Placement",
    "Sampling și activări dedicate",
    "Ghiozdane personalizate pentru campanii",
    "Ambalaje personalizate",
    "Campanii în ediție limitată",
    "Co-branding cu YUMZY",
    "Account Manager dedicat",
    "Acces prioritar la toate noile formate",
  ], { left: 104, top: 292, width: 562, height: 300 }, {
    fontSize: 18,
    lineSpacing: 1.18,
  });

  await addPhone(slide, { left: 840, top: 86, width: 286, height: 560 }, ASSETS.screenSalmon, 12, 34);

  addFooter(slide, 9);
  return slide;
}
