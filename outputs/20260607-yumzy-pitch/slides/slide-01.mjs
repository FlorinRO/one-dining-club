import { COLORS, ASSETS, addAccentBar, addAmbientImage, addFooter, addLogo, addPhone, addText } from "./shared.mjs";

export async function slide01(presentation) {
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.bg;

  await addAmbientImage(slide, { left: 0, top: 0, width: 320, height: 720 }, ASSETS.heroLeft, "#0B0B0DB5");
  await addLogo(slide);
  addAccentBar(slide, 70, 148, 150);

  addText(slide, "Watch. Discover. Order.", { left: 70, top: 182, width: 320, height: 30 }, {
    fontSize: 22,
    color: COLORS.green,
    wrap: "none",
  });
  addText(slide, "Primul ecosistem în care\nconținutul video, comerțul și\nlivrarea se întâlnesc într-o\nsingură experiență.", { left: 70, top: 244, width: 500, height: 210 }, {
    typeface: "Aptos Display",
    fontSize: 30,
    bold: true,
    lineSpacing: 1.06,
  });
  addText(slide, "Food delivery în stil TikTok, unde fiecare video poate deveni instant o comandă reală.", { left: 70, top: 474, width: 500, height: 80 }, {
    fontSize: 20,
    color: COLORS.muted,
    lineSpacing: 1.2,
  });

  await addPhone(slide, { left: 800, top: 58, width: 315, height: 610 }, ASSETS.screenFeed, 12, 34);
  addText(slide, "01", { left: 1160, top: 78, width: 50, height: 22 }, {
    fontSize: 13,
    color: COLORS.muted,
    bold: true,
    alignment: "right",
  });

  addFooter(slide, 1);
  return slide;
}
