import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView, type VideoSource } from "expo-video";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, type ImageSourcePropType, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AUTH_BACKGROUND_VIDEOS: VideoSource[] = [
  require("../../assets/login-videos/mixkit-a-couple-of-young-girls-savour-a-the-the-licious-51238-full-hd.mp4"),
  require("../../assets/login-videos/mixkit-a-young-woman-poses-to-the-mobile-camera-for-a-51236-full-hd.mp4"),
  require("../../assets/login-videos/mixkit-man-eating-a-hamburger-372-hd-ready.mp4"),
  require("../../assets/login-videos/mixkit-woman-eating-noodles-41350-full-hd.mp4"),
];

const AUTH_BACKGROUND_POSTERS: ImageSourcePropType[] = [
  require("../../assets/login-videos/mixkit-a-couple-of-young-girls-savour-a-the-the-licious-51238-poster.jpg"),
  require("../../assets/login-videos/mixkit-a-young-woman-poses-to-the-mobile-camera-for-a-51236-poster.jpg"),
  require("../../assets/login-videos/mixkit-man-eating-a-hamburger-372-poster.jpg"),
  require("../../assets/login-videos/mixkit-woman-eating-noodles-41350-poster.jpg"),
];

const VIDEO_MAX_VISIBLE_DURATION_MS = 4000;
const VIDEO_CROSSFADE_DURATION_MS = 1000;
const VIDEO_TRANSITION_START_DELAY_MS = VIDEO_MAX_VISIBLE_DURATION_MS - VIDEO_CROSSFADE_DURATION_MS;
const VIDEO_POST_SWAP_HOLD_MS = 120;
const VIDEO_MIN_WARMUP_SECONDS = 0.2;

export function AuthVideoBackground() {
  const insets = useSafeAreaInsets();
  const layerBOpacity = useRef(new Animated.Value(0)).current;
  const visibleSlotRef = useRef<"A" | "B">("A");
  const isTransitioningRef = useRef(false);

  const [slotAIndex, setSlotAIndex] = useState(0);
  const [slotBIndex, setSlotBIndex] = useState(1);
  const [visibleSlot, setVisibleSlot] = useState<"A" | "B">("A");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slotBOnTop, setSlotBOnTop] = useState(false);
  const [slotAReady, setSlotAReady] = useState(false);
  const [slotBReady, setSlotBReady] = useState(false);
  const [slotAWarmed, setSlotAWarmed] = useState(false);
  const [slotBWarmed, setSlotBWarmed] = useState(false);
  const [nextQueueIndex, setNextQueueIndex] = useState(2 % AUTH_BACKGROUND_VIDEOS.length);

  const slotAPlayer = useVideoPlayer(AUTH_BACKGROUND_VIDEOS[slotAIndex], (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
  });
  const slotBPlayer = useVideoPlayer(AUTH_BACKGROUND_VIDEOS[slotBIndex], (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
  });

  useEffect(() => {
    visibleSlotRef.current = visibleSlot;
  }, [visibleSlot]);

  useEffect(() => {
    isTransitioningRef.current = isTransitioning;
  }, [isTransitioning]);

  useEffect(() => {
    if (!isTransitioning) {
      setSlotBOnTop(visibleSlot === "B");
    }
  }, [isTransitioning, visibleSlot]);

  useEffect(() => {
    slotAPlayer.loop = true;
    slotAPlayer.muted = true;
    slotAPlayer.currentTime = 0;
    setSlotAWarmed(false);
    slotAPlayer.play();
  }, [slotAPlayer, slotAIndex]);

  useEffect(() => {
    slotBPlayer.loop = true;
    slotBPlayer.muted = true;
    slotBPlayer.currentTime = 0;
    setSlotBWarmed(false);
    slotBPlayer.play();
  }, [slotBPlayer, slotBIndex]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!slotAWarmed && slotAReady && slotAPlayer.currentTime >= VIDEO_MIN_WARMUP_SECONDS) {
        setSlotAWarmed(true);
      }
      if (!slotBWarmed && slotBReady && slotBPlayer.currentTime >= VIDEO_MIN_WARMUP_SECONDS) {
        setSlotBWarmed(true);
      }
    }, 120);

    return () => clearInterval(interval);
  }, [slotAPlayer, slotAReady, slotAWarmed, slotBPlayer, slotBReady, slotBWarmed]);

  useEffect(() => {
    if (isTransitioning) return undefined;

    const transitionTimer = setTimeout(() => {
      if (isTransitioningRef.current) return;
      const currentVisible = visibleSlotRef.current;
      const hiddenPlayable = currentVisible === "A" ? slotBReady && slotBWarmed : slotAReady && slotAWarmed;
      if (!hiddenPlayable) return;

      isTransitioningRef.current = true;
      setIsTransitioning(true);
      setSlotBOnTop(true);
      const targetOpacity = currentVisible === "A" ? 1 : 0;
      Animated.timing(layerBOpacity, {
        toValue: targetOpacity,
        duration: VIDEO_CROSSFADE_DURATION_MS,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          isTransitioningRef.current = false;
          setIsTransitioning(false);
          setSlotBOnTop(visibleSlotRef.current === "B");
          return;
        }

        const nowVisible = currentVisible === "A" ? "B" : "A";
        setVisibleSlot(nowVisible);
        setSlotBOnTop(nowVisible === "B");

        setTimeout(() => {
          if (nowVisible === "A") {
            setSlotBReady(false);
            setSlotBIndex(nextQueueIndex);
          } else {
            setSlotAReady(false);
            setSlotAIndex(nextQueueIndex);
          }
          setNextQueueIndex((current) => (current + 1) % AUTH_BACKGROUND_VIDEOS.length);
          isTransitioningRef.current = false;
          setIsTransitioning(false);
        }, VIDEO_POST_SWAP_HOLD_MS);
      });
    }, VIDEO_TRANSITION_START_DELAY_MS);

    return () => clearTimeout(transitionTimer);
  }, [isTransitioning, layerBOpacity, nextQueueIndex, slotAReady, slotAWarmed, slotBReady, slotBWarmed]);

  const visiblePosterSource =
    visibleSlot === "A" ? AUTH_BACKGROUND_POSTERS[slotAIndex] : AUTH_BACKGROUND_POSTERS[slotBIndex];
  const visibleSlotReady = visibleSlot === "A" ? slotAReady : slotBReady;

  return (
    <View pointerEvents="none" style={styles.root}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.videoBackground,
          slotBOnTop ? styles.videoLayerOnTop : styles.videoLayerBehind,
          { opacity: layerBOpacity },
        ]}
      >
        <VideoView
          player={slotBPlayer}
          style={[styles.videoSurface, !slotBReady && styles.videoSurfaceHidden]}
          contentFit="cover"
          surfaceType="textureView"
          nativeControls={false}
          useExoShutter={false}
          playsInline
          allowsPictureInPicture={false}
          onFirstFrameRender={() => setSlotBReady(true)}
          pointerEvents="none"
        />
        {!slotBReady ? (
          <Image source={AUTH_BACKGROUND_POSTERS[slotBIndex]} style={styles.videoPoster} resizeMode="cover" />
        ) : null}
      </Animated.View>
      <View pointerEvents="none" style={[styles.videoBackground, styles.videoLayerBase]}>
        <VideoView
          player={slotAPlayer}
          style={[styles.videoSurface, !slotAReady && styles.videoSurfaceHidden]}
          contentFit="cover"
          surfaceType="textureView"
          nativeControls={false}
          useExoShutter={false}
          playsInline
          allowsPictureInPicture={false}
          onFirstFrameRender={() => setSlotAReady(true)}
          pointerEvents="none"
        />
        {!slotAReady ? (
          <Image source={AUTH_BACKGROUND_POSTERS[slotAIndex]} style={styles.videoPoster} resizeMode="cover" />
        ) : null}
      </View>
      {!visibleSlotReady ? (
        <View pointerEvents="none" style={styles.videoStartupPoster}>
          <Image source={visiblePosterSource} style={styles.videoSurface} resizeMode="cover" />
        </View>
      ) : null}

      <View pointerEvents="none" style={styles.videoBlurMask} />
      <View pointerEvents="none" style={styles.videoGlassTint} />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.38)", "rgba(0,0,0,0.62)"]}
        locations={[0, 0.45, 1]}
        style={[styles.readabilityOverlay, { top: insets.top + 58 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    elevation: 0,
  },
  videoBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  videoSurface: {
    ...StyleSheet.absoluteFillObject,
  },
  videoSurfaceHidden: {
    opacity: 0,
  },
  videoPoster: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    elevation: 2,
  },
  videoStartupPoster: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    elevation: 2,
  },
  videoLayerBase: {
    zIndex: 0,
    elevation: 0,
  },
  videoLayerBehind: {
    zIndex: 0,
    elevation: 0,
  },
  videoLayerOnTop: {
    zIndex: 1,
    elevation: 1,
  },
  videoBlurMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 8, 12, 0.40)",
    zIndex: 2,
    elevation: 2,
  },
  videoGlassTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    zIndex: 3,
    elevation: 3,
  },
  readabilityOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 4,
    elevation: 4,
  },
});
