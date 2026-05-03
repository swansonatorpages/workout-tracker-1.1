import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { Session } from '@/constants/storage';

export function sessionToCSV(session: Session): string {
  const date = new Date(session.completedAt);
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });

  const lines: string[] = [
    `Workout,${session.workoutTitle}`,
    `Date,${dateStr} ${timeStr}`,
    `Total Volume,${session.totalVolume.toLocaleString()} lbs`,
    `Total Sets Completed,${session.totalSetsCompleted}`,
    ``,
    `Exercise,Set #,LBS,Reps,Done`,
  ];

  for (const ex of session.exercises) {
    const name = ex.customNameUsed ?? ex.exerciseTitle;
    if (ex.sets.length === 0) {
      lines.push(`${name},Pre-upgrade session — no set data,,,`);
    } else {
      for (const s of ex.sets) {
        lines.push(`${name},${s.setNumber},${s.lbs},${s.reps},${s.done ? 'Yes' : 'No'}`);
      }
    }
  }

  return lines.join('\n');
}

export async function downloadSessionCSV(session: Session): Promise<void> {
  const csv = sessionToCSV(session);
  const date = new Date(session.completedAt);
  const dateStr = date.toISOString().split('T')[0];
  const filename = `workout_${session.workoutId}_${dateStr}.csv`;

  if (Platform.OS === 'web') {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const fileUri = FileSystem.documentDirectory + filename;
  await FileSystem.writeAsStringAsync(fileUri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Workout CSV',
    });
  }
}
