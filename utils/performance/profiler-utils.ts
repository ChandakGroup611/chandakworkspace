export function onRenderCallback(
  id: string,
  phase: 'mount' | 'update' | 'nested-update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
) {
  // Only log if rendering took more than 16ms (roughly a dropped frame at 60fps)
  // or more than a stricter threshold for enterprise performance
  if (actualDuration > 16 && process.env.NODE_ENV !== 'production') {
    console.warn(
      `[Profiler] Component <${id}> took ${actualDuration.toFixed(1)}ms to render during ${phase}. (Base: ${baseDuration.toFixed(1)}ms)`
    );
  }
}
