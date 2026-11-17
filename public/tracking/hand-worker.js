// Inference stays off the audio/UI thread. Assets reused from alien-hub.
importScripts('./mediapipe/vision_bundle.js');
let detector;
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') {
      const files = await Vision.FilesetResolver.forVisionTasks(
        new URL('./mediapipe/wasm', self.location).href,
      );
      detector = await Vision.HandLandmarker.createFromOptions(files, {
        baseOptions: {
          modelAssetPath: new URL('./mediapipe/hand_landmarker.task', self.location).href,
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      postMessage({ type: 'ready' });
      return;
    }
    if (data.type !== 'frame' || !detector) return;
    const result = detector.detectForVideo(
      new ImageData(new Uint8ClampedArray(data.pixels), data.width, data.height),
      data.time,
    );
    postMessage({
      type: 'result',
      hands: result.landmarks.map((points, i) => ({
        points,
        side: result.handedness[i]?.[0]?.categoryName || String(i),
      })),
    });
  } catch (error) {
    postMessage({ type: 'error', message: error.message });
  }
};
