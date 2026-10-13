"use client";

import dynamic from "next/dynamic";
import React, { forwardRef, useEffect, useState } from "react";

import type {
  CodeEditorRef,
  CodeEditorSurfaceProps,
} from "./CodeEditorSurfaceInternal";

function CodeEditorSkeleton({ minHeight = "360px" }: { minHeight?: string }) {
  return (
    <div
      className="relative w-full rounded-md border border-border/60 bg-background/50 flex flex-col p-4 animate-pulse overflow-hidden"
      style={{ minHeight }}
    >
      <div className="flex items-center gap-4 mb-2.5">
        <div className="w-5 h-3 bg-muted/60 rounded" />
        <div className="w-24 h-3 bg-muted/60 rounded" />
      </div>
      <div className="flex items-center gap-4 mb-2.5">
        <div className="w-5 h-3 bg-muted/60 rounded" />
        <div className="w-48 h-3 bg-muted/60 rounded" />
      </div>
      <div className="flex items-center gap-4 mb-2.5">
        <div className="w-5 h-3 bg-muted/60 rounded" />
        <div className="w-36 h-3 bg-muted/60 rounded" />
      </div>
      <div className="flex items-center gap-4 mb-2.5">
        <div className="w-5 h-3 bg-muted/60 rounded" />
        <div className="w-64 h-3 bg-muted/60 rounded" />
      </div>
      <div className="flex items-center gap-4">
        <div className="w-5 h-3 bg-muted/60 rounded" />
        <div className="w-16 h-3 bg-muted/60 rounded" />
      </div>
    </div>
  );
}

const DynamicInternal = dynamic(
  () => import("./CodeEditorSurfaceInternal"),
  {
    ssr: false,
    loading: () => <CodeEditorSkeleton minHeight="360px" />,
  }
);

export const CodeEditorSurface = forwardRef<
  CodeEditorRef,
  CodeEditorSurfaceProps
>(function CodeEditorSurface(props, ref) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <CodeEditorSkeleton minHeight={props.minHeight} />;
  }

  return <DynamicInternal {...props} ref={ref} />;
});

export type {
  CodeEditorRef,
  CodeEditorSurfaceProps,
} from "./CodeEditorSurfaceInternal";
export { formatJsonString, type FormatResult } from "./formatJson";
export default CodeEditorSurface;
