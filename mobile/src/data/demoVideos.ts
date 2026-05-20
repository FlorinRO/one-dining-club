export const demoProductVideoIds = [
  49231, 40524, 43925, 10434, 42910, 10428, 12171, 26085, 10419, 3806,
  4982, 372, 43911, 42908, 50051, 43935, 993, 42909, 4857, 43951,
  40522, 26091, 4866, 41855, 10421, 4895, 42906, 3064, 10431, 41848,
  43918, 44007, 43905, 44014, 16007, 40516, 10427, 4678, 42474, 26090,
  17879, 16627, 50535, 43020, 7394, 22024, 16553, 5620, 21520, 22678,
  14972, 5982, 22675, 29443, 26610, 5625, 7748, 45099, 9354, 46020,
  42488, 44009, 42487, 3538, 42476, 21883, 44015, 44005, 1677, 43038,
  24902, 40535, 40515, 52462, 2687, 52458, 26084, 52468, 43052, 41350,
  43048, 43025, 41851, 44025, 41854, 51257, 43013, 51255, 26088, 3802,
  2691, 52469, 51254, 42690, 26095, 26096, 44001, 43939, 44002, 43942,
];

export const demoProductVideoSources = demoProductVideoIds.map(
  (videoId) => `https://assets.mixkit.co/videos/${videoId}/${videoId}-720.mp4`,
);

export const getDemoProductVideoUrl = (index: number) =>
  demoProductVideoSources[((index % demoProductVideoSources.length) + demoProductVideoSources.length) % demoProductVideoSources.length];
