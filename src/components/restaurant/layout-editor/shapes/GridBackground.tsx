import React from 'react';
import { Rect, Line, Group } from 'react-konva';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../types';

export function GridBackground() {
  const lines: React.ReactElement[] = [];

  // Soft background
  lines.push(
    <Rect
      key="bg"
      x={0}
      y={0}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      fill="#F8FAFC"
      listening={false}
    />,
  );

  // Subtle dot grid every 60px for orientation
  for (let x = 0; x <= CANVAS_WIDTH; x += 60) {
    lines.push(
      <Line
        key={`v-${x}`}
        points={[x, 0, x, CANVAS_HEIGHT]}
        stroke="#E2E8F0"
        strokeWidth={x % 300 === 0 ? 0.8 : 0.3}
        listening={false}
      />,
    );
  }
  for (let y = 0; y <= CANVAS_HEIGHT; y += 60) {
    lines.push(
      <Line
        key={`h-${y}`}
        points={[0, y, CANVAS_WIDTH, y]}
        stroke="#E2E8F0"
        strokeWidth={y % 300 === 0 ? 0.8 : 0.3}
        listening={false}
      />,
    );
  }

  // Border
  lines.push(
    <Rect
      key="border"
      x={0}
      y={0}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      stroke="#CBD5E1"
      strokeWidth={2}
      fill="transparent"
      listening={false}
    />,
  );

  return <Group listening={false}>{lines}</Group>;
}
