import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConsistencyCalendar } from '@/components/ConsistencyCalendar';
import { useWorkout } from '@/context/WorkoutContext';
import { downloadSessionCSV } from '@/utils/csv';
import { WORKOUTS } from '@/constants/workouts';
import type { Session } from '@/constants/storage';

type Filter = 'all' | 'upper' | 'lower';
type View = 'sessions' | 'records';

function formatVolume(lbs: number, units: 'lbs' | 'kg') {
  const val = units === 'kg' ? Math.round(lbs / 2.205) : lbs;
  return val.toLocaleString() + ' ' + units;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatShortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function SessionRow({ session, units }: { session: Session; units: 'lbs' | 'kg' }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.sessionCard}>
      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.8}
        style={styles.sessionHeader}
      >
        <View style={styles.sessionLeft}>
          <Text style={styles.sessionTitle}>{session.workoutTitle}</Text>
          <Text style={styles.sessionMeta}>
            {formatDate(session.completedAt)} · {formatTime(session.completedAt)}
          </Text>
        </View>
        <View style={styles.sessionRight}>
          <Text style={styles.sessionVol}>{formatVolume(session.totalVolume, units)}</Text>
          <Text style={styles.sessionSets}>{session.totalSetsCompleted} sets</Text>
        </View>
        <Feather
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#9ba1b0"
          style={{ marginLeft: 8 }}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.sessionDetail}>
          {session.exercises.length === 0 ? (
            <Text style={styles.noDataText}>Pre-upgrade session — no set data</Text>
          ) : (
            session.exercises.map((ex) => (
              <View key={ex.exerciseId} style={styles.exBlock}>
                <Text style={styles.exTitle}>
                  {ex.customNameUsed ? (
                    <>
                      <Text style={{ color: '#00e5ff' }}>{ex.customNameUsed}</Text>
                      <Text style={{ color: '#9ba1b0' }}> ({ex.exerciseTitle})</Text>
                    </>
                  ) : (
                    ex.exerciseTitle
                  )}
                </Text>
                {ex.sets.length === 0 ? (
                  <Text style={styles.noDataText}>Pre-upgrade session — no set data</Text>
                ) : (
                  ex.sets.map((s) => (
                    <View key={s.setNumber} style={styles.setRow}>
                      <Text style={styles.setNum}>Set {s.setNumber}</Text>
                      <Text style={styles.setData}>
                        {s.lbs} {units === 'kg' ? `(${Math.round(s.lbs / 2.205)} kg)` : 'lbs'} × {s.reps} reps
                      </Text>
                      {s.done ? (
                        <Feather name="check-circle" size={13} color="#2eeb7c" />
                      ) : (
                        <Feather name="circle" size={13} color="rgba(255,255,255,0.2)" />
                      )}
                    </View>
                  ))
                )}
              </View>
            ))
          )}
          <TouchableOpacity
            style={styles.csvBtn}
            onPress={() => downloadSessionCSV(session)}
            activeOpacity={0.7}
          >
            <Feather name="download" size={13} color="#9ba1b0" />
            <Text style={styles.csvBtnText}>Download CSV</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

interface PREntry {
  exerciseId: string;
  title: string;
  prLbs: number | null;
  prDate: string | null;
  customNameUsed: string | null;
  sessionCount: number;
}

function PRsView({ sessions, units }: { sessions: Session[]; units: 'lbs' | 'kg' }) {
  const prsByExercise = useMemo(() => {
    const map: Record<string, { maxLbs: number; date: string; customName: string | null; count: number }> = {};

    for (const session of sessions) {
      for (const ex of session.exercises) {
        const doneSets = ex.sets.filter((s) => s.done && s.lbs > 0);
        if (doneSets.length === 0) continue;
        const maxForSession = Math.max(...doneSets.map((s) => s.lbs));
        const existing = map[ex.exerciseId];
        if (!existing || maxForSession > existing.maxLbs) {
          map[ex.exerciseId] = {
            maxLbs: maxForSession,
            date: session.completedAt,
            customName: ex.customNameUsed,
            count: (existing?.count ?? 0) + 1,
          };
        } else {
          map[ex.exerciseId] = { ...existing, count: existing.count + 1 };
        }
      }
    }

    return map;
  }, [sessions]);

  const hasPRs = Object.values(prsByExercise).some((v) => v.maxLbs > 0);

  if (!hasPRs) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.prEmptyIcon}>🏆</Text>
        <Text style={styles.emptyText}>No records yet</Text>
        <Text style={styles.prEmptyHint}>Complete a workout to set your first PRs</Text>
      </View>
    );
  }

  return (
    <View>
      {Object.values(WORKOUTS).map((workout) => (
        <View key={workout.id} style={styles.prWorkoutSection}>
          <Text style={styles.sectionLabel}>{workout.title.toUpperCase()}</Text>
          <View style={styles.prCard}>
            {workout.exercises.map((exercise, idx) => {
              const pr = prsByExercise[exercise.id];
              const isLast = idx === workout.exercises.length - 1;
              const hasPR = pr && pr.maxLbs > 0;
              const displayWeight = hasPR
                ? units === 'kg'
                  ? `${Math.round(pr.maxLbs / 2.205)} kg`
                  : `${pr.maxLbs} lbs`
                : null;

              return (
                <View key={exercise.id} style={[styles.prRow, !isLast && styles.prRowBorder]}>
                  <View style={styles.prRowLeft}>
                    <Text style={styles.prExName} numberOfLines={1}>
                      {exercise.title}
                    </Text>
                    {hasPR && pr.customName && (
                      <Text style={styles.prCustomName} numberOfLines={1}>
                        ↳ done as {pr.customName}
                      </Text>
                    )}
                    {hasPR && pr.date ? (
                      <Text style={styles.prDate}>Set {formatShortDate(pr.date)}</Text>
                    ) : (
                      <Text style={styles.prNever}>Not done yet</Text>
                    )}
                  </View>
                  <View style={styles.prRowRight}>
                    {hasPR ? (
                      <>
                        <Text style={styles.prWeight}>{displayWeight}</Text>
                        <View style={styles.prTrophy}>
                          <Text style={styles.prTrophyText}>🏆</Text>
                        </View>
                      </>
                    ) : (
                      <Text style={styles.prDash}>—</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { sessions, clearAllHistory, settings } = useWorkout();
  const [view, setView] = useState<View>('sessions');
  const [filter, setFilter] = useState<Filter>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const confirmAnim = useRef(new Animated.Value(0)).current;

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const filtered = sessions.filter((s) => {
    if (filter === 'upper') return s.workoutId === 'upper';
    if (filter === 'lower') return s.workoutId === 'lower';
    return true;
  });

  const handleClearPress = () => {
    if (!showClearConfirm) {
      setShowClearConfirm(true);
      Animated.spring(confirmAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
    }
  };

  const handleClearCancel = () => {
    Animated.timing(confirmAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setShowClearConfirm(false);
    });
  };

  const handleClearConfirm = async () => {
    await clearAllHistory();
    setShowClearConfirm(false);
    confirmAnim.setValue(0);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.blob, styles.blobTeal]} />
      <View style={[styles.blob, styles.blobPurple]} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>History</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Top tab switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, view === 'sessions' && styles.tabActive]}
          onPress={() => setView('sessions')}
          activeOpacity={0.7}
        >
          <Feather name="clock" size={14} color={view === 'sessions' ? '#00e5ff' : '#9ba1b0'} />
          <Text style={[styles.tabText, view === 'sessions' && styles.tabTextActive]}>Sessions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, view === 'records' && styles.tabActive]}
          onPress={() => setView('records')}
          activeOpacity={0.7}
        >
          <Text style={styles.tabIcon}>🏆</Text>
          <Text style={[styles.tabText, view === 'records' && styles.tabTextActive]}>Records</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(40, insets.bottom + 24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {view === 'sessions' ? (
          <>
            {/* Calendar */}
            <View style={styles.calendarSection}>
              <Text style={styles.sectionLabel}>8-WEEK CONSISTENCY</Text>
              <ConsistencyCalendar sessions={sessions} units={settings.units} />
            </View>

            <View style={styles.divider} />

            {/* Filter pills */}
            <View style={styles.filterRow}>
              {(['all', 'upper', 'lower'] as Filter[]).map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  style={[styles.filterPill, filter === f && styles.filterPillActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterPillText, filter === f && styles.filterPillTextActive]}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Session list */}
            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="inbox" size={40} color="rgba(155,161,176,0.3)" />
                <Text style={styles.emptyText}>No sessions yet</Text>
              </View>
            ) : (
              filtered.map((session) => (
                <SessionRow key={session.id} session={session} units={settings.units} />
              ))
            )}

            {/* Clear history */}
            {sessions.length > 0 && (
              <View style={styles.clearSection}>
                {showClearConfirm && (
                  <Animated.View
                    style={[
                      styles.confirmBanner,
                      {
                        opacity: confirmAnim,
                        transform: [
                          {
                            translateY: confirmAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [16, 0],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <Text style={styles.confirmText}>
                      Delete all {sessions.length} sessions? This cannot be undone.
                    </Text>
                    <View style={styles.confirmBtns}>
                      <TouchableOpacity onPress={handleClearCancel} style={styles.cancelBtn} activeOpacity={0.7}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleClearConfirm} style={styles.deleteBtn} activeOpacity={0.7}>
                        <Text style={styles.deleteBtnText}>Delete All</Text>
                      </TouchableOpacity>
                    </View>
                  </Animated.View>
                )}
                <TouchableOpacity
                  onPress={handleClearPress}
                  style={styles.clearBtn}
                  activeOpacity={0.7}
                >
                  <Feather name="trash-2" size={14} color="#ff3b30" />
                  <Text style={styles.clearBtnText}>Clear All History</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <PRsView sessions={sessions} units={settings.units} />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0b0c10',
  },
  blob: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.08,
  },
  blobTeal: {
    backgroundColor: '#00e5ff',
    top: -60,
    left: -60,
  },
  blobPurple: {
    backgroundColor: '#7c3aed',
    bottom: -60,
    right: -60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
  },
  headerTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
    textAlign: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: 'rgba(0,229,255,0.12)',
  },
  tabIcon: {
    fontSize: 13,
  },
  tabText: {
    color: '#9ba1b0',
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  tabTextActive: {
    color: '#00e5ff',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  calendarSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    color: '#9ba1b0',
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 2,
    marginBottom: 14,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterPillActive: {
    backgroundColor: 'rgba(0,229,255,0.15)',
    borderColor: '#00e5ff',
  },
  filterPillText: {
    color: '#9ba1b0',
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },
  filterPillTextActive: {
    color: '#00e5ff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 56,
    gap: 10,
  },
  emptyText: {
    color: '#9ba1b0',
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
  },
  sessionCard: {
    backgroundColor: 'rgba(31,33,42,0.85)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 10,
    overflow: 'hidden',
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  sessionLeft: {
    flex: 1,
  },
  sessionTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 3,
  },
  sessionMeta: {
    color: '#9ba1b0',
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
  },
  sessionRight: {
    alignItems: 'flex-end',
    marginRight: 4,
  },
  sessionVol: {
    color: '#00e5ff',
    fontSize: 13,
    fontFamily: 'Outfit_700Bold',
    marginBottom: 2,
  },
  sessionSets: {
    color: '#9ba1b0',
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
  },
  sessionDetail: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 12,
  },
  noDataText: {
    color: '#9ba1b0',
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    fontStyle: 'italic',
  },
  exBlock: {
    marginBottom: 12,
  },
  exTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 6,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 3,
  },
  setNum: {
    color: '#9ba1b0',
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    width: 44,
  },
  setData: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    flex: 1,
  },
  csvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 4,
  },
  csvBtnText: {
    color: '#9ba1b0',
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
  },
  clearSection: {
    marginTop: 24,
    marginBottom: 8,
  },
  confirmBanner: {
    backgroundColor: 'rgba(255,59,48,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.2)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  confirmText: {
    color: '#ff3b30',
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    marginBottom: 12,
  },
  confirmBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#9ba1b0',
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },
  deleteBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#ff3b30',
    alignItems: 'center',
  },
  deleteBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Outfit_700Bold',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.25)',
    backgroundColor: 'rgba(255,59,48,0.06)',
  },
  clearBtnText: {
    color: '#ff3b30',
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  prWorkoutSection: {
    marginBottom: 24,
  },
  prCard: {
    backgroundColor: 'rgba(31,33,42,0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  prRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  prRowLeft: {
    flex: 1,
    marginRight: 12,
  },
  prExName: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 2,
  },
  prCustomName: {
    color: '#00e5ff',
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginBottom: 2,
  },
  prDate: {
    color: '#9ba1b0',
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
  },
  prNever: {
    color: 'rgba(155,161,176,0.45)',
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    fontStyle: 'italic',
  },
  prRowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  prWeight: {
    color: '#FFB800',
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
  },
  prTrophy: {
    alignItems: 'center',
  },
  prTrophyText: {
    fontSize: 12,
  },
  prDash: {
    color: 'rgba(155,161,176,0.35)',
    fontSize: 18,
    fontFamily: 'Outfit_300Light',
  },
  prEmptyIcon: {
    fontSize: 44,
    marginBottom: 4,
  },
  prEmptyHint: {
    color: 'rgba(155,161,176,0.6)',
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
  },
});
