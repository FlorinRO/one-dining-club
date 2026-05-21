import type { AudioSource } from "expo-audio";

export const demoProductAudioSources = [
  require("../../assets/feed-audio/Amit Sagie - Chariot.mp3"),
  require("../../assets/feed-audio/Curtis Cole - Too Cool to Care - Instrumental version.mp3"),
  require("../../assets/feed-audio/Danny Shields - Now That We’re Here.mp3"),
  require("../../assets/feed-audio/HEATHER - Caught Up - Instrumental version.mp3"),
  require("../../assets/feed-audio/José Alan - TRANQUILA - Instrumental version.mp3"),
  require("../../assets/feed-audio/Ofrin - Mythologica - Short version.mp3"),
  require("../../assets/feed-audio/Out of Flux - Sunny Summer.mp3"),
  require("../../assets/feed-audio/Skipp Whitman - Closing Doors - Instrumental version.mp3"),
  require("../../assets/feed-audio/Stevie Ross - Trippin - Loop.mp3"),
  require("../../assets/feed-audio/Yarin Primak - Electricity - No Lead Vocals.mp3"),
  require("../../assets/feed-audio/dazeychain - Lie - Loop.mp3"),
] as const satisfies readonly AudioSource[];

export const getDemoProductAudioSource = (index: number): AudioSource =>
  demoProductAudioSources[((index % demoProductAudioSources.length) + demoProductAudioSources.length) % demoProductAudioSources.length];
