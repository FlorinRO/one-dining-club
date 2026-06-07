import { COLORS, addFooter, addKicker, addRect, addText } from "./shared.mjs";

function principle(slide, index, title, body, x) {
  addRect(slide, { left: x, top: 270, width: 340, height: 250 }, COLORS.panel, 28, { width: 1, fill: COLORS.stroke });
  addText(slide, index, { left: x + 24, top: 294, width: 40, height: 24 }, {
    fontSize: 13,
    bold: true,
    color: COLORS.green,
    wrap: "none",
  });
  addText(slide, title, { left: x + 24, top: 332, width: 292, height: 86 }, {
    typeface: "Aptos Display",
    fontSize: 24,
    bold: true,
    lineSpacing: 1.1,
  });
  addText(slide, body, { left: x + 24, top: 420, width: 292, height: 82 }, {
    fontSize: 17,
    color: COLORS.muted,
    lineSpacing: 1.22,
  });
}

export async function slide06(presentation) {
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.bg;

  addKicker(slide, "De ce Funcționează?", "06", { left: 70, top: 56, width: 220, height: 24 });
  addText(slide, "Conținut Care Vinde", { left: 70, top: 116, width: 300, height: 44 }, {
    typeface: "Aptos Display",
    fontSize: 36,
    bold: true,
    color: COLORS.green,
    wrap: "none",
  });
  addText(slide, "Video-ul este cel mai consumat format digital din lume. YUMZY transformă conținutul video într-un canal de vânzare.", { left: 70, top: 178, width: 700, height: 70 }, {
    fontSize: 21,
    color: COLORS.white,
    lineSpacing: 1.18,
  });

  principle(slide, "01", "Fiecare videoclip poate deveni\nun punct de conversie.", "Feed-ul nu mai este doar awareness. Devine raft, meniu și checkout în aceeași experiență.", 70);
  principle(slide, "02", "Fiecare vizualizare poate deveni\no comandă.", "Utilizatorul descoperă prin video și cumpără fără să părăsească fluxul natural de consum.", 430);
  principle(slide, "03", "Fiecare campanie poate fi măsurată\npână la livrare.", "Brandurile pot vedea impactul în comenzi reale, nu doar în metrici media abstracte.", 790);

  addFooter(slide, 6);
  return slide;
}
