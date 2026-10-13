import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
  Animated,
  Easing,
  Switch,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AppFonts from '../theme/AppFonts';
import AnimatedGifEmoji from './AnimatedGifEmoji';

const { width } = Dimensions.get('window');

interface SpicyGamesLoungeProps {
  onBack: () => void;
  partnerName?: string;
  userName?: string;
}

// -------------------------------------------------------------
// 1. DATA FOR KAMA ROULETTE (SENSUAL WHEEL)
// -------------------------------------------------------------
const KAMA_WHEEL_SEGMENTS = [
  { id: '1', title: 'SPOONING BUTTERFLY', emoji: '🦋', color: '#E60067', desc: 'Curled together from behind, rhythmic slow rhythm and warm breath.' },
  { id: '2', title: 'LOTUS KISS', emoji: '🌸', color: '#3A004C', desc: 'Seated facing each other, legs wrapped, deep unbroken eye contact.' },
  { id: '3', title: 'VELVET CARESS', emoji: '🪶', color: '#FF1E56', desc: 'Use only fingertips and light whispers across their most sensitive skin.' },
  { id: '4', title: 'GODDESS ON TOP', emoji: '👑', color: '#260033', desc: 'Total surrender: partner lies back while the goddess dictates the pace.' },
  { id: '5', title: 'ELECTRIC WHISPER', emoji: '⚡', color: '#E60067', desc: 'Trace lips 1 millimeter away from their neck without touching for 30s.' },
  { id: '6', title: 'SILK & ICE', emoji: '🧊', color: '#3A004C', desc: 'Alternate warm breath and gentle cool touches across chest and collar.' },
  { id: '7', title: 'WARM MELT', emoji: '🕯️', color: '#FF1E56', desc: 'Slow, lingering, unhurried kissing from jawline down to the navel.' },
  { id: '8', title: 'WILD FIRE', emoji: '🔥', color: '#260033', desc: 'Intense, passionate embrace where you express your deepest longing.' },
];

// -------------------------------------------------------------
// 2. DATA FOR NAUGHTY SCENES (PROMPT GENERATOR)
// -------------------------------------------------------------
const SCENE_ACTIONS = [
  'Glide cold ice slowly over 🧊',
  'Trace light feather-touches along 🪶',
  'Press warm, lingering kisses against 💋',
  'Softly nibble and blow warm breath upon 👄',
  'Drape a silk blindfold and caress ✨',
  'Whisper your forbidden fantasy directly against 🫦',
];

const SCENE_TARGETS = [
  'their lips and jawline 👄',
  'their neck and collarbone ✨',
  'their bare back and spine 🕯️',
  'their inner wrists and palms 🤲',
  'their lower waist and hips 🔥',
  'their earlobe and throat 👂',
];

const SCENE_CONSTRAINTS = [
  'while maintaining unbroken eye contact 👁️',
  'without letting them make a single sound 🤫',
  'while whispering how much you desire them 🫦',
  'for 45 continuous seconds without pausing ⏳',
  'with eyes completely closed in the dark 🙈',
  'matching your breath to their heartbeat 💓',
];

// -------------------------------------------------------------
// 3. DATA FOR SEXY DICE
// -------------------------------------------------------------
const DICE_ACTIONS = ['Kiss 💋', 'Nibble 🫦', 'Lick 👅', 'Massage 💆', 'Caress 🪶', 'Bite Softly 👄'];
const DICE_BODY = ['Neck 🦒', 'Lips 💋', 'Collarbone ✨', 'Ears 👂', 'Lower Back 🕯️', 'Thighs 🔥'];
const DICE_VIBE = ['Blindfolded 🙈', 'Under Candlelight 🕯️', 'With Ice Cube 🧊', 'For 60s ⏳', 'Whispering 🫦', 'Slow & Deep ✨'];

// -------------------------------------------------------------
// 4. DATA FOR DIRTY NEVER HAVE I EVER
// -------------------------------------------------------------
const DIRTY_NHIE_PROMPTS = [
  'Never have I ever fantasized about you in the middle of a busy workday.',
  'Never have I ever wanted to kiss you passionately in an elevator or public place.',
  'Never have I ever had a spicy dream about you that made me wake up breathless.',
  'Never have I ever pretended to be cold just to feel your warm skin against mine.',
  'Never have I ever mentally undressed you while you were talking across the table.',
  'Never have I ever wanted you to take complete control and pin me down.',
  'Never have I ever stared at your lips while wanting to pull you into a dark room.',
  'Never have I ever worn something special specifically hoping you would take it off.',
];

// -------------------------------------------------------------
// 5. DATA FOR TRUTH OR DARE
// -------------------------------------------------------------
const SPICY_TRUTHS = [
  'What is the most erotic thought you had about me recently?',
  'Where on your body do you secretly love being kissed the most?',
  'What is one bedroom fantasy you have been shy to ask for?',
  'What outfit or look of mine drives you completely wild?',
  'What was our most memorable, passionate kiss so far?',
];

const SPICY_DARES = [
  'Give me a slow, lingering kiss on the neck for 30 uninterrupted seconds.',
  'Take off one item of clothing with your partner watching.',
  'Whisper the naughtiest thing you want to do tonight directly into my ear.',
  'Blindfold yourself and let your partner touch you anywhere for 1 minute.',
  'Feed me a treat or ice cube using only your mouth.',
];

export const SpicyGamesLounge: React.FC<SpicyGamesLoungeProps> = ({
  onBack,
  partnerName = 'Partner',
  userName = 'You',
}) => {
  // Global Lounge State
  const [isOrgasmicMode, setIsOrgasmicMode] = useState(true);
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [remainingSpins, setRemainingSpins] = useState(6);

  // Kama Roulette State
  const spinValue = useRef(new Animated.Value(0)).current;
  const [isWheelSpinning, setIsWheelSpinning] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState(KAMA_WHEEL_SEGMENTS[0]);
  const [wheelPoseMode, setWheelPoseMode] = useState<'all' | 'laydown' | 'ontop'>('all');

  // Naughty Scenes State
  const [actorName, setActorName] = useState(userName);
  const [receiverName, setReceiverName] = useState(partnerName);
  const [sceneAction, setSceneAction] = useState(SCENE_ACTIONS[0]);
  const [sceneTarget, setSceneTarget] = useState(SCENE_TARGETS[0]);
  const [sceneConstraint, setSceneConstraint] = useState(SCENE_CONSTRAINTS[0]);
  const [sceneTimer, setSceneTimer] = useState(45);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sexy Dice State
  const [dice1, setDice1] = useState(DICE_ACTIONS[0]);
  const [dice2, setDice2] = useState(DICE_BODY[0]);
  const [dice3, setDice3] = useState(DICE_VIBE[0]);
  const [isRolling, setIsRolling] = useState(false);
  const diceAnim = useRef(new Animated.Value(0)).current;

  // Truth or Dare State
  const [todTab, setTodTab] = useState<'truth' | 'dare'>('truth');
  const [todIndex, setTodIndex] = useState(0);
  const [todCardFlipped, setTodCardFlipped] = useState(false);

  // Dirty Never Have I Ever State
  const [nhieIndex, setNhieIndex] = useState(0);
  const [nhieUserVote, setNhieUserVote] = useState<'have' | 'never' | null>(null);

  // Timer countdown handler
  useEffect(() => {
    if (isTimerRunning && sceneTimer > 0) {
      timerRef.current = setInterval(() => {
        setSceneTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsTimerRunning(false);
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {}
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, sceneTimer]);

  // Spin Wheel Handler
  const handleSpinRoulette = () => {
    if (isWheelSpinning || remainingSpins <= 0) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}

    setIsWheelSpinning(true);
    setRemainingSpins((prev) => Math.max(0, prev - 1));

    const randomRotations = 5 + Math.random() * 4;

    spinValue.setValue(0);
    Animated.timing(spinValue, {
      toValue: randomRotations,
      duration: 3200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setIsWheelSpinning(false);
      const chosen = KAMA_WHEEL_SEGMENTS[Math.floor(Math.random() * KAMA_WHEEL_SEGMENTS.length)];
      setSelectedSegment(chosen);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    });
  };

  const wheelRotation = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Roll Dice Handler
  const handleRollDice = () => {
    if (isRolling) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    setIsRolling(true);
    Animated.sequence([
      Animated.timing(diceAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(diceAnim, { toValue: -1, duration: 150, useNativeDriver: true }),
      Animated.timing(diceAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      setDice1(DICE_ACTIONS[Math.floor(Math.random() * DICE_ACTIONS.length)]);
      setDice2(DICE_BODY[Math.floor(Math.random() * DICE_BODY.length)]);
      setDice3(DICE_VIBE[Math.floor(Math.random() * DICE_VIBE.length)]);
      setIsRolling(false);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }, 600);
  };

  // Next Naughty Scene Handler
  const handleNextScene = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSceneAction(SCENE_ACTIONS[Math.floor(Math.random() * SCENE_ACTIONS.length)]);
    setSceneTarget(SCENE_TARGETS[Math.floor(Math.random() * SCENE_TARGETS.length)]);
    setSceneConstraint(SCENE_CONSTRAINTS[Math.floor(Math.random() * SCENE_CONSTRAINTS.length)]);
    setSceneTimer(45);
    setIsTimerRunning(false);
  };

  // Swap Actor & Receiver
  const handleSwapPlayers = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setActorName((prev) => (prev === userName ? partnerName : userName));
    setReceiverName((prev) => (prev === partnerName ? userName : partnerName));
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#100216', '#1E0528', '#2D073B', '#14021D']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Top Header Bar */}
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerTitle}>CHOOSE A GAME</Text>
            <View style={styles.flamesRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Text key={i} style={styles.flameIcon}>🔥</Text>
              ))}
              <Text style={styles.flamesSub}>{remainingSpins} free spins</Text>
            </View>
          </View>

          {/* Orgasmic / Dirty Mode Toggle */}
          <View style={styles.toggleGroup}>
            <Text style={styles.toggleLabel}>ORGASMIC</Text>
            <Switch
              value={isOrgasmicMode}
              onValueChange={(val) => {
                setIsOrgasmicMode(val);
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                } catch {}
              }}
              trackColor={{ false: '#3B184C', true: '#FF1E56' }}
              thumbColor={isOrgasmicMode ? '#FFFFFF' : '#8A53A0'}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>
        </View>

        {/* Main 8-Game Grid (Directly matches Reference Photo) */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollGrid}>
          <View style={styles.gamesGrid}>
            {/* 1. TRY PREMIUM */}
            <TouchableOpacity
              style={[styles.gameCard, styles.premiumCard]}
              onPress={() => {
                try {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } catch {}
                setActiveGame('kama_roulette');
              }}
              activeOpacity={0.85}
            >
              <View style={styles.adultBadge}>
                <Text style={styles.adultBadgeText}>18+</Text>
              </View>
              <Text style={styles.gameCardTitle}>TRY PREMIUM</Text>
              <Text style={styles.gameCardTag}>VIP ACCESS</Text>
            </TouchableOpacity>

            {/* 2. NAUGHTY SCENES */}
            <TouchableOpacity
              style={styles.gameCard}
              onPress={() => setActiveGame('naughty_scenes')}
              activeOpacity={0.85}
            >
              <View style={styles.cardIconCircle}>
                <AnimatedGifEmoji emoji="✨" size={32} />
              </View>
              <Text style={styles.gameCardTitle}>NAUGHTY SCENES</Text>
              <Text style={styles.gameCardTag}>SENSUAL PROMPTS</Text>
            </TouchableOpacity>

            {/* 3. SEXY DICE */}
            <TouchableOpacity
              style={styles.gameCard}
              onPress={() => setActiveGame('sexy_dice')}
              activeOpacity={0.85}
            >
              <View style={styles.cardIconCircle}>
                <AnimatedGifEmoji emoji="🎲" size={32} />
              </View>
              <Text style={styles.gameCardTitle}>SEXY DICE</Text>
              <Text style={styles.gameCardTag}>3D ACTION ROLL</Text>
            </TouchableOpacity>

            {/* 4. KAMA ROULETTE */}
            <TouchableOpacity
              style={[styles.gameCard, styles.activeCardGlow]}
              onPress={() => setActiveGame('kama_roulette')}
              activeOpacity={0.85}
            >
              <View style={styles.cardIconCircle}>
                <AnimatedGifEmoji emoji="🎡" size={32} />
              </View>
              <Text style={styles.gameCardTitle}>KAMA ROULETTE</Text>
              <Text style={[styles.gameCardTag, { color: '#FF2A6D' }]}>SPIN WHEEL</Text>
            </TouchableOpacity>

            {/* 5. TRUTH OR DARE ? */}
            <TouchableOpacity
              style={styles.gameCard}
              onPress={() => setActiveGame('truth_or_dare')}
              activeOpacity={0.85}
            >
              <View style={styles.cardIconCircle}>
                <AnimatedGifEmoji emoji="💖" size={32} />
              </View>
              <Text style={styles.gameCardTitle}>TRUTH OR DARE ?</Text>
              <Text style={styles.gameCardTag}>CARDS FLIP</Text>
            </TouchableOpacity>

            {/* 6. DIRTY NEVER HAVE I EVER */}
            <TouchableOpacity
              style={styles.gameCard}
              onPress={() => setActiveGame('dirty_nhie')}
              activeOpacity={0.85}
            >
              <View style={styles.cardIconCircle}>
                <Text style={{ fontSize: 28 }}>🍒</Text>
              </View>
              <Text style={styles.gameCardTitle}>DIRTY NEVER HAVE I EVER</Text>
              <Text style={styles.gameCardTag}>CONFESSIONS</Text>
            </TouchableOpacity>

            {/* 7. I DARE YOU */}
            <TouchableOpacity
              style={styles.gameCard}
              onPress={() => {
                setTodTab('dare');
                setActiveGame('truth_or_dare');
              }}
              activeOpacity={0.85}
            >
              <View style={styles.cardIconCircle}>
                <AnimatedGifEmoji emoji="💌" size={32} />
              </View>
              <Text style={styles.gameCardTitle}>I DARE YOU</Text>
              <Text style={styles.gameCardTag}>INTENSE DARES</Text>
            </TouchableOpacity>

            {/* 8. HOT TRIVIA */}
            <TouchableOpacity
              style={styles.gameCard}
              onPress={() => setActiveGame('hot_trivia')}
              activeOpacity={0.85}
            >
              <View style={styles.cardIconCircle}>
                <AnimatedGifEmoji emoji="🎯" size={32} />
              </View>
              <Text style={styles.gameCardTitle}>HOT TRIVIA</Text>
              <Text style={styles.gameCardTag}>INTIMACY QUIZ</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* ======================================================== */}
      {/* MODAL 1: KAMA ROULETTE / SENSUAL PLAY (SPIN WHEEL)        */}
      {/* ======================================================== */}
      <Modal visible={activeGame === 'kama_roulette'} animationType="slide">
        <View style={styles.modalFullContainer}>
          <LinearGradient
            colors={['#100216', '#260432', '#3D074B', '#12021B']}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView style={styles.modalSafeArea}>
            {/* Header */}
            <View style={styles.modalTopHeader}>
              <TouchableOpacity
                style={styles.modalBackBtn}
                onPress={() => setActiveGame(null)}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>SENSUAL PLAY</Text>
              <View style={styles.settingsBtnDummy}>
                <Feather name="settings" size={20} color="#FF6584" />
              </View>
            </View>

            {/* Flame counter */}
            <View style={styles.modalSubHeaderRow}>
              <View style={styles.flamesRowCenter}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Text key={i} style={styles.flameIcon}>🔥</Text>
                ))}
              </View>
              <Text style={styles.freeSpinsSub}>{remainingSpins} remaining free spins</Text>
              <Text style={styles.currentTurnLabel}>{receiverName}</Text>
            </View>

            {/* The Big Sensual Spin Wheel */}
            <View style={styles.wheelHost}>
              {/* Pointer Arrow */}
              <View style={styles.wheelPointer}>
                <Ionicons name="caret-down" size={28} color="#FF1E56" />
              </View>

              <Animated.View
                style={[
                  styles.wheelDisc,
                  {
                    transform: [{ rotate: wheelRotation }],
                  },
                ]}
              >
                {KAMA_WHEEL_SEGMENTS.map((seg, idx) => {
                  const angle = (idx * 360) / KAMA_WHEEL_SEGMENTS.length;
                  return (
                    <View
                      key={seg.id}
                      style={[
                        styles.wheelSegmentSlice,
                        {
                          backgroundColor: seg.color,
                          transform: [{ rotate: `${angle}deg` }],
                        },
                      ]}
                    >
                      <Text style={styles.wheelSegmentText} numberOfLines={1}>
                        {seg.title}
                      </Text>
                    </View>
                  );
                })}

                {/* Center Hub */}
                <View style={styles.wheelCenterHub}>
                  <Ionicons name="sync" size={22} color="#FFFFFF" />
                </View>
              </Animated.View>
            </View>

            {/* Selected Position Card Result */}
            {selectedSegment && (
              <View style={styles.poseResultCard}>
                <View style={styles.poseResultHeader}>
                  <Text style={styles.poseResultEmoji}>{selectedSegment.emoji}</Text>
                  <Text style={styles.poseResultTitle}>{selectedSegment.title}</Text>
                </View>
                <Text style={styles.poseResultDesc}>{selectedSegment.desc}</Text>
              </View>
            )}

            {/* Pose Filter Tabs (Matches reference photo: REPLAY / LAYDOWN / ON TOP) */}
            <View style={styles.poseFilterRow}>
              <TouchableOpacity
                style={[styles.poseFilterBtn, wheelPoseMode === 'all' && styles.poseFilterActive]}
                onPress={() => setWheelPoseMode('all')}
              >
                <Text style={styles.poseFilterText}>REPLAY</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.poseFilterBtn, wheelPoseMode === 'laydown' && styles.poseFilterActive]}
                onPress={() => setWheelPoseMode('laydown')}
              >
                <Text style={styles.poseFilterText}>LAYDOWN ✓</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.poseFilterBtn, wheelPoseMode === 'ontop' && styles.poseFilterActive]}
                onPress={() => setWheelPoseMode('ontop')}
              >
                <Text style={styles.poseFilterText}>ON TOP</Text>
              </TouchableOpacity>
            </View>

            {/* Big Spin Action Button */}
            <View style={styles.bottomSpinWrapper}>
              <TouchableOpacity
                style={[styles.bigSpinBtn, isWheelSpinning && styles.spinBtnDisabled]}
                onPress={handleSpinRoulette}
                disabled={isWheelSpinning}
                activeOpacity={0.85}
              >
                <Text style={styles.bigSpinBtnText}>
                  {isWheelSpinning ? 'SPINNING...' : 'SPIN'}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: NAUGHTY SCENES (SENSUAL ACTION PROMPTER)         */}
      {/* ======================================================== */}
      <Modal visible={activeGame === 'naughty_scenes'} animationType="slide">
        <View style={styles.modalFullContainer}>
          <LinearGradient
            colors={['#14021A', '#250433', '#39074B', '#110118']}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView style={styles.modalSafeArea}>
            {/* Header */}
            <View style={styles.modalTopHeader}>
              <TouchableOpacity
                style={styles.modalBackBtn}
                onPress={() => setActiveGame(null)}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>NAUGHTY SCENES</Text>
              <TouchableOpacity onPress={handleSwapPlayers} style={styles.swapBtn}>
                <Ionicons name="swap-horizontal" size={20} color="#FF6584" />
              </TouchableOpacity>
            </View>

            {/* Player routing e.g. "CHRIS ➔ JESSICA" */}
            <View style={styles.playerRouteBanner}>
              <Text style={styles.playerNameTag}>{actorName.toUpperCase()}</Text>
              <Ionicons name="arrow-forward" size={16} color="#FF1E56" style={{ marginHorizontal: 8 }} />
              <Text style={[styles.playerNameTag, { color: '#FF2A6D' }]}>{receiverName.toUpperCase()}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scenesContent}>
              {/* 3 Prompter Cards matching image */}
              <View style={styles.sceneCard}>
                <Text style={styles.sceneCardLabel}>ACTION</Text>
                <Text style={styles.sceneCardText}>{sceneAction}</Text>
              </View>

              <View style={styles.sceneCard}>
                <Text style={styles.sceneCardLabel}>TARGET</Text>
                <Text style={styles.sceneCardText}>{sceneTarget}</Text>
              </View>

              <View style={styles.sceneCard}>
                <Text style={styles.sceneCardLabel}>HOW</Text>
                <Text style={styles.sceneCardText}>{sceneConstraint}</Text>
              </View>

              {/* Countdown Timer */}
              <View style={styles.timerBar}>
                <TouchableOpacity
                  style={styles.timerPlayBtn}
                  onPress={() => setIsTimerRunning(!isTimerRunning)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={isTimerRunning ? 'pause' : 'play'} size={20} color="#FFFFFF" />
                  <Text style={styles.timerText}>
                    0:{sceneTimer < 10 ? `0${sceneTimer}` : sceneTimer}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.skipBtn} onPress={handleNextScene} activeOpacity={0.8}>
                  <Text style={styles.skipBtnText}>SKIP / NEXT</Text>
                  <Ionicons name="arrow-forward" size={14} color="#FF6584" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: SEXY DICE                                       */}
      {/* ======================================================== */}
      <Modal visible={activeGame === 'sexy_dice'} animationType="slide">
        <View style={styles.modalFullContainer}>
          <LinearGradient
            colors={['#100216', '#260432', '#3D074B', '#12021B']}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalTopHeader}>
              <TouchableOpacity
                style={styles.modalBackBtn}
                onPress={() => setActiveGame(null)}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>SEXY DICE</Text>
              <View style={{ width: 36 }} />
            </View>

            <View style={styles.diceArena}>
              <Animated.View
                style={[
                  styles.diceCardRow,
                  {
                    transform: [
                      {
                        rotate: diceAnim.interpolate({
                          inputRange: [-1, 1],
                          outputRange: ['-12deg', '12deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.diceBox}>
                  <Text style={styles.diceBoxTag}>ACTION</Text>
                  <Text style={styles.diceBoxVal}>{dice1}</Text>
                </View>
                <View style={styles.diceBox}>
                  <Text style={styles.diceBoxTag}>WHERE</Text>
                  <Text style={styles.diceBoxVal}>{dice2}</Text>
                </View>
              </Animated.View>

              <View style={[styles.diceBox, { marginTop: 16, width: '90%' }]}>
                <Text style={styles.diceBoxTag}>MOOD & STYLE</Text>
                <Text style={styles.diceBoxVal}>{dice3}</Text>
              </View>

              <TouchableOpacity
                style={[styles.bigSpinBtn, { marginTop: 40, width: '90%' }]}
                onPress={handleRollDice}
                disabled={isRolling}
                activeOpacity={0.85}
              >
                <Text style={styles.bigSpinBtnText}>{isRolling ? 'ROLLING...' : 'ROLL THE DICE 🎲'}</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 4: TRUTH OR DARE                                   */}
      {/* ======================================================== */}
      <Modal visible={activeGame === 'truth_or_dare'} animationType="slide">
        <View style={styles.modalFullContainer}>
          <LinearGradient
            colors={['#100216', '#260432', '#3D074B', '#12021B']}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalTopHeader}>
              <TouchableOpacity
                style={styles.modalBackBtn}
                onPress={() => setActiveGame(null)}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>TRUTH OR DARE</Text>
              <View style={{ width: 36 }} />
            </View>

            {/* Mode selection tabs: TRUTH vs DARE */}
            <View style={styles.todTabsRow}>
              <TouchableOpacity
                style={[styles.todTabBtn, todTab === 'truth' && styles.todTabActive]}
                onPress={() => {
                  setTodTab('truth');
                  setTodCardFlipped(false);
                }}
              >
                <Text style={[styles.todTabText, todTab === 'truth' && styles.todTabTextActive]}>
                  TRUTH
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.todTabBtn, todTab === 'dare' && styles.todTabActive]}
                onPress={() => {
                  setTodTab('dare');
                  setTodCardFlipped(false);
                }}
              >
                <Text style={[styles.todTabText, todTab === 'dare' && styles.todTabTextActive]}>
                  DARE
                </Text>
              </TouchableOpacity>
            </View>

            {/* Flip Card Arena */}
            <View style={styles.todCardWrapper}>
              <TouchableOpacity
                style={styles.todCard}
                onPress={() => setTodCardFlipped(!todCardFlipped)}
                activeOpacity={0.9}
              >
                <Text style={styles.todCardCategory}>{todTab.toUpperCase()} PROMPT</Text>
                <Text style={styles.todPromptText}>
                  {todTab === 'truth'
                    ? SPICY_TRUTHS[todIndex % SPICY_TRUTHS.length]
                    : SPICY_DARES[todIndex % SPICY_DARES.length]}
                </Text>
                <Text style={styles.todHint}>Tap card to flip • Complete with partner</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.bigSpinBtn, { marginTop: 24, width: '90%' }]}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  } catch {}
                  setTodIndex((prev) => prev + 1);
                  setTodCardFlipped(false);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.bigSpinBtnText}>NEXT CARD ➔</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 5: DIRTY NEVER HAVE I EVER                         */}
      {/* ======================================================== */}
      <Modal visible={activeGame === 'dirty_nhie'} animationType="slide">
        <View style={styles.modalFullContainer}>
          <LinearGradient
            colors={['#100216', '#260432', '#3D074B', '#12021B']}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalTopHeader}>
              <TouchableOpacity
                style={styles.modalBackBtn}
                onPress={() => setActiveGame(null)}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>NEVER HAVE I EVER</Text>
              <View style={{ width: 36 }} />
            </View>

            <View style={styles.nhieArena}>
              <View style={styles.nhieCard}>
                <Text style={styles.nhieEmojiHeader}>🍒 DIRTY CONFESSION</Text>
                <Text style={styles.nhiePrompt}>
                  "{DIRTY_NHIE_PROMPTS[nhieIndex % DIRTY_NHIE_PROMPTS.length]}"
                </Text>
              </View>

              <View style={styles.nhieVoteRow}>
                <TouchableOpacity
                  style={[styles.nhieVoteBtn, nhieUserVote === 'have' && styles.nhieVoteActive]}
                  onPress={() => {
                    setNhieUserVote('have');
                    try {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } catch {}
                  }}
                >
                  <Text style={styles.nhieVoteText}>I HAVE 🍷</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.nhieVoteBtn, nhieUserVote === 'never' && styles.nhieVoteActive]}
                  onPress={() => {
                    setNhieUserVote('never');
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                  }}
                >
                  <Text style={styles.nhieVoteText}>NEVER 😇</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.bigSpinBtn, { marginTop: 30, width: '90%' }]}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  } catch {}
                  setNhieIndex((prev) => prev + 1);
                  setNhieUserVote(null);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.bigSpinBtnText}>NEXT QUESTION ➔</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 6: HOT TRIVIA                                      */}
      {/* ======================================================== */}
      <Modal visible={activeGame === 'hot_trivia'} animationType="slide">
        <View style={styles.modalFullContainer}>
          <LinearGradient
            colors={['#100216', '#260432', '#3D074B', '#12021B']}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalTopHeader}>
              <TouchableOpacity
                style={styles.modalBackBtn}
                onPress={() => setActiveGame(null)}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>HOT TRIVIA</Text>
              <View style={{ width: 36 }} />
            </View>

            <View style={styles.triviaArena}>
              <View style={styles.triviaCard}>
                <Text style={styles.triviaCardTag}>INTIMACY QUESTION</Text>
                <Text style={styles.triviaQuestion}>
                  "Player A ({userName}): What sex position does Player 2 ({partnerName}) crave the most?"
                </Text>
              </View>

              <View style={styles.triviaAnswersRow}>
                <TouchableOpacity
                  style={[styles.triviaBtn, { backgroundColor: '#3A004C' }]}
                  onPress={() => {
                    try {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    } catch {}
                  }}
                >
                  <Text style={styles.triviaBtnText}>WRONG ❌</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.triviaBtn, { backgroundColor: '#FF1E56' }]}
                  onPress={() => {
                    try {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } catch {}
                  }}
                >
                  <Text style={styles.triviaBtnText}>CORRECT ✅</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#100216',
  },
  safeArea: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 30, 86, 0.2)',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitleGroup: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: AppFonts.title,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  flamesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 2,
  },
  flameIcon: {
    fontSize: 12,
  },
  flamesSub: {
    fontSize: 10,
    color: '#FF6584',
    fontWeight: '700',
    marginLeft: 4,
  },
  toggleGroup: {
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 9,
    color: '#FFBAC8',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scrollGrid: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 40,
  },
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  gameCard: {
    width: (width - 40) / 2,
    backgroundColor: 'rgba(45, 8, 58, 0.75)',
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 30, 86, 0.35)',
    shadowColor: '#FF1E56',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 4,
  },
  premiumCard: {
    borderColor: '#FF2A6D',
    backgroundColor: 'rgba(70, 10, 85, 0.85)',
  },
  activeCardGlow: {
    borderColor: '#FF1E56',
    shadowOpacity: 0.5,
  },
  adultBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FF2A6D',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(255, 42, 109, 0.15)',
  },
  adultBadgeText: {
    color: '#FF2A6D',
    fontWeight: '900',
    fontSize: 16,
  },
  cardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  gameCardTitle: {
    fontFamily: AppFonts.title,
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  gameCardTag: {
    fontSize: 10,
    color: '#FF6584',
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.5,
  },

  // Modal Common Styles
  modalFullContainer: {
    flex: 1,
    backgroundColor: '#100216',
  },
  modalSafeArea: {
    flex: 1,
  },
  modalTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderTitle: {
    fontFamily: AppFonts.title,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  settingsBtnDummy: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubHeaderRow: {
    alignItems: 'center',
    marginTop: 4,
  },
  flamesRowCenter: {
    flexDirection: 'row',
    gap: 3,
  },
  freeSpinsSub: {
    fontSize: 11,
    color: '#FF6584',
    fontWeight: '700',
    marginTop: 4,
  },
  currentTurnLabel: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 6,
    letterSpacing: 1,
  },

  // Spin Wheel Host
  wheelHost: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18,
    position: 'relative',
  },
  wheelPointer: {
    position: 'absolute',
    top: -14,
    zIndex: 10,
  },
  wheelDisc: {
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 4,
    borderColor: '#FF1E56',
    backgroundColor: '#260033',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  wheelSegmentSlice: {
    position: 'absolute',
    width: '100%',
    height: 32,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 10,
  },
  wheelSegmentText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  wheelCenterHub: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF1E56',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  poseResultCard: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(55, 10, 70, 0.75)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.2,
    borderColor: '#FF2A6D',
  },
  poseResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  poseResultEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  poseResultTitle: {
    fontFamily: AppFonts.title,
    fontSize: 15,
    color: '#FFFFFF',
  },
  poseResultDesc: {
    fontSize: 12,
    color: '#FFBAC8',
    lineHeight: 16,
  },
  poseFilterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 14,
  },
  poseFilterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  poseFilterActive: {
    backgroundColor: '#FF1E56',
    borderColor: '#FF1E56',
  },
  poseFilterText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bottomSpinWrapper: {
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 20,
  },
  bigSpinBtn: {
    width: width * 0.88,
    backgroundColor: '#FF1E56',
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF1E56',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 6,
  },
  spinBtnDisabled: {
    opacity: 0.6,
  },
  bigSpinBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1.5,
  },

  // Naughty Scenes Styles
  playerRouteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 30, 86, 0.15)',
    marginHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 30, 86, 0.35)',
    marginBottom: 14,
  },
  playerNameTag: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  swapBtn: {
    padding: 6,
  },
  scenesContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  sceneCard: {
    backgroundColor: 'rgba(45, 8, 60, 0.78)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 30, 86, 0.4)',
  },
  sceneCardLabel: {
    fontSize: 10,
    color: '#FF6584',
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  sceneCardText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  timerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  timerPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF1E56',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    gap: 8,
  },
  timerText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  skipBtnText: {
    color: '#FF6584',
    fontWeight: '800',
    fontSize: 13,
  },

  // Sexy Dice Styles
  diceArena: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  diceCardRow: {
    flexDirection: 'row',
    gap: 12,
    width: '90%',
  },
  diceBox: {
    flex: 1,
    backgroundColor: 'rgba(50, 10, 65, 0.8)',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FF2A6D',
  },
  diceBoxTag: {
    fontSize: 10,
    color: '#FF6584',
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  diceBoxVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // Truth or Dare
  todTabsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 14,
  },
  todTabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  todTabActive: {
    backgroundColor: '#FF1E56',
    borderColor: '#FF1E56',
  },
  todTabText: {
    color: '#FFBAC8',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 1,
  },
  todTabTextActive: {
    color: '#FFFFFF',
  },
  todCardWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  todCard: {
    width: '90%',
    minHeight: 220,
    backgroundColor: 'rgba(55, 10, 75, 0.85)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF2A6D',
    shadowColor: '#FF1E56',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  todCardCategory: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF6584',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  todPromptText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 26,
  },
  todHint: {
    fontSize: 10,
    color: '#C79CB4',
    marginTop: 18,
  },

  // Never Have I Ever
  nhieArena: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  nhieCard: {
    width: '90%',
    backgroundColor: 'rgba(55, 10, 75, 0.85)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF2A6D',
  },
  nhieEmojiHeader: {
    fontSize: 12,
    color: '#FF6584',
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 12,
  },
  nhiePrompt: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 26,
  },
  nhieVoteRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 20,
  },
  nhieVoteBtn: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  nhieVoteActive: {
    backgroundColor: '#FF1E56',
    borderColor: '#FF1E56',
  },
  nhieVoteText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },

  // Trivia
  triviaArena: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  triviaCard: {
    width: '90%',
    backgroundColor: 'rgba(55, 10, 75, 0.85)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF2A6D',
  },
  triviaCardTag: {
    fontSize: 11,
    color: '#FF6584',
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
  },
  triviaQuestion: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
  },
  triviaAnswersRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  triviaBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  triviaBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});

export default SpicyGamesLounge;
