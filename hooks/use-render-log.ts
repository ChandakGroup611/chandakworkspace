'use client';

import { useEffect, useRef } from 'react';

export function useRenderLog(componentName: string, props: any) {
  const prevProps = useRef(props);
  const renderCount = useRef(0);
  const isProduction = process.env.NODE_ENV === 'production';

  renderCount.current += 1;

  useEffect(() => {
    if (isProduction) return;

    const changedProps = Object.entries(props).reduce((ps, [k, v]) => {
      if (prevProps.current[k] !== v) {
        ps[k] = [prevProps.current[k], v];
      }
      return ps;
    }, {} as Record<string, [any, any]>);

    if (Object.keys(changedProps).length > 0) {
      console.log(
        `[RenderLog] ${componentName} re-rendered (Render #${renderCount.current}). Changed props:`,
        changedProps
      );
    } else if (renderCount.current > 1) {
      console.log(
        `[RenderLog] ${componentName} re-rendered (Render #${renderCount.current}). No props changed (State or Context change).`
      );
    }

    prevProps.current = props;
  });
}
