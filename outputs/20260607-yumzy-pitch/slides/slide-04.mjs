import { COLORS, ASSETS, addFooter, addKicker, addPhone, addPill, addText } from "./shared.mjs";

const categories = [
  "FMCG",
  "eCommerce",
  "Băuturi",
  "Retail",
  "Beauty",
  "Fashion",
  "Telecom",
  "Banking",
  "Entertainment",
  "Automotive",
  "Tehnologie",
];

export async function slide04(presentation) {
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.bg;

  addKicker(slide, "Pentru Ce Tipuri de Branduri?", "04", { left: 70, top: 56, width: 320, height: 24 });
  addText(slide, "Orice brand care dorește să transforme\npublicitatea în experiență\nși vânzare.", { left: 70, top: 116, width: 500, height: 98 }, {
    typeface: "Aptos Display",
    fontSize: 28,
    bold: true,
    lineSpacing: 1.1,
  });

  let x = 70;
  let y = 250;
  for (let i = 0; i < categories.length; i += 1) {
    const label = categories[i];
    const width = label.length > 10 ? 182 : 150;
    addPill(slide, label, { left: x, top: y, width, height: 52 });
    x += width + 16;
    if (x > 560) {
      x = 70;
      y += 68;
    }
  }

  await addPhone(slide, { left: 824, top: 72, width: 310, height: 582 }, ASSETS.screenSalmon, 12, 34);

  addFooter(slide, 4);
  return slide;
}
