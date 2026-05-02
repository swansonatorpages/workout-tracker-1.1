import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWorkout } from '@/context/WorkoutContext';
import { WORKOUTS } from '@/constants/workouts';

interface SubstitutionSheetProps {
  exerciseId: string;
  workoutId: string;
  currentTitle: string;
  onClose: () => void;
}

export function SubstitutionSheet({ exerciseId, workoutId, currentTitle, onClose }: SubstitutionSheetProps) {
  const { substituteExercise } = useWorkout();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [inputValue, setInputValue] = useState(currentTitle);

  const workout = WORKOUTS[workoutId];
  const exercise = workout?.exercises.find((e) => e.id === exerciseId);
  const substitutes = exercise?.substitutes ?? [];

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const dismiss = () => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const handleSave = () => {
    if (inputValue.trim()) {
      substituteExercise(exerciseId, inputValue.trim());
    }
    dismiss();
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={dismiss} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY: slideAnim }],
            paddingBottom: Math.max(24, insets.bottom),
          },
        ]}
      >
        {/* Handle */}
        <View style={styles.handle} />

        <Text style={styles.sheetTitle}>Swap Exercise</Text>

        {/* Input */}
        <TextInput
          style={styles.input}
          value={inputValue}
          onChangeText={setInputValue}
          autoFocus
          fontSize={16}
          selectTextOnFocus
          placeholderTextColor="rgba(155,161,176,0.5)"
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />

        {/* Substitutes */}
        <Text style={styles.subsLabel}>Substitutes:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
          {substitutes.map((sub) => (
            <TouchableOpacity
              key={sub}
              style={[styles.chip, inputValue === sub && styles.chipActive]}
              onPress={() => setInputValue(sub)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, inputValue === sub && styles.chipTextActive]}>{sub}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Save button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.saveBtnText}>Save for this session</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a1c24',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '65%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 14,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    color: '#ffffff',
    fontFamily: 'Outfit_500Medium',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.3)',
    marginBottom: 16,
  },
  subsLabel: {
    color: '#9ba1b0',
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipActive: {
    backgroundColor: 'rgba(0,229,255,0.15)',
    borderColor: '#00e5ff',
  },
  chipText: {
    color: '#9ba1b0',
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  chipTextActive: {
    color: '#00e5ff',
  },
  saveBtn: {
    backgroundColor: '#00e5ff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#0b0c10',
    fontSize: 15,
    fontFamily: 'Outfit_700Bold',
  },
});
