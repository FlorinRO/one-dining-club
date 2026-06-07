import { COLORS, ASSETS, addFooter, addKicker, addPhone, addRect, addText } from "./shared.mjs";

export async function slide03(presentation) {
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.bg;

  addKicker(slide, "Agency Partner Program", "03", { left: 70, top: 56, width: 260, height: 24 });
  addText(slide, "Oferim agențiilor un nou canal media\ncare transformă conținutul video\nîn vânzări și experiențe reale.", { left: 70, top: 116, width: 560, height: 130 }, {
    typeface: "Aptos Display",
    fontSize: 29,
    bold: true,
    lineSpacing: 1.08,
  });

  addRect(slide, { left: 70, top: 292, width: 270, height: 180 }, COLORS.panel, 26, { width: 1, fill: COLORS.stroke });
  addText(slide, "Agenția gestionează relația cu clientul.", { left: 94, top: 328, width: 222, height: 84 }, {
    typeface: "Aptos Display",
    fontSize: 26,
    bold: true,
    lineSpacing: 1.14,
  });

  addRect(slide, { left: 362, top: 292, width: 330, height: 180 }, COLORS.green, 26, { width: 0, fill: COLORS.green });
  addText(slide, "YUMZY furnizează platforma, distribuția și tehnologia.", { left: 390, top: 326, width: 274, height: 96 }, {
    typeface: "Aptos Display",
    fontSize: 28,
    bold: true,
    color: COLORS.bg,
    lineSpacing: 1.12,
  });

  await addPhone(slide, { left: 824, top: 82, width: 310, height: 582 }, ASSETS.screenLogin, 12, 34);

  addFooter(slide, 3);
  return slide;
}
