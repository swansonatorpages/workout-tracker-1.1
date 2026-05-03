import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import type { Session } from '@/constants/storage';

interface Props {
  sessions: Session[];
  units: 'lbs' | 'kg';
}

const CHART_H = 110;
const LABEL_H = 28;
const TOTAL_H = CHART_H + LABEL_H;
const BAR_GAP_RATIO = 0.35;

function shortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function VolumeChart({ sessions, units }: Props) {
  const [width, setWidth] = useState(0);

  const recent = [...sessions].slice(0, 8).reverse();

  if (recent.length === 0) return null;

  const maxVol = Math.max(...recent.map((s) => s.totalVolume), 1);

  const slotW = width > 0 ? width / recent.length : 0;
  const barW = slotW * (1 - BAR_GAP_RATIO);

  return (
    <View style={styles.container}>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#00e5ff' }]} />
          <Text style={styles.legendText}>Upper</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#7c3aed' }]} />
          <Text style={styles.legendText}>Lower</Text>
        </View>
      </View>

      <View
        style={styles.chart}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {width > 0 && (
          <Svg width={width} height={TOTAL_H}>
            {/* Baseline */}
            <Line
              x1={0}
              y1={CHART_H}
              x2={width}
              y2={CHART_H}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
            />

            {recent.map((session, i) => {
              const barH = Math.max((session.totalVolume / maxVol) * CHART_H, 3);
              const x = i * slotW + (slotW - barW) / 2;
              const y = CHART_H - barH;
              const isLatest = i === recent.length - 1;
              const color = session.workoutId === 'upper' ? '#00e5ff' : '#7c3aed';
              const displayVol =
                units === 'kg'
                  ? Math.round(session.totalVolume / 2.205)
                  : session.totalVolume;
              const label = shortDate(session.completedAt);

              return (
                <React.Fragment key={session.id}>
                  <Rect
                    x={x}
                    y={y}
                    width={barW}
                    height={barH}
                    rx={4}
                    fill={color}
                    opacity={isLatest ? 1 : 0.45}
                  />

                  {/* Volume above bar */}
                  <SvgText
                    x={x + barW / 2}
                    y={Math.max(y - 5, 10)}
                    textAnchor="middle"
                    fontSize={8.5}
                    fill={isLatest ? color : '#9ba1b0'}
                    fontWeight={isLatest ? 'bold' : 'normal'}
                  >
                    {displayVol >= 1000
                      ? `${(displayVol / 1000).toFixed(1)}k`
                      : displayVol}
                  </SvgText>

                  {/* Date label */}
                  <SvgText
                    x={x + barW / 2}
                    y={CHART_H + 17}
                    textAnchor="middle"
                    fontSize={8.5}
                    fill={isLatest ? '#ffffff' : '#9ba1b0'}
                  >
                    {label}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(31,33,42,0.85)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    marginBottom: 4,
  },
  legend: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#9ba1b0',
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
  },
  chart: {
    width: '100%',
  },
});
