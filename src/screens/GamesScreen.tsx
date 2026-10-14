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
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AppColors from '../theme/AppColors';
import AppFonts from '../theme/AppFonts';
import GameTile from '../components/GameTile';
import GoalCard from '../components/GoalCard';
import FallingHeartsBackground from '../components/FallingHeartsBackground';
import StorageService, { CoupleGoal } from '../services/StorageService';
import SpicyChiliTransition from '../components/SpicyChiliTransition';
import SpicyGamesLounge from '../components/SpicyGamesLounge';
import GameSyncService, { DuoRoomState, InGameInvite } from '../services/GameSyncService';
import FirestoreService from '../services/FirestoreService';
import RealtimeService from '../services/RealtimeService';
import * as Clipboard from 'expo-clipboard';
import {
  MINI_GAME_TRUTHS,
  MINI_GAME_DARES,
  MINI_GAME_QUIZ_QUESTIONS,
} from '../data/miniGamesData';
import { SPICY_NHIE_PROMPTS } from '../data/spicyGamesData';

type GamesViewMode = 'hub' | 'mini_games' | 'spicy_games';

export interface GamesScreenProps {
  onSpicyModeChange?: (isSpicy: boolean) => void;
}

export const GamesScreen: React.FC<GamesScreenProps> = ({ onSpicyModeChange }) => {
  const [viewMode, setViewMode] = useState<GamesViewMode>('hub');
  const [goals, setGoals] = useState<CoupleGoal[]>([]);
  const [activeGameModal, setActiveGameModal] = useState<string | null>(null);

  // Duo Room & Partner Presence State
  const [duoState, setDuoState] = useState<DuoRoomState | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isPartnerConnected, setIsPartnerConnected] = useState(true);
  const [inviteCopied, setInviteCopied] = useState(false);

  // Dedicated Game Match Room Code & In-Game Invite States
  const [gameCodeInput, setGameCodeInput] = useState('');
  const [gameJoinStatus, setGameJoinStatus] = useState<string | null>(null);
  const [pendingInvitePopup, setPendingInvitePopup] = useState<InGameInvite | null>(null);

  // Turn Shuffler State for Truth or Dare
  const [todTurn, setTodTurn] = useState<'user' | 'partner'>('user');
  const [isShufflingTurn, setIsShufflingTurn] = useState(false);

  // Custom Prompt Creation State
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customPromptInput, setCustomPromptInput] = useState('');
  const [customPromptType, setCustomPromptType] = useState<'truth' | 'dare' | 'quiz'>('truth');
  const [customTruths, setCustomTruths] = useState<string[]>([]);
  const [customDares, setCustomDares] = useState<string[]>([]);

  // Text Answer State for Truth or Dare
  const [answerInputText, setAnswerInputText] = useState('');
  const [savedAnswers, setSavedAnswers] = useState<Record<string, string>>({});
  const [showAnswerInput, setShowAnswerInput] = useState(false);

  // Duo Couple Quiz
  const [partnerQuizAnswer, setPartnerQuizAnswer] = useState<number | null>(null);

  // Tic-Tac-Toe State
  const [tttBoard, setTttBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [tttTurn, setTttTurn] = useState<'X' | 'O'>('X');
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
  const [userName, setUserName] = useState('You');
  const [isSpicyTransitionActive, setIsSpicyTransitionActive] = useState(false);

  const loadData = async () => {
    const prof = await StorageService.getProfile();
    if (prof?.partnerName) setPartnerName(prof.partnerName);
    if (prof?.userName) setUserName(prof.userName);
    const data = await StorageService.getGoals();
    setGoals(data);

    const room = await GameSyncService.getDuoRoomState();
    setDuoState(room);
    setIsPartnerConnected(room.isPartnerConnected);

    const customP = await GameSyncService.getCustomPrompts('tod');
    setCustomTruths(customP.filter((p) => p.category === 'truth').map((p) => p.prompt));
    setCustomDares(customP.filter((p) => p.category === 'dare').map((p) => p.prompt));
  };

  const handleTogglePartnerConnect = async () => {
    const next = !isPartnerConnected;
    setIsPartnerConnected(next);
    await GameSyncService.setPartnerConnected(next);
    try {
      Haptics.notificationAsync(
        next
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
    } catch {}
  };

  const handleCopyGameCode = async () => {
    const code = duoState?.gameRoomCode || 'GAME-7824';
    await Clipboard.setStringAsync(code);
    setInviteCopied(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setTimeout(() => setInviteCopied(false), 2500);
  };

  const handleGenerateNewGameCode = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    const newCode = await GameSyncService.generateNewGameCode();
    setDuoState((prev) => (prev ? { ...prev, gameRoomCode: newCode } : prev));
    setGameJoinStatus(`Generated new game room code: ${newCode} 🎲`);
    setTimeout(() => setGameJoinStatus(null), 3000);
  };

  const handlePasteGameCode = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const pasted = await Clipboard.getStringAsync();
      if (pasted) {
        setGameCodeInput(pasted.trim().toUpperCase());
      }
    } catch {}
  };

  const handleJoinGameRoom = async () => {
    if (!gameCodeInput.trim()) {
      setGameJoinStatus('Please enter or paste a match code!');
      setTimeout(() => setGameJoinStatus(null), 2500);
      return;
    }
    const res = await GameSyncService.joinRoomByCode(gameCodeInput);
    if (res.success) {
      setIsPartnerConnected(true);
      setDuoState((prev) =>
        prev
          ? {
              ...prev,
              gameRoomCode: gameCodeInput.trim().toUpperCase(),
              isPartnerConnected: true,
            }
          : prev
      );
      setGameJoinStatus(res.message);
      setGameCodeInput('');
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    } else {
      setGameJoinStatus(res.message);
    }
    setTimeout(() => setGameJoinStatus(null), 3500);
  };

  const handleOpenGameModal = async (modalId: string) => {
    setActiveGameModal(modalId);
    const prof = await StorageService.getProfile();
    if (prof?.inviteCode) {
      await FirestoreService.syncActiveGame(prof.inviteCode, {
        gameModalId: modalId,
        hostName: userName,
        startedAt: Date.now(),
      });
      await RealtimeService.broadcastGameMove('start_game', {
        gameModalId: modalId,
        hostName: userName,
      });
    }
  };

  const handleCloseGameModal = async () => {
    setActiveGameModal(null);
    const prof = await StorageService.getProfile();
    if (prof?.inviteCode) {
      await FirestoreService.syncActiveGame(prof.inviteCode, null);
    }
  };

  const handleSendInGameInvite = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    const invite = await GameSyncService.sendInGameInvite('Duo Match Lounge');
    const prof = await StorageService.getProfile();
    if (prof?.inviteCode) {
      await FirestoreService.syncInGameInvite(prof.inviteCode, invite);
      await RealtimeService.broadcastGameMove('invite', { invite });
    }
    // Close the invite dialog immediately so the host isn't stuck with an open popup
    setIsInviteModalOpen(false);
    setGameJoinStatus(`🎮 Match invite sent to ${partnerName}! Waiting for them to join...`);
    setTimeout(() => setGameJoinStatus(null), 4500);
  };

  const handleSimulateReceiveInvite = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    const incoming: InGameInvite = {
      id: `invite-${Date.now()}`,
      fromName: partnerName,
      toName: userName,
      gameTitle: 'Couplesify Duo Lounge',
      gameRoomCode: duoState?.gameRoomCode || 'GAME-7824',
      timestamp: Date.now(),
    };
    setPendingInvitePopup(incoming);
  };

  const handleAcceptInvite = async () => {
    if (pendingInvitePopup) {
      await GameSyncService.joinRoomByCode(pendingInvitePopup.gameRoomCode);
      setIsPartnerConnected(true);
      setDuoState((prev) =>
        prev
          ? {
              ...prev,
              gameRoomCode: pendingInvitePopup.gameRoomCode,
              isPartnerConnected: true,
            }
          : prev
      );
      const prof = await StorageService.getProfile();
      if (prof?.inviteCode) {
        await FirestoreService.syncInGameInvite(prof.inviteCode, null);
      }
      setPendingInvitePopup(null);
      setIsInviteModalOpen(false);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      setGameJoinStatus(
        `Accepted invite from ${pendingInvitePopup.fromName}! Entered room ${pendingInvitePopup.gameRoomCode} 🎮`
      );
      setTimeout(() => setGameJoinStatus(null), 3500);
    }
  };

  const handleDeclineInvite = async () => {
    setPendingInvitePopup(null);
    const prof = await StorageService.getProfile();
    if (prof?.inviteCode) {
      await FirestoreService.syncInGameInvite(prof.inviteCode, null);
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handleShuffleTurn = async () => {
    if (isShufflingTurn) return;
    setIsShufflingTurn(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    let count = 0;
    const interval = setInterval(async () => {
      setTodTurn((prev) => (prev === 'user' ? 'partner' : 'user'));
      count++;
      if (count > 6) {
        clearInterval(interval);
        const next = Math.random() > 0.5 ? 'user' : 'partner';
        setTodTurn(next);
        setIsShufflingTurn(false);
        const prof = await StorageService.getProfile();
        if (prof?.inviteCode) {
          const promptKey = `tod-${todType}-${todIndex % TOD_DATA[todType].length}`;
          await FirestoreService.syncTruthOrDare(prof.inviteCode, {
            promptKey,
            cardFlipped,
            todType,
            todIndex,
            todTurn: next,
            updatedAt: Date.now(),
          });
          await RealtimeService.broadcastGameMove('turn', { todTurn: next });
        }
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
    }, 120);
  };

  const handleSaveCustomPrompt = async () => {
    if (!customPromptInput.trim()) return;
    const text = customPromptInput.trim();
    if (customPromptType === 'truth') {
      setCustomTruths((prev) => [text, ...prev]);
      await GameSyncService.addCustomPrompt('tod', text, 'truth', 'user');
      setTodType('truth');
      setTodIndex(0);
    } else {
      setCustomDares((prev) => [text, ...prev]);
      await GameSyncService.addCustomPrompt('tod', text, 'dare', 'user');
      setTodType('dare');
      setTodIndex(0);
    }
    setCustomPromptInput('');
    setIsCustomModalOpen(false);
    setCardFlipped(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const handleSaveTextAnswer = async (promptKey: string) => {
    if (!answerInputText.trim()) return;
    const ans = answerInputText.trim();
    setSavedAnswers((prev) => ({ ...prev, [promptKey]: ans }));
    await GameSyncService.savePromptAnswer(promptKey, ans, todTurn);

    const prof = await StorageService.getProfile();
    if (prof?.inviteCode) {
      await FirestoreService.syncTruthOrDare(prof.inviteCode, {
        promptKey,
        answer: ans,
        author: todTurn === 'user' ? userName : partnerName,
        cardFlipped: true,
        todType,
        todIndex,
        todTurn,
        updatedAt: Date.now(),
      });
      await RealtimeService.broadcastGameMove('tod_answer', {
        promptKey,
        answer: ans,
        author: todTurn === 'user' ? userName : partnerName,
      });
    }

    setAnswerInputText('');
    setShowAnswerInput(false);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  useEffect(() => {
    let unsubInvite: (() => void) | undefined;
    let unsubGame: (() => void) | undefined;
    let unsubTod: (() => void) | undefined;

    loadData().then(async () => {
      const prof = await StorageService.getProfile();
      if (prof?.inviteCode) {
        RealtimeService.setPairingCode(prof.inviteCode);

        // 1. Subscribe to In-Game Match Invites
        unsubInvite = FirestoreService.subscribeToInGameInvite(prof.inviteCode, (invite) => {
          if (invite && invite.fromName && invite.fromName !== userName) {
            setPendingInvitePopup(invite);
            setIsPartnerConnected(true);
          } else if (!invite) {
            setPendingInvitePopup(null);
          }
        });

        // 2. Subscribe to Host Active Game Session (Auto-starts game for partner!)
        unsubGame = FirestoreService.subscribeToActiveGame(prof.inviteCode, (gameSession) => {
          if (gameSession && gameSession.gameModalId) {
            if (gameSession.hostName !== userName) {
              setActiveGameModal(gameSession.gameModalId);
            }
          } else if (gameSession === null) {
            setActiveGameModal(null);
          }
        });

        // 3. Subscribe to Live Truth or Dare Turns & Answers
        unsubTod = FirestoreService.subscribeToTruthOrDare(prof.inviteCode, (todState) => {
          if (todState) {
            if (todState.promptKey && todState.answer) {
              setSavedAnswers((prev) => ({ ...prev, [todState.promptKey]: todState.answer }));
            }
            if (todState.cardFlipped !== undefined) {
              setCardFlipped(todState.cardFlipped);
            }
            if (todState.todType) {
              setTodType(todState.todType);
            }
            if (typeof todState.todIndex === 'number') {
              setTodIndex(todState.todIndex);
            }
            if (todState.todTurn) {
              setTodTurn(todState.todTurn);
            }
          }
        });
      }
    });

    // 4. Realtime Broadcast Listener for instant WebSocket responses
    const unsubRealtimeGame = RealtimeService.on('game', (data) => {
      if (data?.gameId === 'start_game' && data.gameModalId && data.hostName !== userName) {
        setActiveGameModal(data.gameModalId);
      }
      if (data?.gameId === 'tod_answer' && data.promptKey && data.answer) {
        setSavedAnswers((prev) => ({ ...prev, [data.promptKey]: data.answer }));
      }
      if (data?.gameId === 'invite' && data.invite && data.invite.fromName !== userName) {
        setPendingInvitePopup(data.invite);
        setIsPartnerConnected(true);
      }
    });

    return () => {
      if (unsubInvite) unsubInvite();
      if (unsubGame) unsubGame();
      if (unsubTod) unsubTod();
      unsubRealtimeGame();
    };
  }, [userName, partnerName]);

  useEffect(() => {
    const isSpicy = viewMode === 'spicy_games' || isSpicyTransitionActive;
    onSpicyModeChange?.(isSpicy);
    return () => {
      onSpicyModeChange?.(false);
    };
  }, [viewMode, isSpicyTransitionActive, onSpicyModeChange]);

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
      const nextTurn = tttTurn === 'X' ? 'O' : 'X';
      setTttTurn(nextTurn);

      // Automated partner move if playing as X
      if (nextTurn === 'O') {
        setTimeout(() => {
          const emptyIndices = next
            .map((val, idx) => (val === null ? idx : null))
            .filter((v): v is number => v !== null);

          if (emptyIndices.length > 0) {
            const randomIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
            const autoBoard = [...next];
            autoBoard[randomIdx] = 'O';
            const autoWinner = checkTttWinner(autoBoard);
            setTttBoard(autoBoard);
            if (autoWinner) {
              setTttWinner(autoWinner);
            } else {
              setTttTurn('X');
            }
          }
        }, 500);
      }
    }
  };

  const resetTtt = () => {
    setTttBoard(Array(9).fill(null));
    setTttTurn('X');
    setTttWinner(null);
  };

  // ------------------ DAILY QUIZ DATA (50+ QUESTIONS) ------------------
  const QUIZ_QUESTIONS = MINI_GAME_QUIZ_QUESTIONS;

  const handleSelectQuizOption = (optIdx: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setUserQuizAnswer(optIdx);
    const partnerPick = QUIZ_QUESTIONS[quizIndex]?.partnerAnswer ?? 0;
    setPartnerQuizAnswer(partnerPick);
    setRevealedQuiz(true);
  };

  const handleNextQuiz = () => {
    setQuizIndex((prev) => (prev + 1) % QUIZ_QUESTIONS.length);
    setUserQuizAnswer(null);
    setPartnerQuizAnswer(null);
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

  // ------------------ TRUTH OR DARE DATA (105+ TRUTHS & 105+ DARES) ------------------
  const ALL_TRUTHS = [...customTruths, ...MINI_GAME_TRUTHS];
  const ALL_DARES = [...customDares, ...MINI_GAME_DARES];
  const TOD_DATA = {
    truth: ALL_TRUTHS,
    dare: ALL_DARES,
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

  // ------------------ NEVER HAVE I EVER DATA (105+ PROMPTS) ------------------
  const NHIE_PROMPTS = SPICY_NHIE_PROMPTS;

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

  const handleOpenSpicyGames = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
    onSpicyModeChange?.(true);
    setIsSpicyTransitionActive(true);
  };

  if (viewMode === 'spicy_games') {
    return (
      <>
        <SpicyGamesLounge
          onBack={() => {
            setViewMode('hub');
            onSpicyModeChange?.(false);
          }}
          partnerName={partnerName}
          userName={userName}
        />
        <SpicyChiliTransition
          visible={isSpicyTransitionActive}
          onComplete={() => setIsSpicyTransitionActive(false)}
        />
      </>
    );
  }

  return (
    <LinearGradient colors={['#FCE8EC', '#FFF7F8']} style={styles.gradientContainer}>
      <FallingHeartsBackground />
      <SpicyChiliTransition
        visible={isSpicyTransitionActive}
        onComplete={() => {
          setIsSpicyTransitionActive(false);
          setViewMode('spicy_games');
        }}
      />
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
              <Text style={styles.screenTitle}>Mini Games 🎮</Text>
              <Text style={styles.subtitle}>
                Choose a game to play live with your partner
              </Text>
            </View>

            <TouchableOpacity
              style={styles.duoHeaderBadge}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setIsInviteModalOpen(true);
              }}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.duoHeaderDot,
                  { backgroundColor: isPartnerConnected ? '#10B981' : '#F59E0B' },
                ]}
              />
              <Text style={styles.duoHeaderBadgeText}>
                {isPartnerConnected ? 'Duo Active' : 'Invite'}
              </Text>
            </TouchableOpacity>
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
                    colors={['rgba(255, 255, 255, 0.75)', 'rgba(246, 241, 255, 0.48)']}
                    style={styles.categoryCardGradient}
                  >
                    <View style={styles.categoryCardTopRow}>
                      <View style={[styles.categoryIconCircle, { backgroundColor: 'rgba(240, 232, 255, 0.8)' }]}>
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
                        <Text style={styles.chipText}>⚔️ Tic-Tac-Toe</Text>
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
                  onPress={handleOpenSpicyGames}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.75)', 'rgba(255, 240, 243, 0.48)']}
                    style={styles.categoryCardGradient}
                  >
                    <View style={styles.categoryCardTopRow}>
                      <View style={[styles.categoryIconCircle, styles.spicyCardIconCircle]}>
                        <Image
                          source={require('../../assets/spicy_chili.png')}
                          style={styles.cardChiliImage}
                          resizeMode="contain"
                        />
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
                        <Text style={styles.spicyChipText}>💖 Truth or Dare</Text>
                      </View>
                      <View style={styles.spicyChip}>
                        <Text style={styles.spicyChipText}>🍒 Never Have I</Text>
                      </View>
                      <View style={styles.spicyChip}>
                        <Text style={styles.spicyChipText}>💌 I Dare You</Text>
                      </View>
                      <View style={styles.spicyChip}>
                        <Text style={styles.spicyChipText}>🎯 Hot Trivia</Text>
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
              {/* DUO PARTNER LOBBY BANNER */}
              <View style={styles.duoLobbyCard}>
                <View style={styles.duoLobbyTopRow}>
                  <View style={styles.duoStatusPill}>
                    <View
                      style={[
                        styles.duoStatusDot,
                        { backgroundColor: isPartnerConnected ? '#10B981' : '#F59E0B' },
                      ]}
                    />
                    <Text style={styles.duoStatusText}>
                      {isPartnerConnected ? 'Duo Mode: Live Connected' : 'Waiting for Partner'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.duoInviteBtn}
                    onPress={() => {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch {}
                      setIsInviteModalOpen(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="people" size={15} color="#FFFFFF" style={{ marginRight: 5 }} />
                    <Text style={styles.duoInviteBtnText}>Invite / Room</Text>
                  </TouchableOpacity>
                </View>

                {/* Players Connected Row */}
                <View style={styles.duoPlayersRow}>
                  {/* Player 1: User */}
                  <View style={styles.duoPlayerCard}>
                    <View style={styles.duoAvatarCircle}>
                      <Text style={styles.duoAvatarEmoji}>💖</Text>
                      <View style={styles.duoOnlineBadge} />
                    </View>
                    <Text style={styles.duoPlayerName} numberOfLines={1}>{userName}</Text>
                    <Text style={styles.duoPlayerRole}>Host (You)</Text>
                  </View>

                  {/* Duo Connector */}
                  <View style={styles.duoConnector}>
                    <Ionicons
                      name="heart"
                      size={20}
                      color={isPartnerConnected ? AppColors.primary : '#D1D5DB'}
                    />
                    <Text style={styles.duoConnectorText}>
                      {isPartnerConnected ? 'DUO' : 'INVITE'}
                    </Text>
                  </View>

                  {/* Player 2: Partner */}
                  <TouchableOpacity
                    style={styles.duoPlayerCard}
                    onPress={() => setIsInviteModalOpen(true)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.duoAvatarCircle,
                        !isPartnerConnected && styles.duoAvatarCircleOffline,
                      ]}
                    >
                      <Text style={styles.duoAvatarEmoji}>🌸</Text>
                      {isPartnerConnected ? (
                        <View style={styles.duoOnlineBadge} />
                      ) : (
                        <View style={styles.duoWaitingBadge}>
                          <Ionicons name="time" size={10} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    <Text style={styles.duoPlayerName} numberOfLines={1}>{partnerName}</Text>
                    <Text
                      style={[
                        styles.duoPlayerRole,
                        { color: isPartnerConnected ? '#059669' : '#D97706' },
                      ]}
                    >
                      {isPartnerConnected ? 'Present 🟢' : 'Tap to Invite ⏳'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.duoLobbyHint}>
                  {isPartnerConnected
                    ? '✨ Both players synced. Turn shuffling & answers are live!'
                    : `💌 Invite ${partnerName} with room code: ${duoState?.inviteCode || 'LOVE-77'}`}
                </Text>
              </View>

              {/* 2 Main Games Grid (Tic-Tac-Toe and Truth or Dare) */}
              <View style={styles.gridRow}>
                <GameTile
                  title="Live Tic-Tac-Toe"
                  tagline="Cross (✕) vs Circle (◯) board"
                  emoji="⚔️"
                  bgColor="rgba(244, 239, 255, 0.60)"
                  badgeText="Live"
                  onPress={() => handleOpenGameModal('ttt')}
                />
                <GameTile
                  title="Truth or Dare"
                  tagline="Romantic & spicy flip-cards"
                  emoji="🃏"
                  bgColor="rgba(235, 248, 242, 0.60)"
                  badgeText="Cards"
                  onPress={() => handleOpenGameModal('tod')}
                />
              </View>

              {/* Bonus Daily Quiz Tile */}
              <View style={styles.gridRow}>
                <GameTile
                  title="Daily Couple Quiz"
                  tagline="Answer together & reveal matches"
                  emoji="💌"
                  bgColor="rgba(255, 242, 244, 0.60)"
                  badgeText="Daily"
                  onPress={() => handleOpenGameModal('quiz')}
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
                <TouchableOpacity onPress={handleCloseGameModal}>
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
                  const effectivePartnerChoice = partnerQuizAnswer !== null ? partnerQuizAnswer : QUIZ_QUESTIONS[quizIndex].partnerAnswer;
                  const isPartnerChoice = effectivePartnerChoice === optIdx;
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
                <TouchableOpacity onPress={handleCloseGameModal}>
                  <Ionicons name="close" size={22} color={AppColors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Turn indicator */}
              <View style={styles.tttStatusRow}>
                {tttWinner ? (
                  <View style={styles.tttWinnerBanner}>
                    <Text style={styles.tttWinnerText}>
                      {tttWinner === 'Draw' ? "It's a Draw! 🤝" : `Winner: ${tttWinner} Wins! 🎉`}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.tttTurnContainer}>
                    <Text style={styles.tttTurnLabel}>Turn: </Text>
                    <View
                      style={[
                        styles.tttTurnBadge,
                        tttTurn === 'X' ? styles.tttTurnBadgeX : styles.tttTurnBadgeO,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tttTurnBadgeText,
                          { color: tttTurn === 'X' ? '#FF2D55' : '#4361EE' },
                        ]}
                      >
                        {tttTurn === 'X' ? 'Your Turn ( ✕ )' : "Partner's Turn ( ◯ )"}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* 3x3 Grid with clear, high-contrast visible boxes */}
              <View style={styles.tttGridContainer}>
                <View style={styles.tttGrid}>
                  {tttBoard.map((val, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.tttCell,
                        val === 'X' && styles.tttCellActiveX,
                        val === 'O' && styles.tttCellActiveO,
                      ]}
                      onPress={() => handleTttCellPress(idx)}
                      activeOpacity={0.7}
                    >
                      {val === 'X' ? (
                        <Text style={styles.tttCellCross}>✕</Text>
                      ) : val === 'O' ? (
                        <Text style={styles.tttCellCircle}>◯</Text>
                      ) : (
                        <View style={styles.tttCellEmptyDot} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
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
                <TouchableOpacity onPress={handleCloseGameModal}>
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
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.gameModalTitle}>Truth or Dare Deck 🃏</Text>
                  <View style={styles.deckCountBadge}>
                    <Text style={styles.deckCountBadgeText}>
                      {TOD_DATA[todType].length} Cards
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleCloseGameModal}>
                  <Ionicons name="close" size={22} color={AppColors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Duo Turn Shuffler Bar */}
              <View style={styles.duoTurnBar}>
                <View style={styles.duoTurnLeft}>
                  <Text style={styles.duoTurnLabel}>TURN:</Text>
                  <View
                    style={[
                      styles.duoTurnBadge,
                      todTurn === 'user' ? styles.duoTurnBadgeUser : styles.duoTurnBadgePartner,
                    ]}
                  >
                    <Text
                      style={[
                        styles.duoTurnBadgeText,
                        { color: todTurn === 'user' ? AppColors.primary : '#8B5CF6' },
                      ]}
                    >
                      {todTurn === 'user' ? `${userName} (You)` : partnerName}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.shuffleBtn, isShufflingTurn && styles.shuffleBtnDisabled]}
                  onPress={handleShuffleTurn}
                  disabled={isShufflingTurn}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="shuffle"
                    size={14}
                    color="#FFFFFF"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.shuffleBtnText}>
                    {isShufflingTurn ? 'Shuffling...' : 'Shuffle Turn'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Truth vs Dare Tab */}
              <View style={styles.wheelTierRow}>
                <TouchableOpacity
                  style={[styles.tierBtn, todType === 'truth' && styles.tierBtnActive]}
                  onPress={() => {
                    setTodType('truth');
                    setCardFlipped(false);
                    setShowAnswerInput(false);
                  }}
                >
                  <Text style={[styles.tierBtnText, todType === 'truth' && styles.tierBtnTextActive]}>
                    Truth 💭 ({ALL_TRUTHS.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tierBtn, todType === 'dare' && styles.tierBtnActive]}
                  onPress={() => {
                    setTodType('dare');
                    setCardFlipped(false);
                    setShowAnswerInput(false);
                  }}
                >
                  <Text style={[styles.tierBtnText, todType === 'dare' && styles.tierBtnTextActive]}>
                    Dare 🌶️ ({ALL_DARES.length})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Flip Card */}
              <TouchableOpacity
                style={[styles.flipCard, cardFlipped && styles.flipCardFlipped]}
                onPress={() => {
                  setCardFlipped(!cardFlipped);
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                }}
                activeOpacity={0.9}
              >
                {!cardFlipped ? (
                  <View style={styles.cardFront}>
                    <Text style={styles.cardDeckEmoji}>{todType === 'truth' ? '💭' : '🌶️'}</Text>
                    <Text style={styles.tapToRevealText}>
                      Tap to reveal {todType.toUpperCase()} for {todTurn === 'user' ? userName : partnerName}
                    </Text>
                    <Text style={styles.cardSubNotice}>
                      #{((todIndex) % TOD_DATA[todType].length) + 1} of {TOD_DATA[todType].length}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.cardBack}>
                    <View style={styles.cardBackCategoryBadge}>
                      <Text style={styles.cardBackCategoryText}>
                        {todType.toUpperCase()} • CARD #{((todIndex) % TOD_DATA[todType].length) + 1}
                      </Text>
                    </View>
                    <Text style={styles.cardBackPrompt}>
                      {TOD_DATA[todType][todIndex % TOD_DATA[todType].length]}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Duo Actions: Custom Question & Text Answer */}
              {cardFlipped && (
                <View style={styles.duoActionRow}>
                  <TouchableOpacity
                    style={styles.duoSecondaryActionBtn}
                    onPress={() => {
                      setCustomPromptType(todType);
                      setIsCustomModalOpen(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="create-outline" size={15} color={AppColors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.duoSecondaryActionText}>Custom {todType === 'truth' ? 'Truth' : 'Dare'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.duoSecondaryActionBtn}
                    onPress={() => setShowAnswerInput(!showAnswerInput)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={15} color={AppColors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.duoSecondaryActionText}>
                      {showAnswerInput ? 'Hide Answer' : 'Type Answer'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Text Answer Input Section */}
              {cardFlipped && showAnswerInput && (
                <View style={styles.answerInputContainer}>
                  <Text style={styles.answerInputTitle}>
                    ✍️ {todTurn === 'user' ? userName : partnerName}'s Text Answer:
                  </Text>
                  <TextInput
                    style={styles.answerTextInput}
                    placeholder={`Type your response to this ${todType}...`}
                    placeholderTextColor="#A09398"
                    value={answerInputText}
                    onChangeText={setAnswerInputText}
                    multiline
                  />
                  <TouchableOpacity
                    style={styles.answerSubmitBtn}
                    onPress={() => {
                      const promptKey = `tod-${todType}-${todIndex % TOD_DATA[todType].length}`;
                      handleSaveTextAnswer(promptKey);
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="send" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
                    <Text style={styles.answerSubmitBtnText}>Save & Reveal Answer</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Display Written Answer if available */}
              {cardFlipped && savedAnswers[`tod-${todType}-${todIndex % TOD_DATA[todType].length}`] && (
                <View style={styles.savedAnswerCard}>
                  <View style={styles.savedAnswerHeader}>
                    <Ionicons name="heart" size={14} color={AppColors.primary} style={{ marginRight: 5 }} />
                    <Text style={styles.savedAnswerLabel}>
                      {todTurn === 'user' ? userName : partnerName}'s Written Confession:
                    </Text>
                  </View>
                  <Text style={styles.savedAnswerText}>
                    "{savedAnswers[`tod-${todType}-${todIndex % TOD_DATA[todType].length}`]}"
                  </Text>
                </View>
              )}

              <View style={styles.todFooterBtnRow}>
                <TouchableOpacity
                  style={[styles.spinBtn, { flex: 1, marginRight: 8 }]}
                  onPress={() => {
                    setTodIndex((i) => i + 1);
                    setCardFlipped(false);
                    setShowAnswerInput(false);
                  }}
                >
                  <Text style={styles.spinBtnText}>Draw Next Card ➔</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.spinBtn, { backgroundColor: '#8B5CF6', paddingHorizontal: 16 }]}
                  onPress={handleShuffleTurn}
                >
                  <Ionicons name="shuffle" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ----------------- MODAL 5: FANTASY DICE ----------------- */}
        <Modal visible={activeGameModal === 'dice'} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.gameModalCard}>
              <View style={styles.modalTopRow}>
                <Text style={styles.gameModalTitle}>Fantasy Romance Dice 🎲</Text>
                <TouchableOpacity onPress={handleCloseGameModal}>
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
                <TouchableOpacity onPress={handleCloseGameModal}>
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
                <TouchableOpacity onPress={handleCloseGameModal}>
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

        {/* ----------------- MODAL 9: DUO GAME ROOM & PARTNER INVITE ----------------- */}
        <Modal visible={isInviteModalOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.gameModalCard}>
              <View style={styles.modalTopRow}>
                <View>
                  <Text style={styles.gameModalTitle}>Duo Game Room 🎮</Text>
                  <Text style={styles.modalSubtitle}>Session Match Room & In-Game Invites</Text>
                </View>
                <TouchableOpacity onPress={() => setIsInviteModalOpen(false)}>
                  <Ionicons name="close" size={22} color={AppColors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Status or Toast Feedback */}
              {gameJoinStatus && (
                <View style={styles.gameToastBanner}>
                  <Ionicons name="sparkles" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.gameToastText}>{gameJoinStatus}</Text>
                </View>
              )}

              {/* 1. Dedicated Game Match Code Box */}
              <View style={styles.inviteBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <Text style={styles.inviteBoxLabel}>GAME MATCH ROOM CODE 🎮</Text>
                  <TouchableOpacity
                    style={styles.newCodePill}
                    onPress={handleGenerateNewGameCode}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="refresh" size={11} color={AppColors.primary} />
                    <Text style={styles.newCodePillText}>New Code</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.inviteCodeDisplayRow}>
                  <Text style={styles.inviteCodeText}>{duoState?.gameRoomCode || 'GAME-7824'}</Text>
                  <TouchableOpacity
                    style={styles.copyCodeBtn}
                    onPress={handleCopyGameCode}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={inviteCopied ? 'checkmark' : 'copy'}
                      size={14}
                      color="#FFFFFF"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.copyCodeBtnText}>
                      {inviteCopied ? 'Copied! ✨' : 'Copy Code'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 2. Join via Code with PASTE option */}
              <View style={styles.joinCodeBox}>
                <Text style={styles.joinCodeLabel}>ENTER / PASTE PARTNER'S CODE TO JOIN</Text>
                <View style={styles.joinInputRow}>
                  <TextInput
                    style={styles.joinTextInput}
                    placeholder="e.g. GAME-7824"
                    placeholderTextColor="#C4B4BA"
                    value={gameCodeInput}
                    onChangeText={setGameCodeInput}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    style={styles.pasteCodeBtn}
                    onPress={handlePasteGameCode}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="clipboard-outline" size={14} color={AppColors.primary} />
                    <Text style={styles.pasteCodeBtnText}>Paste</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.joinSubmitBtn}
                    onPress={handleJoinGameRoom}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                    <Text style={styles.joinSubmitBtnText}>Join</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 3. COD Mobile / Free Fire Style In-Game Invite Box */}
              <View style={styles.inGameInviteCard}>
                <View style={styles.inGamePartnerRow}>
                  <View style={styles.inGameAvatarCircle}>
                    <Text style={styles.inGameAvatarEmoji}>❤️</Text>
                    <View
                      style={[
                        styles.onlineDot,
                        { backgroundColor: isPartnerConnected ? '#10B981' : '#F59E0B' },
                      ]}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.inGamePartnerName}>{partnerName}</Text>
                    <Text style={styles.inGamePartnerStatus}>
                      {isPartnerConnected ? '🟢 In Room / Connected' : '⏳ Ready for Game Invite'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.inGameInviteBtn}
                    onPress={handleSendInGameInvite}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="person-add" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.inGameInviteBtnText}>Invite</Text>
                  </TouchableOpacity>
                </View>

                {/* Simulate Receive In-Game Invite Button for Instant Testing */}
                <TouchableOpacity
                  style={styles.simulateIncomingBtn}
                  onPress={handleSimulateReceiveInvite}
                  activeOpacity={0.75}
                >
                  <Ionicons name="notifications-outline" size={13} color="#8F78D2" style={{ marginRight: 5 }} />
                  <Text style={styles.simulateIncomingText}>
                    Simulate In-Game Invite from {partnerName} (Pop-up Test)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 4. Live Partner Status Card */}
              <TouchableOpacity
                style={[
                  styles.partnerStatusCard,
                  isPartnerConnected
                    ? styles.partnerStatusConnected
                    : styles.partnerStatusWaiting,
                ]}
                onPress={handleTogglePartnerConnect}
                activeOpacity={0.85}
              >
                <View style={styles.partnerStatusIconCircle}>
                  <Ionicons
                    name={isPartnerConnected ? 'checkmark-circle' : 'hourglass-outline'}
                    size={24}
                    color={isPartnerConnected ? '#10B981' : '#F59E0B'}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.partnerStatusTitle}>
                    {isPartnerConnected
                      ? `🟢 ${partnerName} is in Room!`
                      : `⏳ Waiting for ${partnerName}`}
                  </Text>
                  <Text style={styles.partnerStatusDesc}>
                    {isPartnerConnected
                      ? 'Both players connected in match room. Turns and answers sync automatically! (Tap to toggle)'
                      : `Invite ${partnerName} or share match code above to play together. (Tap to toggle)`}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Permanent Account Pairing vs Match Code Clarification */}
              <View style={styles.permanentAccountNotice}>
                <Ionicons name="link-outline" size={14} color="#6B7280" style={{ marginRight: 6 }} />
                <Text style={styles.permanentAccountNoticeText}>
                  Permanent Account Link: <Text style={{ fontWeight: '700' }}>{duoState?.inviteCode || 'PAIR-7729'}</Text> (linked on login, distinct from match room)
                </Text>
              </View>

              <TouchableOpacity
                style={styles.spinBtn}
                onPress={() => setIsInviteModalOpen(false)}
              >
                <Text style={styles.spinBtnText}>Close & Play Now ✨</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ----------------- IN-GAME INVITE POP-UP (COD / FREE FIRE STYLE) ----------------- */}
        <Modal visible={!!pendingInvitePopup} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.invitePopupCard}>
              <View style={styles.invitePopupIconBadge}>
                <Ionicons name="game-controller" size={32} color="#FF6575" />
              </View>
              <Text style={styles.invitePopupHeader}>Game Invite! 🎮</Text>
              <Text style={styles.invitePopupBody}>
                <Text style={{ fontWeight: '700', color: AppColors.primary }}>
                  {pendingInvitePopup?.fromName}
                </Text>{' '}
                invited you to play{' '}
                <Text style={{ fontWeight: '700', color: AppColors.textPrimary }}>
                  {pendingInvitePopup?.gameTitle}
                </Text>
                !
              </Text>

              <View style={styles.popupRoomCodePill}>
                <Text style={styles.popupRoomCodeLabel}>ROOM CODE:</Text>
                <Text style={styles.popupRoomCodeValue}>
                  {pendingInvitePopup?.gameRoomCode}
                </Text>
              </View>

              <View style={styles.invitePopupActionsRow}>
                <TouchableOpacity
                  style={styles.popupDeclineBtn}
                  onPress={handleDeclineInvite}
                  activeOpacity={0.8}
                >
                  <Text style={styles.popupDeclineBtnText}>Decline</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.popupAcceptBtn}
                  onPress={handleAcceptInvite}
                  activeOpacity={0.8}
                >
                  <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.popupAcceptBtnText}>Accept & Join 🚀</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ----------------- MODAL 10: CUSTOM PROMPT CREATION ----------------- */}
        <Modal visible={isCustomModalOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.gameModalCard}>
              <View style={styles.modalTopRow}>
                <View>
                  <Text style={styles.gameModalTitle}>Create Custom Prompt ✍️</Text>
                  <Text style={styles.modalSubtitle}>Add your own question or dare for {partnerName}</Text>
                </View>
                <TouchableOpacity onPress={() => setIsCustomModalOpen(false)}>
                  <Ionicons name="close" size={22} color={AppColors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Type selector */}
              <View style={styles.wheelTierRow}>
                <TouchableOpacity
                  style={[styles.tierBtn, customPromptType === 'truth' && styles.tierBtnActive]}
                  onPress={() => setCustomPromptType('truth')}
                >
                  <Text style={[styles.tierBtnText, customPromptType === 'truth' && styles.tierBtnTextActive]}>
                    Truth 💭
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tierBtn, customPromptType === 'dare' && styles.tierBtnActive]}
                  onPress={() => setCustomPromptType('dare')}
                >
                  <Text style={[styles.tierBtnText, customPromptType === 'dare' && styles.tierBtnTextActive]}>
                    Dare 🌶️
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>
                Your Custom {customPromptType.toUpperCase()} Prompt:
              </Text>
              <TextInput
                style={[styles.modalTextInput, { height: 90, textAlignVertical: 'top' }]}
                placeholder={
                  customPromptType === 'truth'
                    ? 'e.g. What was the exact second you fell in love with me?'
                    : 'e.g. Whisper 3 things you love about me for 30 seconds...'
                }
                placeholderTextColor="#A09398"
                value={customPromptInput}
                onChangeText={setCustomPromptInput}
                multiline
              />

              <TouchableOpacity
                style={[styles.spinBtn, { marginTop: 16 }]}
                onPress={handleSaveCustomPrompt}
                activeOpacity={0.85}
              >
                <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.spinBtnText}>Add to Duo Deck ✨</Text>
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
    fontFamily: AppFonts.title,
    fontSize: 26,
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
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 4,
    borderWidth: 1.8,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    overflow: 'hidden',
  },
  spicyBoxGlow: {
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#FF6575',
    shadowOpacity: 0.18,
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
  spicyCardIconCircle: {
    backgroundColor: '#FFE5EB',
    borderWidth: 1.5,
    borderColor: '#FF758C',
    shadowColor: '#FF1E56',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  cardChiliImage: {
    width: 36,
    height: 36,
    transform: [{ rotate: '-10deg' }],
  },
  categoryEmoji: {
    fontSize: 26,
  },
  categoryBadgePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8F78D2',
    textTransform: 'uppercase',
  },
  spicyBadgePill: {
    backgroundColor: 'rgba(255, 240, 243, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  spicyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: AppColors.primary,
    textTransform: 'uppercase',
  },
  categoryCardTitle: {
    fontFamily: AppFonts.title,
    fontSize: 24,
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
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  spicyChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginHorizontal: 8,
    marginBottom: 10,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.95)',
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
    fontFamily: AppFonts.title,
    fontSize: 21,
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
    fontFamily: AppFonts.title,
    fontSize: 20,
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
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 28,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  modalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gameModalTitle: {
    fontFamily: AppFonts.title,
    fontSize: 22,
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
    backgroundColor: 'rgba(255, 247, 248, 0.65)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.92)',
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
    backgroundColor: 'rgba(255, 242, 244, 0.85)',
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.92)',
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
  tttTurnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tttTurnLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  tttTurnBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  tttTurnBadgeX: {
    backgroundColor: '#FFF0F3',
    borderColor: '#FFBAC8',
  },
  tttTurnBadgeO: {
    backgroundColor: '#F0F4FF',
    borderColor: '#BAC9FF',
  },
  tttTurnBadgeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  tttWinnerBanner: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#FFF0F5',
    borderWidth: 1.5,
    borderColor: '#FFBAC8',
  },
  tttWinnerText: {
    fontSize: 16,
    fontWeight: '900',
    color: AppColors.primary,
  },
  tttGridContainer: {
    backgroundColor: '#FFF0F4',
    borderRadius: 22,
    padding: 10,
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: '#FFD6DF',
    marginBottom: 20,
    shadowColor: '#FF6B8B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tttGrid: {
    width: 252,
    height: 252,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tttCell: {
    width: 76,
    height: 76,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFC0CB',
    shadowColor: '#E07A90',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  tttCellActiveX: {
    backgroundColor: '#FFF2F5',
    borderColor: '#FF2D55',
  },
  tttCellActiveO: {
    backgroundColor: '#F2F5FF',
    borderColor: '#4361EE',
  },
  tttCellCross: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FF2D55',
    lineHeight: 38,
  },
  tttCellCircle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#4361EE',
    lineHeight: 38,
  },
  tttCellEmptyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFD4DE',
  },
  resetTttBtn: {
    backgroundColor: AppColors.primary,
    borderRadius: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  resetTttBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
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
    backgroundColor: 'rgba(255, 247, 248, 0.65)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.92)',
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
    backgroundColor: 'rgba(255, 245, 246, 0.78)',
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.92)',
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
    backgroundColor: 'rgba(255, 247, 248, 0.65)',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.92)',
    marginVertical: 12,
  },
  flipCardFlipped: {
    backgroundColor: 'rgba(255, 232, 236, 0.85)',
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
    backgroundColor: 'rgba(255, 247, 248, 0.65)',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.92)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.68)',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.92)',
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
    backgroundColor: 'rgba(255, 242, 244, 0.8)',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  nhieReactionText: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.primary,
    textAlign: 'center',
  },
  sensoryCard: {
    backgroundColor: 'rgba(255, 247, 248, 0.65)',
    borderRadius: 20,
    padding: 20,
    marginVertical: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.92)',
  },
  sensoryCardTitle: {
    fontFamily: AppFonts.title,
    fontSize: 20,
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
    backgroundColor: 'rgba(255, 247, 248, 0.72)',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: AppColors.textPrimary,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.92)',
  },
  emptyGoalsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    borderRadius: 22,
    padding: 24,
    marginHorizontal: 16,
    marginVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.92)',
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
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
    fontFamily: AppFonts.title,
    fontSize: 19,
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
  // DUO LOBBY & HEADER STYLES
  duoHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 143, 171, 0.4)',
  },
  duoHeaderDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  duoHeaderBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: AppColors.textPrimary,
  },
  duoLobbyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderRadius: 22,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 3,
  },
  duoLobbyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  duoStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 240, 243, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  duoStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  duoStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  duoInviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  duoInviteBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  duoPlayersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 16,
  },
  duoPlayerCard: {
    alignItems: 'center',
    minWidth: 80,
  },
  duoAvatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFE8EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    position: 'relative',
  },
  duoAvatarCircleOffline: {
    backgroundColor: '#F3F4F6',
  },
  duoAvatarEmoji: {
    fontSize: 24,
  },
  duoOnlineBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  duoWaitingBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F59E0B',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    position: 'absolute',
    bottom: -1,
    right: -1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duoPlayerName: {
    fontSize: 13,
    fontWeight: '800',
    color: AppColors.textPrimary,
  },
  duoPlayerRole: {
    fontSize: 11,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  duoConnector: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  duoConnectorText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: AppColors.textSecondary,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  duoLobbyHint: {
    fontSize: 11.5,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '500',
  },

  // TOD DUO STYLES
  deckCountBadge: {
    backgroundColor: '#FFE8EC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 8,
  },
  deckCountBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: AppColors.primary,
  },
  duoTurnBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 245, 247, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    marginBottom: 10,
  },
  duoTurnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  duoTurnLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: AppColors.textSecondary,
    marginRight: 6,
    letterSpacing: 0.5,
  },
  duoTurnBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  duoTurnBadgeUser: {
    backgroundColor: '#FFE8EC',
  },
  duoTurnBadgePartner: {
    backgroundColor: '#EDE9FE',
  },
  duoTurnBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  shuffleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  shuffleBtnDisabled: {
    opacity: 0.6,
  },
  shuffleBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardSubNotice: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B3929C',
    marginTop: 8,
  },
  cardBackCategoryBadge: {
    backgroundColor: '#FFE8EC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  cardBackCategoryText: {
    fontSize: 11,
    fontWeight: '800',
    color: AppColors.primary,
    letterSpacing: 0.5,
  },
  duoActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    marginBottom: 4,
  },
  duoSecondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD6DF',
  },
  duoSecondaryActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.primary,
  },
  answerInputContainer: {
    backgroundColor: 'rgba(255, 245, 247, 0.85)',
    borderRadius: 14,
    padding: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#FFD6DF',
  },
  answerInputTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 6,
  },
  answerTextInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: AppColors.textPrimary,
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#F3E8EC',
  },
  answerSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 8,
  },
  answerSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  savedAnswerCard: {
    backgroundColor: '#FFF0F3',
    borderRadius: 12,
    padding: 10,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#FFCAD4',
  },
  savedAnswerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  savedAnswerLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: AppColors.primary,
  },
  savedAnswerText: {
    fontSize: 13,
    color: AppColors.textPrimary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  todFooterBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },

  // INVITE MODAL STYLES
  modalSubtitle: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 1,
  },
  inviteBox: {
    backgroundColor: 'rgba(255, 245, 247, 0.8)',
    borderRadius: 16,
    padding: 14,
    marginVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD6DF',
  },
  inviteBoxLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: AppColors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inviteCodeDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
  },
  inviteCodeText: {
    fontFamily: AppFonts.title,
    fontSize: 24,
    color: AppColors.primary,
    letterSpacing: 2,
  },
  copyCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  copyCodeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  partnerStatusCard: {
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 8,
    borderWidth: 1.5,
  },
  partnerStatusConnected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  partnerStatusWaiting: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  partnerStatusIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerStatusTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  partnerStatusDesc: {
    fontSize: 12,
    color: AppColors.textSecondary,
    lineHeight: 17,
  },
  togglePartnerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    marginVertical: 6,
  },
  togglePartnerBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  dbNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  dbNoticeText: {
    fontSize: 11,
    color: '#4338CA',
    lineHeight: 16,
    flex: 1,
    fontWeight: '500',
  },

  // ENHANCED GAME ROOM & IN-GAME INVITE STYLES
  gameToastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 6,
  },
  gameToastText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  newCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 232, 236, 0.85)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 4,
  },
  newCodePillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: AppColors.primary,
  },
  joinCodeBox: {
    backgroundColor: 'rgba(255, 245, 247, 0.8)',
    borderRadius: 16,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#FFD6DF',
  },
  joinCodeLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: AppColors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  joinInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  joinTextInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.textPrimary,
    borderWidth: 1,
    borderColor: '#F3CCD5',
  },
  pasteCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 232, 236, 0.9)',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  pasteCodeBtnText: {
    color: AppColors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  joinSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primary,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 4,
  },
  joinSubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5,
  },
  inGameInviteCard: {
    backgroundColor: 'rgba(245, 243, 255, 0.85)',
    borderRadius: 16,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1.2,
    borderColor: '#DDD6FE',
  },
  inGamePartnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inGameAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
  },
  inGameAvatarEmoji: {
    fontSize: 18,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
    bottom: -1,
    right: -1,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  inGamePartnerName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: AppColors.textPrimary,
  },
  inGamePartnerStatus: {
    fontSize: 11,
    color: AppColors.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  inGameInviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 12,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  inGameInviteBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  simulateIncomingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#C4B5FD',
  },
  simulateIncomingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
  },
  permanentAccountNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(243, 244, 246, 0.9)',
    borderRadius: 12,
    padding: 9,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  permanentAccountNoticeText: {
    fontSize: 11,
    color: '#4B5563',
    flex: 1,
    lineHeight: 15,
  },

  // FLOATING IN-GAME INVITE POP-UP
  invitePopupCard: {
    width: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#DDD6FE',
  },
  invitePopupIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
  },
  invitePopupHeader: {
    fontFamily: AppFonts.title,
    fontSize: 22,
    color: AppColors.textPrimary,
    marginBottom: 6,
  },
  invitePopupBody: {
    fontSize: 13.5,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 14,
  },
  popupRoomCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 18,
    gap: 6,
  },
  popupRoomCodeLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  popupRoomCodeValue: {
    fontSize: 14,
    fontWeight: '900',
    color: AppColors.primary,
    letterSpacing: 1.5,
  },
  invitePopupActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  popupDeclineBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupDeclineBtnText: {
    color: '#6B7280',
    fontWeight: '700',
    fontSize: 13,
  },
  popupAcceptBtn: {
    flex: 1.4,
    flexDirection: 'row',
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  popupAcceptBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13.5,
  },
});

export default GamesScreen;
