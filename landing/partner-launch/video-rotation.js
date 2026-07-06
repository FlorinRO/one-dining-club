const productVideo = document.getElementById("rotating-product-video");

if (productVideo) {
  const playlist = [
    "../private-presentations/yumzy/assets-presentation/iphone-mockup-1.mp4",
    "../private-presentations/yumzy/assets-presentation/iphone-mockup-2.mp4",
    "../private-presentations/yumzy/assets-presentation/iphone-mockup-3.mp4",
    "../private-presentations/yumzy/assets-presentation/iphone-mockup-4.mp4",
  ];

  let currentIndex = 0;

  const playCurrentVideo = () => {
    productVideo.src = playlist[currentIndex];
    productVideo.load();
    productVideo.play().catch(() => {});
  };

  productVideo.addEventListener("ended", () => {
    currentIndex = (currentIndex + 1) % playlist.length;
    playCurrentVideo();
  });

  playCurrentVideo();
}
