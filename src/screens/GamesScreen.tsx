import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
  Platform,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AppColors from '../theme/AppColors';
import GameTile from '../components/GameTile';
import GoalCard from '../components/GoalCard';
import StorageService, { CoupleGoal } from '../services/StorageService';

type GamesViewMode = 'hub' | 'mini_games' | 'spicy_games';

export const GamesScreen: React.FC = () => {
  const [viewMode, setViewMode] = useState<GamesViewMode>('hub');
  const [goals, setGoals] = useState<CoupleGoal[]>([]);
  const [activeGameModal, setActiveGameModal] = useState<string | null>(null);

  // Tic-Tac-Toe State
  const [tttBoard, setTttBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [tttTurn, setTttTurn] = useState<'❤️' | '⭐'>('❤️');
  const [tttWinner, setTttWinner] = useState<string | null>(null);

  // Daily Quiz State
  const [quizIndex, setQuizIndex] = useState(0);
  const [userQuizAnswer, setUserQuizAnswer] = useState<number | null>(null);
  const [revealedQuiz, setRevealedQuiz] = useState(false);

  // Spicy Wheel State
  const [selectedWheelTier, setSelectedWheelTier] = useState<'mild' | 'warm' | 'spicy'>('warm');
  const [wheelResult, setWheelResult] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;

  // Truth or Dare State
  const [todType, setTodType] = useState<'truth' | 'dare'>('truth');
  const [todIndex, setTodIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);

  // Fantasy Dice State
  const [diceAction, setDiceAction] = useState('Slow, passionate kiss 💋');
  const [diceLocation, setDiceLocation] = useState('Under candlelight 🕯️');
  const [isRollingDice, setIsRollingDice] = useState(false);

  // Never Have I Ever State
  const [nhieIndex, setNhieIndex] = useState(0);
  const [nhieReaction, setNhieReaction] = useState<string | null>(null);

  // Sensory Touch State
  const [sensoryIndex, setSensoryIndex] = useState(0);

  // New Goal Modal State
  const [isNewGoalModal, setIsNewGoalModal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState('Romantic');
  const [newGoalTotal, setNewGoalTotal] = useState('3');
  const [partnerName, setPartnerName] = useState('Partner');

  const loadData = async () => {
    const prof = await StorageService.getProfile();
    if (prof?.partnerName) setPartnerName(prof.partnerName);
    const data = await StorageService.getGoals();
    setGoals(data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleGoal = async (id: string) => {
    const updated = goals.map((g) => {
      if (g.id === id) {
        const nextCompleted = !g.completed;
        return {
          ...g,
          completed: nextCompleted,
          progress: nextCompleted ? g.total : 0,
        };
      }
      return g;
    });
    setGoals(updated);
    await StorageService.saveGoals(updated);
  };

  const handleIncrementGoal = async (id: string) => {
    const updated = goals.map((g) => {
      if (g.id === id && g.progress < g.total) {
        const nextProg = g.progress + 1;
        return {
          ...g,
          progress: nextProg,
          completed: nextProg >= g.total,
        };
      }
      return g;
    });
    setGoals(updated);
    await StorageService.saveGoals(updated);
  };

  const handleAddGoal = async () => {
    if (!newGoalTitle.trim()) return;
    const newG: CoupleGoal = {
      id: `goal-${Date.now()}`,
      title: newGoalTitle.trim(),
      category: newGoalCategory,
      completed: false,
      progress: 0,
      total: Math.max(1, parseInt(newGoalTotal, 10) || 1),
      color: AppColors.primary,
    };
    const updated = [...goals, newG];
    setGoals(updated);
    await StorageService.saveGoals(updated);
    setNewGoalTitle('');
    setIsNewGoalModal(false);
  };

  // ------------------ TIC TAC TOE LOGIC ------------------
  const checkTttWinner = (board: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    if (board.every((cell) => cell !== null)) return 'Draw';
    return null;
  };

  const handleTttCellPress = (index: number) => {
    if (tttBoard[index] || tttWinner) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const next = [...tttBoard];
    next[index] = tttTurn;
    const winner = checkTttWinner(next);
    setTttBoard(next);

    if (winner) {
      setTttWinner(winner);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    } else {
      const nextTurn = tttTurn === '❤️' ? '⭐' : '❤️';
      setTttTurn(nextTurn);

      // Automated playful partner move if playing as ❤️
      if (nextTurn === '⭐') {
        setTimeout(() => {
          const emptyIndices = next
            .map((val, idx) => (val === null ? idx : null))
            .filter((v): v is number => v !== null);

          if (emptyIndices.length > 0) {
            const randomIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
            const autoBoard = [...next];
            autoBoard[randomIdx] = '⭐';
            const autoWinner = checkTttWinner(autoBoard);
            setTttBoard(autoBoard);
            if (autoWinner) {
              setTttWinner(autoWinner);
            } else {
              setTttTurn('❤️');
            }
          }
        }, 500);
      }
    }
  };

  const resetTtt = () => {
    setTttBoard(Array(9).fill(null));
    setTttTurn('❤️');
    setTttWinner(null);
  };

  // ------------------ DAILY QUIZ DATA ------------------
  const QUIZ_QUESTIONS = [
    {
      q: 'Who takes longer to get dressed before a date?',
      options: ['Definitely Me 👗', 'My Partner 👔', 'Both equally slow ⏳'],
      partnerAnswer: 1,
    },
    {
      q: 'What is our ultimate dream vacation?',
      options: ['Secluded tropical beach bungalow 🏝️', 'Cozy mountain cabin & hot cocoa 🏔️', 'European historic city walk 🏰'],
      partnerAnswer: 0,
    },
    {
      q: 'What was the first meal we had together?',
      options: ['Sushi & ramen 🍜', 'Late night pizza & soda 🍕', 'Artisanal burgers & shakes 🍔'],
      partnerAnswer: 1,
    },
  ];

  const handleSelectQuizOption = (optIdx: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setUserQuizAnswer(optIdx);
    setRevealedQuiz(true);
  };

  const handleNextQuiz = () => {
    setQuizIndex((prev) => (prev + 1) % QUIZ_QUESTIONS.length);
    setUserQuizAnswer(null);
    setRevealedQuiz(false);
  };

  // ------------------ SPICY WHEEL PROMPTS ------------------
  const WHEEL_PROMPTS = {
    mild: [
      'Give each other a 3-minute relaxing shoulder massage 💆',
      'Share your favorite memory of us from this past month 🌸',
      'Whisper 3 things you love about each other 💖',
      'Recreate our first hug for 30 full seconds 🤗',
    ],
    warm: [
      'Slow dance in the living room to our song 🎶',
      'Kiss each other for 60 seconds with no talking 💋',
      'Describe what made you fall in love with me ✨',
      'Feed each other a sweet strawberry or dessert 🍓',
    ],
    spicy: [
      'Blindfold kiss test: guess where the kiss lands 🔥',
      'Share a secret romantic fantasy you have never spoken aloud 🌶️',
      'Whisper the naughtiest compliment in partner’s ear 🫦',
      'Give a slow, lingering kiss on the neck and jawline 💋',
    ],
  };

  const spinTheWheel = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setWheelResult(null);

    spinValue.setValue(0);
    const randomRotations = 4 + Math.random() * 3;

    Animated.timing(spinValue, {
      toValue: randomRotations,
      duration: 2500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setIsSpinning(false);
      const list = WHEEL_PROMPTS[selectedWheelTier];
      const prompt = list[Math.floor(Math.random() * list.length)];
      setWheelResult(prompt);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    });
  };

  const spinInterpolation = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // ------------------ TRUTH OR DARE DATA ------------------
  const TOD_DATA = {
    truth: [
      'What was the exact moment you realized you loved me?',
      'What is one cute habit of mine that melts your heart?',
      'If we could run away anywhere tomorrow, where would we go?',
      'What is your favorite outfit that I wear?',
    ],
    dare: [
      'Give me a passionate kiss right now for 20 seconds!',
      'Take a silly selfie together and make it our couple wallpaper.',
      'Call out 5 things you find irresistibly attractive about me.',
      'Give me an affectionate forehead and nose kiss.',
    ],
  };

  // ------------------ FANTASY DICE DATA ------------------
  const DICE_ACTIONS = [
    'Slow, passionate kiss 💋',
    'Gentle neck & shoulder massage 💆',
    'Whisper your deepest fantasy 🫦',
    'Playful body tickle & caress ✨',
    'Nibble partner\'s earlobe softly 👂',
    'Trace lips with fingertip 💖',
  ];

  const DICE_LOCATIONS = [
    'Under soft candlelight 🕯️',
    'With eyes completely closed 🙈',
    'On the living room rug 🛋️',
    'To our favorite slow track 🎶',
    'For 60 uninterrupted seconds ⏳',
    'Tucked under warm blankets 🛏️',
  ];

  const rollFantasyDice = () => {
    if (isRollingDice) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setIsRollingDice(true);
    setTimeout(() => {
      const randomAct = DICE_ACTIONS[Math.floor(Math.random() * DICE_ACTIONS.length)];
      const randomLoc = DICE_LOCATIONS[Math.floor(Math.random() * DICE_LOCATIONS.length)];
      setDiceAction(randomAct);
      setDiceLocation(randomLoc);
      setIsRollingDice(false);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }, 700);
  };

  // ------------------ NEVER HAVE I EVER DATA ------------------
  const NHIE_PROMPTS = [
    'Never have I ever had a spicy dream about you that made me blush waking up.',
    'Never have I ever pretended to be asleep just so you would cuddle me closer.',
    'Never have I ever wanted to steal a passionate kiss in a busy elevator.',
    'Never have I ever stared at your lips while you were talking about your day.',
    'Never have I ever sent a message that made my heart race before hitting send.',
    'Never have I ever secretly planned our future wedding in my head.',
  ];

  // ------------------ SENSORY TOUCH DATA ------------------
  const SENSORY_CHALLENGES = [
    {
      title: 'The Blindfold Guess',
      prompt: 'Partner closes their eyes. Touch 3 different places (jaw, wrist, shoulder) with fingertips. They must guess each exact spot!',
    },
    {
      title: 'Butterfly Whispers',
      prompt: 'Flutter your eyelashes softly against partner\'s cheek (butterfly kiss) while whispering what you adore most about them.',
    },
    {
      title: 'Secret Word on Skin',
      prompt: 'Slowly trace a secret 4-letter love word onto partner\'s back with your index finger. Can they decipher it in 3 tries?',
    },
    {
      title: 'Temperature Contrast',
      prompt: 'Place your warm hands on partner\'s cool cheeks, then softly kiss the bridge of their nose.',
    },
  ];

  return (
    <LinearGradient colors={['#FCE8EC', '#FFF7F8']} style={styles.gradientContainer}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        {viewMode === 'hub' ? (
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.screenTitle}>Games & Play Zone</Text>
              <Text style={styles.subtitle}>Fun couple mini-games & shared goals</Text>
            </View>
            <View style={styles.headerHeart}>
              <Ionicons name="game-controller" size={20} color={AppColors.primary} />
            </View>
          </View>
        ) : (
          <View style={styles.headerWithBack}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setViewMode('hub');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color={AppColors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.headerTitleGroup}>
              <Text style={styles.screenTitle}>
                {viewMode === 'mini_games' ? 'Mini Games 🎮' : 'Spicy Games 🔥'}
              </Text>
              <Text style={styles.subtitle}>
                {viewMode === 'mini_games'
                  ? 'Choose a game to play live with your partner'
                  : '4 intimate & romantic couple games'}
              </Text>
            </View>

            <View
              style={[
                styles.countBadge,
                viewMode === 'spicy_games' && { backgroundColor: '#FFE8EC' },
              ]}
            >
              <Text
                style={[
                  styles.countBadgeText,
                  viewMode === 'spicy_games' && { color: AppColors.primary },
                ]}
              >
                {viewMode === 'mini_games' ? '2 Games' : '4 Games'}
              </Text>
            </View>
          </View>
        )}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* ======================================================== */}
          {/* VIEW MODE 1: GAME HUB (TWO ENCIRCLED CATEGORY BOXES)     */}
          {/* ======================================================== */}
          {viewMode === 'hub' && (
            <>
              <View style={styles.hubContainer}>
                {/* ENCIRCLED BOX 1: MINI GAMES */}
                <TouchableOpacity
                  style={styles.encircledCategoryBox}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                    setViewMode('mini_games');
                  }}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={['#FFFFFF', '#F6F1FF']}
                    style={styles.categoryCardGradient}
                  >
                    <View style={styles.categoryCardTopRow}>
                      <View style={[styles.categoryIconCircle, { backgroundColor: '#F0E8FF' }]}>
                        <Text style={styles.categoryEmoji}>🎮</Text>
                      </View>
                      <View style={styles.categoryBadgePill}>
                        <Text style={styles.categoryBadgeText}>2 Games Inside</Text>
                      </View>
                    </View>

                    <Text style={styles.categoryCardTitle}>Mini Games</Text>
                    <Text style={styles.categoryCardSubtitle}>
                      Fun, casual & competitive games for partners to play together
                    </Text>

                    {/* Preview Chips */}
                    <View style={styles.categoryChipsRow}>
                      <View style={styles.categoryChip}>
                        <Text style={styles.chipText}>❤️ Tic-Tac-Toe</Text>
                      </View>
                      <View style={styles.categoryChip}>
                        <Text style={styles.chipText}>🃏 Truth or Dare</Text>
                      </View>
                      <View style={styles.categoryChip}>
                        <Text style={styles.chipText}>💌 Couple Quiz</Text>
                      </View>
                    </View>

                    {/* Redirect Action Footer */}
                    <View style={styles.categoryFooter}>
                      <Text style={styles.categoryFooterText}>Open Mini Games</Text>
                      <View style={styles.arrowCircle}>
                        <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                {/* ENCIRCLED BOX 2: SPICY GAMES */}
                <TouchableOpacity
                  style={[styles.encircledCategoryBox, styles.spicyBoxGlow]}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    } catch {}
                    setViewMode('spicy_games');
                  }}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={['#FFFFFF', '#FFF0F3']}
                    style={styles.categoryCardGradient}
                  >
                    <View style={styles.categoryCardTopRow}>
                      <View style={[styles.categoryIconCircle, { backgroundColor: '#FFE8EC' }]}>
                        <Text style={styles.categoryEmoji}>🔥</Text>
                      </View>
                      <View style={[styles.categoryBadgePill, styles.spicyBadgePill]}>
                        <Text style={styles.spicyBadgeText}>Hot & Intimate • 4 Games</Text>
                      </View>
                    </View>

                    <Text style={styles.categoryCardTitle}>Spicy Games</Text>
                    <Text style={styles.categoryCardSubtitle}>
                      Seductive, daring & romantic games to spark deep connection and thrill
                    </Text>

                    {/* Preview Chips */}
                    <View style={styles.categoryChipsRow}>
                      <View style={styles.spicyChip}>
                        <Text style={styles.spicyChipText}>🎡 Spicy Wheel</Text>
                      </View>
                      <View style={styles.spicyChip}>
                        <Text style={styles.spicyChipText}>🎲 Fantasy Dice</Text>
                      </View>
                      <View style={styles.spicyChip}>
                        <Text style={styles.spicyChipText}>🙈 Never Have I</Text>
                      </View>
                      <View style={styles.spicyChip}>
                        <Text style={styles.spicyChipText}>💋 Sensory Touch</Text>
                      </View>
                    </View>

                    {/* Redirect Action Footer */}
                    <View style={styles.categoryFooter}>
                      <Text style={[styles.categoryFooterText, { color: AppColors.primary }]}>
                        Explore Spicy Games
                      </Text>
                      <View style={[styles.arrowCircle, { backgroundColor: AppColors.primary }]}>
                        <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Couple Goals & Bucket List (ONLY SHOWN IN MAIN HUB VIEW!) */}
              <View style={styles.goalsHeaderRow}>
                <View>
                  <Text style={styles.goalsTitle}>Couple Goals & Bucket List</Text>
                  <Text style={styles.goalsSubtitle}>Things we want to do together</Text>
                </View>
                <TouchableOpacity
                  style={styles.addGoalBtn}
                  onPress={() => setIsNewGoalModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.addGoalBtnText}>Add Goal</Text>
                </TouchableOpacity>
              </View>

              {/* Goals List / Clean Real Record Empty State */}
              {goals.length === 0 ? (
                <View style={styles.emptyGoalsCard}>
                  <View style={styles.emptyGoalsIconCircle}>
                    <Ionicons name="sparkles" size={24} color={AppColors.primary} />
                  </View>
                  <Text style={styles.emptyGoalsTitle}>No Goals Added Yet</Text>
                  <Text style={styles.emptyGoalsSubtitle}>
                    Create your first couple bucket list item together!
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyGoalsBtn}
                    onPress={() => setIsNewGoalModal(true)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.emptyGoalsBtnText}>Create Couple Goal</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                goals.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    onToggle={handleToggleGoal}
                    onIncrement={handleIncrementGoal}
                  />
                ))
              )}
            </>
          )}

          {/* ======================================================== */}
          {/* VIEW MODE 2: MINI GAMES REDIRECTED DEDICATED LAYOUT       */}
          {/* ======================================================== */}
          {viewMode === 'mini_games' && (
            <View style={styles.subSectionContainer}>
              {/* 2 Main Games Grid (Tic-Tac-Toe and Truth or Dare) */}
              <View style={styles.gridRow}>
                <GameTile
                  title="Live Tic-Tac-Toe"
                  tagline="Hearts vs Stars real-time board"
                  emoji="❤️"
                  bgColor="#F4EFFF"
                  badgeText="Live"
                  onPress={() => setActiveGameModal('ttt')}
                />
                <GameTile
                  title="Truth or Dare"
                  tagline="Romantic & spicy flip-cards"
                  emoji="🃏"
                  bgColor="#EBF8F2"
                  badgeText="Cards"
                  onPress={() => setActiveGameModal('tod')}
                />
              </View>

              {/* Bonus Daily Quiz Tile */}
              <View style={styles.gridRow}>
                <GameTile
                  title="Daily Couple Quiz"
                  tagline="Answer together & reveal matches"
                  emoji="💌"
                  bgColor="#FFF2F4"
                  badgeText="Daily"
                  onPress={() => setActiveGameModal('quiz')}
                />
              </View>
            </View>
          )}

          {/* ======================================================== */}
          {/* VIEW MODE 3: SPICY GAMES REDIRECTED DEDICATED LAYOUT      */}
          {/* ======================================================== */}
          {viewMode === 'spicy_games' && (
            <View style={styles.subSectionContainer}>
              {/* 4 Spicy Games Grid */}
              <View style={styles.gridRow}>
                <GameTile
                  title="Spicy Wheel"
                  tagline="Spin for fun romance prompts"
                  emoji="🎡"
                  bgColor="#FFF7E6"
                  badgeText="Spin"
                  onPress={() => setActiveGameModal('wheel')}
                />
                <GameTile
                  title="Fantasy Dice"
                  tagline="Roll action & secret location"
                  emoji="🎲"
                  bgColor="#FFF0F3"
                  badgeText="Roll"
                  onPress={() => setActiveGameModal('dice')}
                />
              </View>

              <View style={styles.gridRow}>
                <GameTile
                  title="Never Have I Ever"
                  tagline="Spicy secrets & confessions"
                  emoji="🙈"
                  bgColor="#F6F0FF"
                  badgeText="Cards"
                  onPress={() => setActiveGameModal('nhie')}
                />
                <GameTile
                  title="Sensory Touch"
                  tagline="Blindfold touch & guess game"
                  emoji="💋"
                  bgColor="#EAF7F3"
                  badgeText="Intimate"
                  onPress={() => setActiveGameModal('sensory')}
                />
              </View>
            </View>
          )}

          {/* Generous bottom spacing so nothing gets cut off by floating bar */}
          <View style={{ height: 150 }} />
        </ScrollView>

        {/* ----------------- MODAL 1: DAILY QUIZ ----------------- */}
        <Modal visible={activeGameModal === 'quiz'} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.gameModalCard}>
              <View style={styles.modalTopRow}>
                <Text style={styles.gameModalTitle}>Daily Couple Quiz 💌</Text>
                <TouchableOpacity onPress={() => setActiveGameModal(null)}>
                  <Ionicons name="close" size={22} color={AppColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.quizQuestionNumber}>
                Question {quizIndex + 1} of {QUIZ_QUESTIONS.length}
              </Text>
              <Text style={styles.quizQuestionText}>
                {QUIZ_QUESTIONS[quizIndex].q}
              </Text>

              <View style={styles.quizOptionsList}>
                {QUIZ_QUESTIONS[quizIndex].options.map((opt, optIdx) => {
                  const isUserChoice = userQuizAnswer === optIdx;
                  const isPartnerChoice = QUIZ_QUESTIONS[quizIndex].partnerAnswer === optIdx;
                  return (
                    <TouchableOpacity
                      key={optIdx}
                      style={[
                        styles.quizOptionBtn,
                        isUserChoice && styles.quizOptionSelected,
                        revealedQuiz && isPartnerChoice && styles.quizOptionPartnerMatch,
                      ]}
                      onPress={() => handleSelectQuizOption(optIdx)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.quizOptionText, isUserChoice && styles.quizOptionTextActive]}>
                        {opt}
                      </Text>
                      {revealedQuiz && isPartnerChoice && (
                        <View style={styles.partnerMatchBadge}>
                          <Text style={styles.partnerMatchBadgeText}>{partnerName}'s Pick ✨</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {revealedQuiz && (
                <View style={styles.revealBanner}>
                  <Text style={styles.revealBannerTitle}>
                    {userQuizAnswer === QUIZ_QUESTIONS[quizIndex].partnerAnswer
                      ? '🎉 Perfect Match! You both chose the same!'
                      : '💕 Sweet! See how your partner answered!'}
                  </Text>
                  <TouchableOpacity style={styles.nextQuizBtn} onPress={handleNextQuiz}>
                    <Text style={styles.nextQuizBtnText}>Next Question &gt;</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* ----------------- MODAL 2: TIC-TAC-TOE ----------------- */}
        <Modal visible={activeGameModal === 'ttt'} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.gameModalCard}>
              <View style={styles.modalTopRow}>
                <Text style={styles.gameModalTitle}>Live Tic-Tac-Toe</Text>
                <TouchableOpacity onPress={() => setActiveGameModal(null)}>
                  <Ionicons name="close" size={22} color={AppColors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Turn indicator */}
              <View style={styles.tttStatusRow}>
                {tttWinner ? (
                  <Text style={styles.tttWinnerText}>
                    {tttWinner === 'Draw' ? "It's a Tie! 💕" : `Winner: ${tttWinner} Wins! 🎉`}
                  </Text>
                ) : (
                  <Text style={styles.tttTurnText}>
                    Turn: <Text style={{ color: AppColors.primary }}>{tttTurn === '❤️' ? 'Your Turn (❤️)' : 'Partner Turn (⭐)'}</Text>
                  </Text>
                )}
              </View>

              {/* 3x3 Grid */}
              <View style={styles.tttGrid}>
                {tttBoard.map((val, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.tttCell}
                    onPress={() => handleTttCellPress(idx)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.tttCellText}>{val || ''}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.resetTttBtn} onPress={resetTtt}>
                <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.resetTttBtnText}>Play Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ----------------- MODAL 3: SPICY WHEEL ----------------- */}
        <Modal visible={activeGameModal === 'wheel'} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.gameModalCard}>
              <View style={styles.modalTopRow}>
                <Text style={styles.gameModalTitle}>Spicy Romantic Wheel 🎡</Text>
                <TouchableOpacity onPress={() => setActiveGameModal(null)}>
                  <Ionicons name="close" size={22} color={AppColors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Tier selector */}
              <View style={styles.wheelTierRow}>
                {(['mild', 'warm', 'spicy'] as const).map((tier) => (
                  <TouchableOpacity
                    key={tier}
                    style={[styles.tierBtn, selectedWheelTier === tier && styles.tierBtnActive]}
                    onPress={() => setSelectedWheelTier(tier)}
                  >
                    <Text style={[styles.tierBtnText, selectedWheelTier === tier && styles.tierBtnTextActive]}>
                      {tier === 'mild' ? 'Mild 🌸' : tier === 'warm' ? 'Warm 🔥' : 'Spicy 🌶️'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Animated Spinner Wheel Circle */}
              <View style={styles.wheelContainer}>
                <Animated.View
                  style={[
                    styles.wheelDisc,
                    { transform: [{ rotate: spinInterpolation }] },
                  ]}
                >
                  <View style={styles.wheelSlice1} />
                  <View style={styles.wheelSlice2} />
                  <View style={styles.wheelCenterPin}>
                    <Text style={{ fontSize: 24 }}>💖</Text>
                  </View>
                </Animated.View>
                <View style={styles.wheelPointer} />
              </View>

              {/* Spin Button */}
              <TouchableOpacity
                style={[styles.spinBtn, isSpinning && styles.spinBtnDisabled]}
                onPress={spinTheWheel}
                disabled={isSpinning}
              >
                <Text style={styles.spinBtnText}>
                  {isSpinning ? 'Spinning...' : 'Spin The Wheel! ✨'}
                </Text>
              </TouchableOpacity>

              {/* Result Prompt */}
              {wheelResult && (
                <View style={styles.wheelResultBox}>
                  <Text style={styles.wheelResultTitle}>Tonight's Dare:</Text>
                  <Text style={styles.wheelResultContent}>{wheelResult}</Text>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* ----------------- MODAL 4: TRUTH OR DARE ----------------- */}
        <Modal visible={activeGameModal === 'tod'} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.gameModalCard}>
              <View style={styles.modalTopRow}>
                <Text style={styles.gameModalTitle}>Truth or Dare Deck 🃏</Text>
                <TouchableOpacity onPress={() => setActiveGameModal(null)}>
                  <Ionicons name="close" size={22} color={AppColors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Truth vs Dare Tab */}
              <View style={styles.wheelTierRow}>
                <TouchableOpacity
                  style={[styles.tierBtn, todType === 'truth' && styles.tierBtnActive]}
                  onPress={() => {
                    setTodType('truth');
                    setCardFlipped(false);
                  }}
                >
                  <Text style={[styles.tierBtnText, todType === 'truth' && styles.tierBtnTextActive]}>
                    Truth 💭
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tierBtn, todType === 'dare' && styles.tierBtnActive]}
                  onPress={() => {
                    setTodType('dare');
                    setCardFlipped(false);
                  }}
                >
                  <Text style={[styles.tierBtnText, todType === 'dare' && styles.tierBtnTextActive]}>
                    Dare 🌶️
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Flip Card */}
              <TouchableOpacity
                style={[styles.flipCard, cardFlipped && styles.flipCardFlipped]}
                onPress={() => setCardFlipped(!cardFlipped)}
                activeOpacity={0.9}
              >
                {!cardFlipped ? (
                  <View style={styles.cardFront}>
                    <Text style={styles.cardDeckEmoji}>{todType === 'truth' ? '💭' : '🌶️'}</Text>
                    <Text style={styles.tapToRevealText}>Tap to reveal {todType.toUpperCase()}</Text>
                  </View>
                ) : (
                  <View style={styles.cardBack}>
                    <Text style={styles.cardBackPrompt}>
                      {TOD_DATA[todType][todIndex % TOD_DATA[todType].length]}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.spinBtn}
                onPress={() => {
                  setTodIndex((i) => i + 1);
                  setCardFlipped(false);
                }}
              >
                <Text style={styles.spinBtnText}>Draw Next Card &gt;</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ----------------- MODAL 5: FANTASY DICE ----------------- */}
        <Modal visible={activeGameModal === 'dice'} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.gameModalCard}>
              <View style={styles.modalTopRow}>
                <Text style={styles.gameModalTitle}>Fantasy Romance Dice 🎲</Text>
                <TouchableOpacity onPress={() => setActiveGameModal(null)}>
                  <Ionicons name="close" size={22} color={AppColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.diceIntroText}>
                Roll the romantic action and location pair for tonight:
              </Text>

              <View style={styles.dicePairRow}>
                <View style={styles.diceBox}>
                  <Text style={styles.diceHeaderLabel}>ACTION</Text>
                  <Text style={styles.diceEmoji}>💋</Text>
                  <Text style={styles.diceValueText}>{diceAction}</Text>
                </View>
                <View style={styles.diceBox}>
                  <Text style={styles.diceHeaderLabel}>SETTING</Text>
                  <Text style={styles.diceEmoji}>🕯️</Text>
                  <Text style={styles.diceValueText}>{diceLocation}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.spinBtn, isRollingDice && styles.spinBtnDisabled]}
                onPress={rollFantasyDice}
                disabled={isRollingDice}
              >
                <Text style={styles.spinBtnText}>
                  {isRollingDice ? 'Rolling Dice... 🎲' : 'Roll Romantic Pair! ✨'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ----------------- MODAL 6: NEVER HAVE I EVER ----------------- */}
        <Modal visible={activeGameModal === 'nhie'} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.gameModalCard}>
              <View style={styles.modalTopRow}>
                <Text style={styles.gameModalTitle}>Never Have I Ever 🙈</Text>
                <TouchableOpacity onPress={() => setActiveGameModal(null)}>
                  <Ionicons name="close" size={22} color={AppColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.nhieCardPrompt}>
                {NHIE_PROMPTS[nhieIndex % NHIE_PROMPTS.length]}
              </Text>

              <View style={styles.nhieActionsRow}>
                <TouchableOpacity
                  style={[styles.nhieChoiceBtn, { backgroundColor: '#FFE8EC' }]}
                  onPress={() => {
                    setNhieReaction(`You said: I Have! 🙈 ${partnerName} owes you a sweet confession!`);
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    } catch {}
                  }}
                >
                  <Text style={styles.nhieChoiceEmoji}>🙈</Text>
                  <Text style={styles.nhieChoiceText}>I Have</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.nhieChoiceBtn, { backgroundColor: '#EBF8F2' }]}
                  onPress={() => {
                    setNhieReaction('You said: Never! 😇 Innocent angel!');
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                  }}
                >
                  <Text style={styles.nhieChoiceEmoji}>😇</Text>
                  <Text style={styles.nhieChoiceText}>Never</Text>
                </TouchableOpacity>
              </View>

              {nhieReaction && (
                <View style={styles.nhieReactionBox}>
                  <Text style={styles.nhieReactionText}>{nhieReaction}</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.spinBtn}
                onPress={() => {
                  setNhieIndex((i) => i + 1);
                  setNhieReaction(null);
                }}
              >
                <Text style={styles.spinBtnText}>Next Question &gt;</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ----------------- MODAL 7: SENSORY TOUCH CHALLENGE ----------------- */}
        <Modal visible={activeGameModal === 'sensory'} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.gameModalCard}>
              <View style={styles.modalTopRow}>
                <Text style={styles.gameModalTitle}>Sensory Touch Challenge 💋</Text>
                <TouchableOpacity onPress={() => setActiveGameModal(null)}>
                  <Ionicons name="close" size={22} color={AppColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.sensoryCard}>
                <Text style={styles.sensoryCardTitle}>
                  {SENSORY_CHALLENGES[sensoryIndex % SENSORY_CHALLENGES.length].title}
                </Text>
                <Text style={styles.sensoryCardBody}>
                  {SENSORY_CHALLENGES[sensoryIndex % SENSORY_CHALLENGES.length].prompt}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.spinBtn}
                onPress={() => setSensoryIndex((i) => i + 1)}
              >
                <Text style={styles.spinBtnText}>Next Intimate Challenge &gt;</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ----------------- MODAL 8: ADD NEW GOAL ----------------- */}
        <Modal visible={isNewGoalModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.gameModalCard}>
              <View style={styles.modalTopRow}>
                <Text style={styles.gameModalTitle}>New Couple Goal</Text>
                <TouchableOpacity onPress={() => setIsNewGoalModal(false)}>
                  <Ionicons name="close" size={22} color={AppColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Goal Description</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="e.g. Stargazing at the beach"
                placeholderTextColor="#C4B4BA"
                value={newGoalTitle}
                onChangeText={setNewGoalTitle}
              />

              <Text style={styles.inputLabel}>Category</Text>
              <TextInput
                style={styles.modalTextInput}
                value={newGoalCategory}
                onChangeText={setNewGoalCategory}
              />

              <Text style={styles.inputLabel}>Number of Steps / Dates</Text>
              <TextInput
                style={styles.modalTextInput}
                value={newGoalTotal}
                onChangeText={setNewGoalTotal}
                keyboardType="numeric"
              />

              <TouchableOpacity style={styles.spinBtn} onPress={handleAddGoal}>
                <Text style={styles.spinBtnText}>Save Couple Goal ✨</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 32 : 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: AppColors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  headerHeart: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  headerWithBack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    marginRight: 12,
  },
  headerTitleGroup: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  hubContainer: {
    paddingHorizontal: 16,
    marginVertical: 8,
    gap: 16,
  },
  encircledCategoryBox: {
    borderRadius: 28,
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  spicyBoxGlow: {
    borderColor: '#FFDCE2',
    shadowColor: '#FF6575',
    shadowOpacity: 0.22,
  },
  categoryCardGradient: {
    padding: 20,
    borderRadius: 26,
  },
  categoryCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoryIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryEmoji: {
    fontSize: 26,
  },
  categoryBadgePill: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8DCE8',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8F78D2',
    textTransform: 'uppercase',
  },
  spicyBadgePill: {
    backgroundColor: '#FFF0F3',
    borderColor: '#FFCCD5',
  },
  spicyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: AppColors.primary,
    textTransform: 'uppercase',
  },
  categoryCardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  categoryCardSubtitle: {
    fontSize: 13,
    color: AppColors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  categoryChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECE3F4',
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  spicyChip: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD4DC',
  },
  spicyChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  categoryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(230, 210, 220, 0.4)',
  },
  categoryFooterText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#7A62B8',
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8F78D2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subSectionContainer: {
    paddingHorizontal: 12,
    marginVertical: 4,
  },
  backToHubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginHorizontal: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FFE8EC',
    gap: 6,
  },
  backToHubText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: AppColors.primary,
  },
  subSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: AppColors.textPrimary,
  },
  subSectionSubtitle: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: '#F0E8FF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8F78D2',
  },
  gridRow: {
    flexDirection: 'row',
  },
  goalsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  goalsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: AppColors.textPrimary,
  },
  goalsSubtitle: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  addGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 4,
  },
  addGoalBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(45, 36, 43, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  gameModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gameModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: AppColors.textPrimary,
  },
  quizQuestionNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.primary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  quizQuestionText: {
    fontSize: 17,
    fontWeight: '700',
    color: AppColors.textPrimary,
    lineHeight: 24,
    marginBottom: 16,
  },
  quizOptionsList: {
    gap: 10,
  },
  quizOptionBtn: {
    backgroundColor: '#FFF7F8',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#F8DCE2',
    position: 'relative',
  },
  quizOptionSelected: {
    borderColor: AppColors.primary,
    backgroundColor: '#FFE8EC',
  },
  quizOptionPartnerMatch: {
    borderColor: AppColors.mintDark,
  },
  quizOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  quizOptionTextActive: {
    color: AppColors.primary,
    fontWeight: '700',
  },
  partnerMatchBadge: {
    position: 'absolute',
    top: 6,
    right: 10,
    backgroundColor: AppColors.mintGreen,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  partnerMatchBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: AppColors.mintDark,
  },
  revealBanner: {
    marginTop: 18,
    backgroundColor: '#FFF2F4',
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  revealBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  nextQuizBtn: {
    backgroundColor: AppColors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  nextQuizBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  tttStatusRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  tttTurnText: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  tttWinnerText: {
    fontSize: 17,
    fontWeight: '900',
    color: AppColors.primary,
  },
  tttGrid: {
    width: 240,
    height: 240,
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  tttCell: {
    width: 74,
    height: 74,
    backgroundColor: '#FFF7F8',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F8DCE2',
  },
  tttCellText: {
    fontSize: 28,
  },
  resetTttBtn: {
    backgroundColor: AppColors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetTttBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  wheelTierRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  tierBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#FFF7F8',
    borderWidth: 1.5,
    borderColor: '#F8DCE2',
  },
  tierBtnActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  tierBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  tierBtnTextActive: {
    color: '#FFFFFF',
  },
  wheelContainer: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 10,
  },
  wheelDisc: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#FFCCD4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  wheelSlice1: {
    position: 'absolute',
    width: '100%',
    height: '50%',
    top: 0,
    backgroundColor: '#FFE3E8',
  },
  wheelSlice2: {
    position: 'absolute',
    width: '50%',
    height: '100%',
    left: 0,
    backgroundColor: '#FFB8C4',
    opacity: 0.5,
  },
  wheelCenterPin: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  wheelPointer: {
    position: 'absolute',
    top: -4,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: AppColors.primary,
    zIndex: 10,
  },
  spinBtn: {
    backgroundColor: AppColors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
  },
  spinBtnDisabled: {
    opacity: 0.6,
  },
  spinBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  wheelResultBox: {
    backgroundColor: '#FFF5F6',
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE8EC',
  },
  wheelResultTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: AppColors.primary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  wheelResultContent: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textPrimary,
    textAlign: 'center',
    lineHeight: 20,
  },
  flipCard: {
    width: '100%',
    height: 180,
    backgroundColor: '#FFF7F8',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderWidth: 2,
    borderColor: '#F8DCE2',
    marginVertical: 12,
  },
  flipCardFlipped: {
    backgroundColor: '#FFE8EC',
    borderColor: AppColors.primary,
  },
  cardFront: {
    alignItems: 'center',
  },
  cardDeckEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  tapToRevealText: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.textSecondary,
  },
  cardBack: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBackPrompt: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.textPrimary,
    textAlign: 'center',
    lineHeight: 22,
  },
  diceIntroText: {
    fontSize: 13,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: 14,
  },
  dicePairRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  diceBox: {
    flex: 1,
    backgroundColor: '#FFF7F8',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F8DCE2',
  },
  diceHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: AppColors.primary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  diceEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  diceValueText: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.textPrimary,
    textAlign: 'center',
    lineHeight: 18,
  },
  nhieCardPrompt: {
    fontSize: 17,
    fontWeight: '700',
    color: AppColors.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
    marginVertical: 18,
    paddingHorizontal: 8,
  },
  nhieActionsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  nhieChoiceBtn: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  nhieChoiceEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  nhieChoiceText: {
    fontSize: 14,
    fontWeight: '800',
    color: AppColors.textPrimary,
  },
  nhieReactionBox: {
    backgroundColor: '#FFF2F4',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    alignItems: 'center',
  },
  nhieReactionText: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.primary,
    textAlign: 'center',
  },
  sensoryCard: {
    backgroundColor: '#FFF7F8',
    borderRadius: 20,
    padding: 20,
    marginVertical: 14,
    borderWidth: 1.5,
    borderColor: '#F8DCE2',
  },
  sensoryCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: AppColors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  sensoryCardBody: {
    fontSize: 14,
    color: AppColors.textPrimary,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.textSecondary,
    marginBottom: 4,
    marginTop: 8,
  },
  modalTextInput: {
    backgroundColor: '#FFF7F8',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: AppColors.textPrimary,
    borderWidth: 1,
    borderColor: '#F0D4DC',
  },
  emptyGoalsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    marginHorizontal: 16,
    marginVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFE8EC',
    borderStyle: 'dashed',
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyGoalsIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFE8EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyGoalsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  emptyGoalsSubtitle: {
    fontSize: 12.5,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  emptyGoalsBtn: {
    backgroundColor: AppColors.primary,
    borderRadius: 9999,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyGoalsBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

export default GamesScreen;
