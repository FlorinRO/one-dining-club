import { COLORS, ASSETS, addFooter, addKicker, addPhone, addStatCard, addText } from "./shared.mjs";

export async function slide02(presentation) {
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.bg;

  addKicker(slide, "Cine suntem?", "02", { left: 70, top: 56, width: 180, height: 24 });
  addText(slide, "Un start-up de tehnologie și food delivery\nși prima platformă din Europa care transformă\nconținutul video în comenzi reale.", { left: 70, top: 118, width: 520, height: 170 }, {
    typeface: "Aptos Display",
    fontSize: 27,
    bold: true,
    lineSpacing: 1.1,
  });
  addText(slide, "Utilizatorii descoperă produse prin videoclipuri și le pot comanda instant, direct din experiența video, cu livrare rapidă la ușă.", { left: 70, top: 286, width: 500, height: 110 }, {
    fontSize: 20,
    color: COLORS.muted,
    lineSpacing: 1.22,
  });

  addStatCard(slide, "Video-first", "descoperire", { left: 70, top: 438, width: 168, height: 110 });
  addStatCard(slide, "Instant", "checkout", { left: 254, top: 438, width: 168, height: 110 });
  addStatCard(slide, "Rapid", "livrare", { left: 438, top: 438, width: 168, height: 110 });

  await addPhone(slide, { left: 750, top: 92, width: 240, height: 500 }, ASSETS.screenSushi, 10, 32);
  await addPhone(slide, { left: 970, top: 156, width: 240, height: 500 }, ASSETS.screenProduct, 10, 32);

  addFooter(slide, 2);
  return slide;
}
