export const clamp = (value: number) => Math.min(1, Math.max(0, value));
export const sceneProgress = (value: number, start: number, end: number) => clamp((value - start) / (end - start));
export const mix = (from: number, to: number, progress: number) => from + (to - from) * progress;

// Hold each composition, then hand its space to the next scene.
export const HOME_SCENES = [0.12, 0.25, 0.39, 0.74, 0.855, 0.955] as const;
