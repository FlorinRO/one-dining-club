import { COLORS, addFooter, addKicker, addRect, addText } from "./shared.mjs";

const points = [
  "Canal nou și exclusiv",
  "Marjă comercială flexibilă",
  "Fără costuri operaționale",
  "Raportare și măsurare",
  "Suport direct din partea echipei YUMZY",
];

export async function slide10(presentation) {
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.bg;

  addKicker(slide, "Avantaje pentru Agenții", "10", { left: 70, top: 56, width: 260, height: 24 });
  addText(slide, "Un format media care nu se oprește la impresii, ci continuă până la comandă și livrare.", { left: 70, top: 118, width: 670, height: 96 }, {
    typeface: "Aptos Display",
    fontSize: 32,
    bold: true,
    lineSpacing: 1.08,
  });

  let y = 254;
  for (const point of points) {
    addRect(slide, { left: 70, top: y, width: 620, height: 62 }, COLORS.panel, 20, { width: 1, fill: COLORS.stroke });
    addRect(slide, { left: 88, top: y + 19, width: 24, height: 24 }, COLORS.green, 12, { width: 0, fill: COLORS.green });
    addText(slide, "✓", { left: 88, top: y + 15, width: 24, height: 24 }, {
      fontSize: 16,
      bold: true,
      color: COLORS.bg,
      alignment: "center",
      wrap: "none",
    });
    addText(slide, point, { left: 132, top: y + 16, width: 520, height: 28 }, {
      fontSize: 22,
      bold: true,
      color: COLORS.white,
      wrap: "none",
    });
    y += 76;
  }

  addRect(slide, { left: 806, top: 198, width: 350, height: 256 }, COLORS.green, 32, { width: 0, fill: COLORS.green });
  addText(slide, "YUMZY", { left: 842, top: 244, width: 180, height: 42 }, {
    typeface: "Aptos Display",
    fontSize: 38,
    bold: true,
    color: COLORS.bg,
    wrap: "none",
  });
  addText(slide, "Food delivery care transformă fiecare video într-o comandă posibilă.", { left: 842, top: 302, width: 268, height: 86 }, {
    fontSize: 24,
    bold: true,
    color: COLORS.bg,
    lineSpacing: 1.14,
  });

  addFooter(slide, 10);
  return slide;
}
