import React, { useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { Session } from '@/constants/storage';

interface Props {
  sessions: Session[];
  units: 'lbs' | 'kg';
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatVolume(lbs: number, units: 'lbs' | 'kg') {
  const val = units === 'kg' ? Math.round(lbs / 2.205) : lbs;
  return val.toLocaleString() + ' ' + units;
}

interface BannerState {
  visible: boolean;
  text: string;
}

export function ConsistencyCalendar({ sessions, units }: Props) {
  const [banner, setBanner] = React.useState<BannerState>({ visible: false, text: '' });
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build 56-day window
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const dates: Date[] = [];
  for (let i = 55; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    d.setHours(0, 0, 0, 0);
    dates.push(d);
  }

  // Map sessions by date
  const sessionsByDate = new Map<string, Session[]>();
  for (const s of sessions) {
    const d = new Date(s.completedAt);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().split('T')[0];
    if (!sessionsByDate.has(key)) sessionsByDate.set(key, []);
    sessionsByDate.get(key)!.push(s);
  }

  // Find max volume in window for opacity scaling
  let maxVolume = 0;
  for (const date of dates) {
    const key = date.toISOString().split('T')[0];
    const daySessions = sessionsByDate.get(key) ?? [];
    const vol = daySessions.reduce((acc, s) => acc + s.totalVolume, 0);
    if (vol > maxVolume) maxVolume = vol;
  }

  // Stats
  const fourWeeksAgo = new Date(today);
  fourWeeksAgo.setDate(today.getDate() - 28);
  const sessionsLast4Weeks = sessions.filter(
    (s) => new Date(s.completedAt) >= fourWeeksAgo,
  );
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const liftedThisMonth = sessions
    .filter((s) => new Date(s.completedAt) >= monthStart)
    .reduce((acc, s) => acc + s.totalVolume, 0);

  const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const showBanner = (text: string) => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    setBanner({ visible: true, text });
    Animated.spring(bannerAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
    dismissTimer.current = setTimeout(() => {
      Animated.timing(bannerAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setBanner({ visible: false, text: '' }));
    }, 2500);
  };

  const handleTilePress = (date: Date) => {
    const key = date.toISOString().split('T')[0];
    const daySessions = sessionsByDate.get(key) ?? [];
    if (daySessions.length === 0) return;
    const names = daySessions.map((s) => s.workoutTitle).join(' & ');
    const vol = daySessions.reduce((acc, s) => acc + s.totalVolume, 0);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    showBanner(`${names} · ${formatVolume(vol, units)} · ${dateStr}`);
  };

  return (
    <View>
      {/* Tile tap banner */}
      {banner.visible && (
        <Animated.View
          style={[
            styles.tileBanner,
            {
              opacity: bannerAnim,
              transform: [
                {
                  translateY: bannerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.tileBannerText}>{banner.text}</Text>
        </Animated.View>
      )}

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{sessionsLast4Weeks.length}</Text>
          <Text style={styles.statLabel}>sessions last 4 weeks</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{formatVolume(liftedThisMonth, units)}</Text>
          <Text style={styles.statLabel}>lifted this month</Text>
        </View>
      </View>

      {/* Day labels */}
      <View style={styles.dayLabels}>
        {DAY_LABELS.map((d, i) => (
          <Text key={i} style={styles.dayLabel}>{d}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid}>
        {dates.map((date, index) => {
          const key = date.toISOString().split('T')[0];
          const daySessions = sessionsByDate.get(key) ?? [];
          const vol = daySessions.reduce((acc, s) => acc + s.totalVolume, 0);
          const hasSession = daySessions.length > 0;
          const opacity = hasSession
            ? maxVolume > 0
              ? 0.3 + (vol / maxVolume) * 0.7
              : 0.7
            : 1;
          const isToday = isSameDay(date, new Date());

          return (
            <TouchableOpacity
              key={index}
              onPress={() => handleTilePress(date)}
              activeOpacity={hasSession ? 0.7 : 1}
              style={[
                styles.tile,
                hasSession
                  ? { backgroundColor: `rgba(0,229,255,${opacity.toFixed(2)})` }
                  : styles.tileEmpty,
                isToday && styles.tileToday,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tileBanner: {
    backgroundColor: 'rgba(0,229,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  tileBannerText: {
    color: '#00e5ff',
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 0,
  },
  statBox: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 12,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 17,
    fontFamily: 'Outfit_700Bold',
    marginBottom: 2,
  },
  statLabel: {
    color: '#9ba1b0',
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
  },
  dayLabels: {
    flexDirection: 'row',
    marginBottom: 4,
    gap: 4,
  },
  dayLabel: {
    width: 36,
    textAlign: 'center',
    color: '#9ba1b0',
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tile: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  tileEmpty: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  tileToday: {
    borderWidth: 2,
    borderColor: '#ffffff',
  },
});
