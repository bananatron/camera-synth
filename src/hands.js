import { silentFrame } from './music.js';
export const HANDS = ['Left', 'Right'];
export function routeHands(detected, map) {
  const frames = [silentFrame(), silentFrame()];
  for (const hand of detected) {
    const slot = HANDS.indexOf(hand.side);
    if (slot !== -1) frames[slot] = map(hand);
  }
  return frames;
}
