const deckVideoSources = [
  {
    src: "../../landing/assets/login-videos/mixkit-a-couple-of-young-girls-savour-a-the-the-licious-51238-full-hd.mp4",
    poster: "../../landing/assets/login-videos/mixkit-a-couple-of-young-girls-savour-a-the-the-licious-51238-poster.jpg",
  },
  {
    src: "../../landing/assets/login-videos/mixkit-a-young-woman-poses-to-the-mobile-camera-for-a-51236-full-hd.mp4",
    poster: "../../landing/assets/login-videos/mixkit-a-young-woman-poses-to-the-mobile-camera-for-a-51236-poster.jpg",
  },
  {
    src: "../../landing/assets/login-videos/mixkit-man-eating-a-hamburger-372-hd-ready.mp4",
    poster: "../../landing/assets/login-videos/mixkit-man-eating-a-hamburger-372-poster.jpg",
  },
  {
    src: "../../landing/assets/login-videos/mixkit-woman-eating-noodles-41350-full-hd.mp4",
    poster: "../../landing/assets/login-videos/mixkit-woman-eating-noodles-41350-poster.jpg",
  },
];
const videoLayers = Array.from(document.querySelectorAll(".deck-video-layer"));
const videoElements = videoLayers.map((layer) => layer.querySelector(".deck-video"));
const VIDEO_MAX_VISIBLE_MS = 4000;
const VIDEO_CROSSFADE_MS = 1000;
const VIDEO_TRANSITION_DELAY_MS = VIDEO_MAX_VISIBLE_MS - VIDEO_CROSSFADE_MS;

function primeDeckVideo(video, source) {
  if (!video || !source) return;
  video.src = source.src;
  video.poster = source.poster;
  video.currentTime = 0;
  video.load();
  const playAttempt = video.play();
  if (playAttempt?.catch) {
    playAttempt.catch(() => {});
  }
}

function bootDeckVideos() {
  if (videoElements.length !== 2 || deckVideoSources.length < 2) return;

  let activeLayerIndex = 0;
  let nextVideoIndex = 2 % deckVideoSources.length;
  let transitionLocked = false;

  primeDeckVideo(videoElements[0], deckVideoSources[0]);
  primeDeckVideo(videoElements[1], deckVideoSources[1]);

  const scheduleTransition = () => {
    window.setTimeout(() => {
      if (transitionLocked) return;

      const hiddenLayerIndex = activeLayerIndex === 0 ? 1 : 0;
      const activeLayer = videoLayers[activeLayerIndex];
      const hiddenLayer = videoLayers[hiddenLayerIndex];
      const hiddenVideo = videoElements[hiddenLayerIndex];

      if (!hiddenLayer || !hiddenVideo || hiddenVideo.readyState < 2) {
        scheduleTransition();
        return;
      }

      transitionLocked = true;
      hiddenLayer.classList.add("is-active");
      activeLayer.classList.remove("is-active");

      window.setTimeout(() => {
        activeLayerIndex = hiddenLayerIndex;
        const recycledIndex = activeLayerIndex === 0 ? 1 : 0;
        primeDeckVideo(videoElements[recycledIndex], deckVideoSources[nextVideoIndex]);
        nextVideoIndex = (nextVideoIndex + 1) % deckVideoSources.length;
        transitionLocked = false;
        scheduleTransition();
      }, VIDEO_CROSSFADE_MS + 140);
    }, VIDEO_TRANSITION_DELAY_MS);
  };

  scheduleTransition();
}

bootDeckVideos();
