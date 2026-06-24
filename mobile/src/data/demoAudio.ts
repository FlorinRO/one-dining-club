import type { AudioSource } from "expo-audio";

export const demoProductAudioSources = [
  require("../../assets/feed-audio/track-01.mp3"),
  require("../../assets/feed-audio/track-02.mp3"),
  require("../../assets/feed-audio/track-03.mp3"),
  require("../../assets/feed-audio/track-04.mp3"),
  require("../../assets/feed-audio/track-05.mp3"),
  require("../../assets/feed-audio/track-06.mp3"),
  require("../../assets/feed-audio/track-07.mp3"),
  require("../../assets/feed-audio/track-08.mp3"),
  require("../../assets/feed-audio/track-09.mp3"),
  require("../../assets/feed-audio/track-10.mp3"),
  require("../../assets/feed-audio/track-11.mp3"),
] as const satisfies readonly AudioSource[];

export const getDemoProductAudioSource = (index: number): AudioSource =>
  demoProductAudioSources[((index % demoProductAudioSources.length) + demoProductAudioSources.length) % demoProductAudioSources.length];
