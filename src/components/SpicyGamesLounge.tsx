import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
  Dimensions,
  Image,
  StatusBar,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AppFonts from '../theme/AppFonts';
import AnimatedGifEmoji from './AnimatedGifEmoji';
import SpicyDarkGradientBg from './SpicyDarkGradientBg';
import GameSyncService, { DuoRoomState, InGameInvite } from '../services/GameSyncService';
import * as Clipboard from 'expo-clipboard';
import {
  SPICY_NHIE_PROMPTS,
  SPICY_TRUTHS,
  SPICY_DARES,
  HOT_TRIVIA_QUESTIONS,
} from '../data/spicyGamesData';

const { width } = Dimensions.get('window');

interface SpicyGamesLoungeProps {
  onBack: () => void;
  partnerName?: string;
  userName?: string;
}

export const SpicyGamesLounge: React.FC<SpicyGamesLoungeProps> = ({
  onBack,
  partnerName = 'Partner',
  userName = 'You',
}) => {
  // Global Lounge State
  const [activeGame, setActiveGame] = useState<string | null>(null);

  // Duo Room Presence
  const [duoState, setDuoState] = useState<DuoRoomState | null>(null);
  const [isPartnerConnected, setIsPartnerConnected] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  // Dedicated Game Match Room Code & In-Game Invite States
  const [gameCodeInput, setGameCodeInput] = useState('');
  const [gameJoinStatus, setGameJoinStatus] = useState<string | null>(null);
  const [pendingInvitePopup, setPendingInvitePopup] = useState<InGameInvite | null>(null);
  const [inviteSentStatus, setInviteSentStatus] = useState<string | null>(null);

  // Turn Shuffling
  const [todTurn, setTodTurn] = useState<'user' | 'partner'>('user');
  const [isShufflingTod, setIsShufflingTod] = useState(false);
  const [nhieTurn, setNhieTurn] = useState<'user' | 'partner'>('user');
  const [isShufflingNhie, setIsShufflingNhie] = useState(false);

  // Truth or Dare State
  const [todTab, setTodTab] = useState<'truth' | 'dare'>('truth');
  const [todIndex, setTodIndex] = useState(0);
  const [todCardFlipped, setTodCardFlipped] = useState(false);
  const [customTruths, setCustomTruths] = useState<string[]>([]);
  const [customDares, setCustomDares] = useState<string[]>([]);

  // Dirty Never Have I Ever State
  const [nhieIndex, setNhieIndex] = useState(0);
  const [nhieUserVote, setNhieUserVote] = useState<'have' | 'never' | null>(null);
  const [nhiePartnerVote, setNhiePartnerVote] = useState<'have' | 'never' | null>(null);
  const [customNhie, setCustomNhie] = useState<string[]>([]);

  // Hot Trivia State
  const [triviaIndex, setTriviaIndex] = useState(0);
  const [triviaUserChoice, setTriviaUserChoice] = useState<number | null>(null);
  const [revealedTrivia, setRevealedTrivia] = useState(false);

  // Custom Prompt Creation Modal
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customPromptCategory, setCustomPromptCategory] = useState<'truth' | 'dare' | 'nhie'>('truth');
  const [customPromptInput, setCustomPromptInput] = useState('');

  // Written Text Answer State
  const [showAnswerInput, setShowAnswerInput] = useState(false);
  const [answerInputText, setAnswerInputText] = useState('');
  const [savedAnswers, setSavedAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadDuoData = async () => {
      const room = await GameSyncService.getDuoRoomState();
      setDuoState(room);
      setIsPartnerConnected(room.isPartnerConnected);

      const customP = await GameSyncService.getCustomPrompts('spicy');
      setCustomTruths(customP.filter((p) => p.category === 'truth').map((p) => p.prompt));
      setCustomDares(customP.filter((p) => p.category === 'dare').map((p) => p.prompt));
      setCustomNhie(customP.filter((p) => p.category === 'nhie').map((p) => p.prompt));
    };
    loadDuoData();
  }, []);

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
    setGameJoinStatus(`Generated new game code: ${newCode} 🔥`);
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

  const handleSendInGameInvite = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    await GameSyncService.sendInGameInvite('Spicy Games Lounge');
    setInviteSentStatus(`🎮 In-Game invite sent to ${partnerName}!`);
    setTimeout(() => setInviteSentStatus(null), 3500);
  };

  const handleSimulateReceiveInvite = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    const incoming: InGameInvite = {
      id: `invite-${Date.now()}`,
      fromName: partnerName,
      toName: userName,
      gameTitle: 'Spicy Duo Lounge 🔥',
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
      setPendingInvitePopup(null);
      setIsInviteModalOpen(false);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      setGameJoinStatus(
        `Accepted invite from ${pendingInvitePopup.fromName}! Entered room ${pendingInvitePopup.gameRoomCode} 🔥`
      );
      setTimeout(() => setGameJoinStatus(null), 3500);
    }
  };

  const handleDeclineInvite = () => {
    setPendingInvitePopup(null);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handleShuffleTodTurn = () => {
    if (isShufflingTod) return;
    setIsShufflingTod(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    let count = 0;
    const interval = setInterval(() => {
      setTodTurn((prev) => (prev === 'user' ? 'partner' : 'user'));
      count++;
      if (count > 6) {
        clearInterval(interval);
        const next = Math.random() > 0.5 ? 'user' : 'partner';
        setTodTurn(next);
        setIsShufflingTod(false);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
    }, 110);
  };

  const handleShuffleNhieTurn = () => {
    if (isShufflingNhie) return;
    setIsShufflingNhie(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    let count = 0;
    const interval = setInterval(() => {
      setNhieTurn((prev) => (prev === 'user' ? 'partner' : 'user'));
      count++;
      if (count > 6) {
        clearInterval(interval);
        const next = Math.random() > 0.5 ? 'user' : 'partner';
        setNhieTurn(next);
        setIsShufflingNhie(false);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
    }, 110);
  };

  const handleSaveCustomPrompt = async () => {
    if (!customPromptInput.trim()) return;
    const text = customPromptInput.trim();
    if (customPromptCategory === 'truth') {
      setCustomTruths((prev) => [text, ...prev]);
      await GameSyncService.addCustomPrompt('spicy', text, 'truth', 'user');
      setTodTab('truth');
      setTodIndex(0);
      setTodCardFlipped(true);
    } else if (customPromptCategory === 'dare') {
      setCustomDares((prev) => [text, ...prev]);
      await GameSyncService.addCustomPrompt('spicy', text, 'dare', 'user');
      setTodTab('dare');
      setTodIndex(0);
      setTodCardFlipped(true);
    } else {
      setCustomNhie((prev) => [text, ...prev]);
      await GameSyncService.addCustomPrompt('spicy', text, 'nhie', 'user');
      setNhieIndex(0);
      setNhieUserVote(null);
      setNhiePartnerVote(null);
    }
    setCustomPromptInput('');
    setIsCustomModalOpen(false);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const handleSaveTextAnswer = async (promptKey: string) => {
    if (!answerInputText.trim()) return;
    const ans = answerInputText.trim();
    setSavedAnswers((prev) => ({ ...prev, [promptKey]: ans }));
    await GameSyncService.savePromptAnswer(promptKey, ans, 'user');
    setAnswerInputText('');
    setShowAnswerInput(false);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const ALL_SPICY_TRUTHS = [...customTruths, ...SPICY_TRUTHS];
  const ALL_SPICY_DARES = [...customDares, ...SPICY_DARES];
  const ALL_SPICY_NHIE = [...customNhie, ...SPICY_NHIE_PROMPTS];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#07000B" />
      <SpicyDarkGradientBg style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safeArea}>
        {/* Top Header Bar */}
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleGroup}>
            <View style={styles.headerTitleRow}>
              <Image
                source={require('../../assets/spicy_chili.png')}
                style={styles.headerChiliEmblem}
                resizeMode="contain"
              />
              <Text style={styles.headerTitle}>SPICY GAMES</Text>
            </View>
          </View>

          {/* Duo Room Presence Badge */}
          <TouchableOpacity
            style={styles.duoHeaderPill}
            onPress={() => setIsInviteModalOpen(true)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.duoHeaderDot,
                { backgroundColor: isPartnerConnected ? '#10B981' : '#F59E0B' },
              ]}
            />
            <Text style={styles.duoHeaderPillText}>
              {isPartnerConnected ? 'Duo Live' : 'Invite'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Duo Room Status Bar */}
        <View style={styles.duoPresenceBar}>
          <View style={styles.duoPresenceLeft}>
            <Text style={styles.duoPresenceDot}>🟢</Text>
            <Text style={styles.duoPresenceText}>
              {userName} & {partnerName}
            </Text>
            <View style={styles.duoOnlineTag}>
              <Text style={styles.duoOnlineTagText}>
                {isPartnerConnected ? 'CONNECTED' : 'INVITE SENT'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.duoRoomActionBtn}
            onPress={() => setIsInviteModalOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="people" size={13} color="#FF6584" style={{ marginRight: 4 }} />
            <Text style={styles.duoRoomActionText}>Lobby</Text>
          </TouchableOpacity>
        </View>

        {/* Main 4-Game Grid */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollGrid}>
          <View style={styles.gamesGrid}>
            {/* 1. TRUTH OR DARE ? */}
            <TouchableOpacity
              style={[styles.gameCard, styles.premiumCard]}
              onPress={() => setActiveGame('truth_or_dare')}
              activeOpacity={0.85}
            >
              <View style={styles.cardIconCircle}>
                <AnimatedGifEmoji emoji="🔥" size={32} />
              </View>
              <Text style={styles.gameCardTitle}>TRUTH OR DARE ?</Text>
              <Text style={styles.gameCardTag}>{ALL_SPICY_TRUTHS.length + ALL_SPICY_DARES.length} CARDS • DUO</Text>
            </TouchableOpacity>

            {/* 2. DIRTY NEVER HAVE I EVER */}
            <TouchableOpacity
              style={styles.gameCard}
              onPress={() => setActiveGame('dirty_nhie')}
              activeOpacity={0.85}
            >
              <View style={styles.cardIconCircle}>
                <Text style={{ fontSize: 28 }}>🍒</Text>
              </View>
              <Text style={styles.gameCardTitle}>DIRTY NEVER HAVE I EVER</Text>
              <Text style={styles.gameCardTag}>{ALL_SPICY_NHIE.length} CONFESSIONS • DUO</Text>
            </TouchableOpacity>

            {/* 3. I DARE YOU */}
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
              <Text style={styles.gameCardTag}>INTENSE DARES • DUO</Text>
            </TouchableOpacity>

            {/* 4. HOT TRIVIA */}
            <TouchableOpacity
              style={styles.gameCard}
              onPress={() => setActiveGame('hot_trivia')}
              activeOpacity={0.85}
            >
              <View style={styles.cardIconCircle}>
                <AnimatedGifEmoji emoji="🎯" size={32} />
              </View>
              <Text style={styles.gameCardTitle}>HOT TRIVIA</Text>
              <Text style={styles.gameCardTag}>{HOT_TRIVIA_QUESTIONS.length} INTIMACY QUIZZES</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* ======================================================== */}
      {/* MODAL 1: TRUTH OR DARE / I DARE YOU                      */}
      {/* ======================================================== */}
      <Modal visible={activeGame === 'truth_or_dare'} animationType="slide">
        <View style={styles.modalFullContainer}>
          <SpicyDarkGradientBg style={StyleSheet.absoluteFill} />
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalTopHeader}>
              <TouchableOpacity
                style={styles.modalBackBtn}
                onPress={() => setActiveGame(null)}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>SPICY TRUTH OR DARE</Text>
              <View style={{ width: 36 }} />
            </View>

            {/* Duo Turn Shuffler Bar */}
            <View style={styles.duoSpicyTurnBar}>
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
                      { color: todTurn === 'user' ? '#FF2A6D' : '#C084FC' },
                    ]}
                  >
                    {todTurn === 'user' ? `${userName} (You)` : partnerName}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.shuffleBtn, isShufflingTod && styles.shuffleBtnDisabled]}
                onPress={handleShuffleTodTurn}
                disabled={isShufflingTod}
                activeOpacity={0.8}
              >
                <Ionicons name="shuffle" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.shuffleBtnText}>
                  {isShufflingTod ? 'Picking...' : 'Shuffle Turn'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Mode selection tabs: TRUTH vs DARE */}
            <View style={styles.todTabsRow}>
              <TouchableOpacity
                style={[styles.todTabBtn, todTab === 'truth' && styles.todTabActive]}
                onPress={() => {
                  setTodTab('truth');
                  setTodCardFlipped(false);
                  setShowAnswerInput(false);
                }}
              >
                <Text style={[styles.todTabText, todTab === 'truth' && styles.todTabTextActive]}>
                  TRUTH 💭 ({ALL_SPICY_TRUTHS.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.todTabBtn, todTab === 'dare' && styles.todTabActive]}
                onPress={() => {
                  setTodTab('dare');
                  setTodCardFlipped(false);
                  setShowAnswerInput(false);
                }}
              >
                <Text style={[styles.todTabText, todTab === 'dare' && styles.todTabTextActive]}>
                  DARE 🌶️ ({ALL_SPICY_DARES.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Flip Card Arena */}
            <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 40 }}>
              <TouchableOpacity
                style={styles.todCard}
                onPress={() => {
                  setTodCardFlipped(!todCardFlipped);
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                }}
                activeOpacity={0.9}
              >
                <Text style={styles.todCardCategory}>
                  {todTab.toUpperCase()} PROMPT • #{((todIndex) % (todTab === 'truth' ? ALL_SPICY_TRUTHS.length : ALL_SPICY_DARES.length)) + 1}
                </Text>
                <Text style={styles.todPromptText}>
                  {todTab === 'truth'
                    ? ALL_SPICY_TRUTHS[todIndex % ALL_SPICY_TRUTHS.length]
                    : ALL_SPICY_DARES[todIndex % ALL_SPICY_DARES.length]}
                </Text>
                <Text style={styles.todHint}>
                  {todCardFlipped
                    ? `Active player: ${todTurn === 'user' ? userName : partnerName} must complete!`
                    : 'Tap card to flip • 100+ Deck variations'}
                </Text>
              </TouchableOpacity>

              {/* Action Buttons: Custom Question & Written Answer */}
              <View style={styles.spicyActionRow}>
                <TouchableOpacity
                  style={styles.spicyActionBtn}
                  onPress={() => {
                    setCustomPromptCategory(todTab);
                    setIsCustomModalOpen(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={15} color="#FF6584" style={{ marginRight: 5 }} />
                  <Text style={styles.spicyActionText}>
                    Custom {todTab === 'truth' ? 'Truth' : 'Dare'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.spicyActionBtn}
                  onPress={() => setShowAnswerInput(!showAnswerInput)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={15} color="#FF6584" style={{ marginRight: 5 }} />
                  <Text style={styles.spicyActionText}>
                    {showAnswerInput ? 'Hide Answer' : 'Type Answer'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Text Answer Input Section */}
              {showAnswerInput && (
                <View style={styles.spicyAnswerContainer}>
                  <Text style={styles.spicyAnswerTitle}>
                    ✍️ {todTurn === 'user' ? userName : partnerName}'s Text Response:
                  </Text>
                  <TextInput
                    style={styles.spicyAnswerInput}
                    placeholder={`Type your spicy response or confession...`}
                    placeholderTextColor="#8B6A8E"
                    value={answerInputText}
                    onChangeText={setAnswerInputText}
                    multiline
                  />
                  <TouchableOpacity
                    style={styles.spicyAnswerSubmitBtn}
                    onPress={() => {
                      const promptKey = `spicy-tod-${todTab}-${todIndex}`;
                      handleSaveTextAnswer(promptKey);
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="send" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
                    <Text style={styles.spicyAnswerSubmitText}>Save & Reveal Confession</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Display Saved Answer if available */}
              {savedAnswers[`spicy-tod-${todTab}-${todIndex}`] && (
                <View style={styles.spicySavedAnswerCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons name="heart" size={13} color="#FF2A6D" style={{ marginRight: 5 }} />
                    <Text style={styles.spicySavedAnswerHeader}>
                      {todTurn === 'user' ? userName : partnerName}'s Written Confession:
                    </Text>
                  </View>
                  <Text style={styles.spicySavedAnswerBody}>
                    "{savedAnswers[`spicy-tod-${todTab}-${todIndex}`]}"
                  </Text>
                </View>
              )}

              {/* Next Card & Turn Controls */}
              <View style={styles.spicyFooterRow}>
                <TouchableOpacity
                  style={[styles.bigSpinBtn, { flex: 1, marginRight: 8 }]}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    } catch {}
                    setTodIndex((prev) => prev + 1);
                    setTodCardFlipped(false);
                    setShowAnswerInput(false);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.bigSpinBtnText}>NEXT CARD ➔</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.spicyShuffleNextBtn}
                  onPress={handleShuffleTodTurn}
                  activeOpacity={0.85}
                >
                  <Ionicons name="shuffle" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: DIRTY NEVER HAVE I EVER                         */}
      {/* ======================================================== */}
      <Modal visible={activeGame === 'dirty_nhie'} animationType="slide">
        <View style={styles.modalFullContainer}>
          <SpicyDarkGradientBg style={StyleSheet.absoluteFill} />
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalTopHeader}>
              <TouchableOpacity
                style={styles.modalBackBtn}
                onPress={() => setActiveGame(null)}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>DIRTY NEVER HAVE I EVER</Text>
              <View style={{ width: 36 }} />
            </View>

            {/* Turn Shuffler */}
            <View style={styles.duoSpicyTurnBar}>
              <View style={styles.duoTurnLeft}>
                <Text style={styles.duoTurnLabel}>CONFESSOR:</Text>
                <View
                  style={[
                    styles.duoTurnBadge,
                    nhieTurn === 'user' ? styles.duoTurnBadgeUser : styles.duoTurnBadgePartner,
                  ]}
                >
                  <Text
                    style={[
                      styles.duoTurnBadgeText,
                      { color: nhieTurn === 'user' ? '#FF2A6D' : '#C084FC' },
                    ]}
                  >
                    {nhieTurn === 'user' ? `${userName} (You)` : partnerName}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.shuffleBtn, isShufflingNhie && styles.shuffleBtnDisabled]}
                onPress={handleShuffleNhieTurn}
                disabled={isShufflingNhie}
                activeOpacity={0.8}
              >
                <Ionicons name="shuffle" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.shuffleBtnText}>
                  {isShufflingNhie ? 'Picking...' : 'Shuffle Turn'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 40 }}>
              <View style={styles.nhieCard}>
                <Text style={styles.nhieEmojiHeader}>
                  🍒 CONFESSION #{((nhieIndex) % ALL_SPICY_NHIE.length) + 1} OF {ALL_SPICY_NHIE.length}
                </Text>
                <Text style={styles.nhiePrompt}>
                  "{ALL_SPICY_NHIE[nhieIndex % ALL_SPICY_NHIE.length]}"
                </Text>
              </View>

              {/* Duo Two-Player Voting Section */}
              <View style={styles.duoVotingBox}>
                <Text style={styles.duoVotingHeader}>TWO-PLAYER CONFESSION VOTES</Text>

                {/* Player 1: User Vote */}
                <View style={styles.duoVotePlayerRow}>
                  <Text style={styles.duoVotePlayerLabel}>{userName} (You):</Text>
                  <View style={styles.nhieVoteBtnGroup}>
                    <TouchableOpacity
                      style={[
                        styles.nhieSmallVoteBtn,
                        nhieUserVote === 'have' && styles.nhieVoteActive,
                      ]}
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
                      style={[
                        styles.nhieSmallVoteBtn,
                        nhieUserVote === 'never' && styles.nhieVoteActive,
                      ]}
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
                </View>

                {/* Player 2: Partner Vote */}
                <View style={styles.duoVotePlayerRow}>
                  <Text style={styles.duoVotePlayerLabel}>{partnerName}:</Text>
                  <View style={styles.nhieVoteBtnGroup}>
                    <TouchableOpacity
                      style={[
                        styles.nhieSmallVoteBtn,
                        nhiePartnerVote === 'have' && styles.nhieVoteActivePartner,
                      ]}
                      onPress={() => {
                        setNhiePartnerVote('have');
                        try {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch {}
                      }}
                    >
                      <Text style={styles.nhieVoteText}>I HAVE 🍷</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.nhieSmallVoteBtn,
                        nhiePartnerVote === 'never' && styles.nhieVoteActivePartner,
                      ]}
                      onPress={() => {
                        setNhiePartnerVote('never');
                        try {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        } catch {}
                      }}
                    >
                      <Text style={styles.nhieVoteText}>NEVER 😇</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Reveal Match / Comparison Banner */}
              {nhieUserVote && nhiePartnerVote && (
                <View style={styles.nhieComparisonBanner}>
                  {nhieUserVote === 'have' && nhiePartnerVote === 'have' ? (
                    <Text style={styles.nhieComparisonText}>
                      🔥 BOTH OF YOU HAVE! Take a sip together & spill the juicy story!
                    </Text>
                  ) : nhieUserVote === 'never' && nhiePartnerVote === 'never' ? (
                    <Text style={styles.nhieComparisonText}>
                      😇 BOTH INNOCENT ANGELS! Neither of you has ever done this!
                    </Text>
                  ) : (
                    <Text style={styles.nhieComparisonText}>
                      👀 ONE HAS, ONE HASN'T!{' '}
                      {nhieUserVote === 'have' ? userName : partnerName} must tell the confession story!
                    </Text>
                  )}
                </View>
              )}

              {/* Action Buttons: Custom Statement & Written Story */}
              <View style={styles.spicyActionRow}>
                <TouchableOpacity
                  style={styles.spicyActionBtn}
                  onPress={() => {
                    setCustomPromptCategory('nhie');
                    setIsCustomModalOpen(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={15} color="#FF6584" style={{ marginRight: 5 }} />
                  <Text style={styles.spicyActionText}>Custom Statement</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.spicyActionBtn}
                  onPress={() => setShowAnswerInput(!showAnswerInput)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={15} color="#FF6584" style={{ marginRight: 5 }} />
                  <Text style={styles.spicyActionText}>
                    {showAnswerInput ? 'Hide Story' : 'Write Story'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Text Story Input */}
              {showAnswerInput && (
                <View style={styles.spicyAnswerContainer}>
                  <Text style={styles.spicyAnswerTitle}>
                    ✍️ {nhieTurn === 'user' ? userName : partnerName}'s Confession Story:
                  </Text>
                  <TextInput
                    style={styles.spicyAnswerInput}
                    placeholder="Tell the full story of what happened..."
                    placeholderTextColor="#8B6A8E"
                    value={answerInputText}
                    onChangeText={setAnswerInputText}
                    multiline
                  />
                  <TouchableOpacity
                    style={styles.spicyAnswerSubmitBtn}
                    onPress={() => {
                      const promptKey = `spicy-nhie-${nhieIndex}`;
                      handleSaveTextAnswer(promptKey);
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="send" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
                    <Text style={styles.spicyAnswerSubmitText}>Save Confession Story</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Display Saved Story */}
              {savedAnswers[`spicy-nhie-${nhieIndex}`] && (
                <View style={styles.spicySavedAnswerCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons name="wine" size={13} color="#FF2A6D" style={{ marginRight: 5 }} />
                    <Text style={styles.spicySavedAnswerHeader}>
                      {nhieTurn === 'user' ? userName : partnerName}'s Confession Story:
                    </Text>
                  </View>
                  <Text style={styles.spicySavedAnswerBody}>
                    "{savedAnswers[`spicy-nhie-${nhieIndex}`]}"
                  </Text>
                </View>
              )}

              {/* Next Question Control */}
              <View style={styles.spicyFooterRow}>
                <TouchableOpacity
                  style={[styles.bigSpinBtn, { flex: 1, marginRight: 8 }]}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    } catch {}
                    setNhieIndex((prev) => prev + 1);
                    setNhieUserVote(null);
                    setNhiePartnerVote(null);
                    setShowAnswerInput(false);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.bigSpinBtnText}>NEXT CONFESSION ➔</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.spicyShuffleNextBtn}
                  onPress={handleShuffleNhieTurn}
                  activeOpacity={0.85}
                >
                  <Ionicons name="shuffle" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: HOT TRIVIA                                      */}
      {/* ======================================================== */}
      <Modal visible={activeGame === 'hot_trivia'} animationType="slide">
        <View style={styles.modalFullContainer}>
          <SpicyDarkGradientBg style={StyleSheet.absoluteFill} />
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

            <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 40 }}>
              <View style={styles.triviaCard}>
                <Text style={styles.triviaCardTag}>
                  INTIMACY QUESTION #{((triviaIndex) % HOT_TRIVIA_QUESTIONS.length) + 1} OF {HOT_TRIVIA_QUESTIONS.length}
                </Text>
                <Text style={styles.triviaQuestion}>
                  "{HOT_TRIVIA_QUESTIONS[triviaIndex % HOT_TRIVIA_QUESTIONS.length].q}"
                </Text>
              </View>

              {/* Duo Guess & Verdict Row */}
              <View style={styles.duoVotingBox}>
                <Text style={styles.duoVotingHeader}>
                  DID {userName} GUESS {partnerName.toUpperCase()}'S DESIRE CORRECTLY?
                </Text>
                <View style={styles.triviaAnswersRow}>
                  <TouchableOpacity
                    style={[
                      styles.triviaBtn,
                      { backgroundColor: '#3A004C' },
                      triviaUserChoice === 0 && { borderColor: '#FF2A6D', borderWidth: 2 },
                    ]}
                    onPress={() => {
                      setTriviaUserChoice(0);
                      setRevealedTrivia(true);
                      try {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                      } catch {}
                    }}
                  >
                    <Text style={styles.triviaBtnText}>WRONG ❌</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.triviaBtn,
                      { backgroundColor: '#FF1E56' },
                      triviaUserChoice === 1 && { borderColor: '#FFFFFF', borderWidth: 2 },
                    ]}
                    onPress={() => {
                      setTriviaUserChoice(1);
                      setRevealedTrivia(true);
                      try {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      } catch {}
                    }}
                  >
                    <Text style={styles.triviaBtnText}>CORRECT ✅</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {revealedTrivia && (
                <View style={styles.nhieComparisonBanner}>
                  <Text style={styles.nhieComparisonText}>
                    {triviaUserChoice === 1
                      ? `🎉 Perfect Intimacy Match! ${userName} knows ${partnerName}'s heart deeply!`
                      : `💕 Intimate Discovery! ${partnerName} revealed something new for you to explore together!`}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.bigSpinBtn, { marginTop: 24 }]}
                onPress={() => {
                  setTriviaIndex((prev) => (prev + 1) % HOT_TRIVIA_QUESTIONS.length);
                  setTriviaUserChoice(null);
                  setRevealedTrivia(false);
                }}
              >
                <Text style={styles.bigSpinBtnText}>NEXT INTIMACY QUESTION ➔</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 4: DUO LOBBY & INVITE MODAL                         */}
      {/* ======================================================== */}
      <Modal visible={isInviteModalOpen} transparent animationType="fade">
        <View style={styles.darkModalOverlay}>
          <View style={styles.darkGameModalCard}>
            <View style={styles.darkModalTopRow}>
              <View>
                <Text style={styles.darkModalTitle}>Spicy Duo Lounge 🎮</Text>
                <Text style={styles.darkModalSubtitle}>Match Room & In-Game Invites</Text>
              </View>
              <TouchableOpacity onPress={() => setIsInviteModalOpen(false)}>
                <Ionicons name="close" size={22} color="#C4B4BA" />
              </TouchableOpacity>
            </View>

            {/* Status or Toast Feedback */}
            {(gameJoinStatus || inviteSentStatus) && (
              <View style={styles.darkGameToastBanner}>
                <Ionicons name="flame" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.darkGameToastText}>{gameJoinStatus || inviteSentStatus}</Text>
              </View>
            )}

            {/* 1. Dedicated Match Room Code */}
            <View style={styles.darkInviteBox}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <Text style={styles.darkInviteLabel}>SPICY MATCH ROOM CODE 🔥</Text>
                <TouchableOpacity
                  style={styles.darkNewCodePill}
                  onPress={handleGenerateNewGameCode}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh" size={11} color="#FF2A6D" />
                  <Text style={styles.darkNewCodePillText}>New Code</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.darkInviteRow}>
                <Text style={styles.darkInviteCodeText}>{duoState?.gameRoomCode || 'GAME-7824'}</Text>
                <TouchableOpacity
                  style={styles.darkCopyBtn}
                  onPress={handleCopyGameCode}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={inviteCopied ? 'checkmark' : 'copy'}
                    size={14}
                    color="#FFFFFF"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.darkCopyBtnText}>
                    {inviteCopied ? 'Copied! ✨' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. Join via Code with PASTE option */}
            <View style={styles.darkJoinCodeBox}>
              <Text style={styles.darkJoinCodeLabel}>ENTER / PASTE PARTNER'S CODE TO JOIN</Text>
              <View style={styles.darkJoinInputRow}>
                <TextInput
                  style={styles.darkJoinTextInput}
                  placeholder="e.g. GAME-7824"
                  placeholderTextColor="#7F556E"
                  value={gameCodeInput}
                  onChangeText={setGameCodeInput}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={styles.darkPasteCodeBtn}
                  onPress={handlePasteGameCode}
                  activeOpacity={0.75}
                >
                  <Ionicons name="clipboard-outline" size={14} color="#FF2A6D" />
                  <Text style={styles.darkPasteCodeBtnText}>Paste</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.darkJoinSubmitBtn}
                  onPress={handleJoinGameRoom}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                  <Text style={styles.darkJoinSubmitBtnText}>Join</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 3. COD Mobile / Free Fire Style In-Game Invite Box */}
            <View style={styles.darkInGameInviteCard}>
              <View style={styles.darkInGamePartnerRow}>
                <View style={styles.darkInGameAvatarCircle}>
                  <Text style={{ fontSize: 18 }}>🔥</Text>
                  <View
                    style={[
                      styles.darkOnlineDot,
                      { backgroundColor: isPartnerConnected ? '#10B981' : '#F59E0B' },
                    ]}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.darkInGamePartnerName}>{partnerName}</Text>
                  <Text style={styles.darkInGamePartnerStatus}>
                    {isPartnerConnected ? '🟢 In Spicy Room' : '⏳ Ready for Game Invite'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.darkInGameInviteBtn}
                  onPress={handleSendInGameInvite}
                  activeOpacity={0.8}
                >
                  <Ionicons name="person-add" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.darkInGameInviteBtnText}>Invite</Text>
                </TouchableOpacity>
              </View>

              {/* Simulate Receive In-Game Invite Button */}
              <TouchableOpacity
                style={styles.darkSimulateIncomingBtn}
                onPress={handleSimulateReceiveInvite}
                activeOpacity={0.75}
              >
                <Ionicons name="notifications-outline" size={13} color="#FF6584" style={{ marginRight: 5 }} />
                <Text style={styles.darkSimulateIncomingText}>
                  Simulate In-Game Invite from {partnerName} (Pop-up Test)
                </Text>
              </TouchableOpacity>
            </View>

            {/* 4. Live Connection Card */}
            <TouchableOpacity
              style={[
                styles.darkStatusCard,
                isPartnerConnected ? styles.darkStatusConnected : styles.darkStatusWaiting,
              ]}
              onPress={handleTogglePartnerConnect}
              activeOpacity={0.85}
            >
              <Ionicons
                name={isPartnerConnected ? 'checkmark-circle' : 'hourglass-outline'}
                size={24}
                color={isPartnerConnected ? '#10B981' : '#F59E0B'}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.darkStatusTitle}>
                  {isPartnerConnected ? `🟢 ${partnerName} is in Room!` : `⏳ Waiting for ${partnerName}`}
                </Text>
                <Text style={styles.darkStatusDesc}>
                  {isPartnerConnected
                    ? 'Both players connected in spicy room. Shuffles and confession votes are active! (Tap to toggle)'
                    : `Invite ${partnerName} or share match code above to play together. (Tap to toggle)`}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Permanent Account Link Note */}
            <View style={styles.darkPermanentAccountNotice}>
              <Ionicons name="link-outline" size={13} color="#9CA3AF" style={{ marginRight: 6 }} />
              <Text style={styles.darkPermanentAccountNoticeText}>
                Permanent Account Link: <Text style={{ fontWeight: '700', color: '#FFB8C6' }}>{duoState?.inviteCode || 'PAIR-7729'}</Text> (linked on login)
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.bigSpinBtn, { width: '100%', marginTop: 12 }]}
              onPress={() => setIsInviteModalOpen(false)}
            >
              <Text style={styles.bigSpinBtnText}>Close & Play ✨</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ----------------- SPICY IN-GAME INVITE POP-UP (COD / FREE FIRE STYLE) ----------------- */}
      <Modal visible={!!pendingInvitePopup} transparent animationType="slide">
        <View style={styles.darkModalOverlay}>
          <View style={styles.darkInvitePopupCard}>
            <View style={styles.darkInvitePopupIconBadge}>
              <Ionicons name="flame" size={32} color="#FF2A6D" />
            </View>
            <Text style={styles.darkInvitePopupHeader}>Spicy Game Invite! 🔥</Text>
            <Text style={styles.darkInvitePopupBody}>
              <Text style={{ fontWeight: '800', color: '#FF2A6D' }}>
                {pendingInvitePopup?.fromName}
              </Text>{' '}
              invited you to join{' '}
              <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>
                {pendingInvitePopup?.gameTitle}
              </Text>
              !
            </Text>

            <View style={styles.darkPopupRoomCodePill}>
              <Text style={styles.darkPopupRoomCodeLabel}>MATCH ROOM:</Text>
              <Text style={styles.darkPopupRoomCodeValue}>
                {pendingInvitePopup?.gameRoomCode}
              </Text>
            </View>

            <View style={styles.darkInvitePopupActionsRow}>
              <TouchableOpacity
                style={styles.darkPopupDeclineBtn}
                onPress={handleDeclineInvite}
                activeOpacity={0.8}
              >
                <Text style={styles.darkPopupDeclineBtnText}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.darkPopupAcceptBtn}
                onPress={handleAcceptInvite}
                activeOpacity={0.8}
              >
                <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.darkPopupAcceptBtnText}>Accept & Join 🔥</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 5: CUSTOM PROMPT CREATION                           */}
      {/* ======================================================== */}
      <Modal visible={isCustomModalOpen} transparent animationType="slide">
        <View style={styles.darkModalOverlay}>
          <View style={styles.darkGameModalCard}>
            <View style={styles.darkModalTopRow}>
              <View>
                <Text style={styles.darkModalTitle}>Create Custom Prompt ✍️</Text>
                <Text style={styles.darkModalSubtitle}>
                  Add your own prompt for {partnerName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsCustomModalOpen(false)}>
                <Ionicons name="close" size={22} color="#C4B4BA" />
              </TouchableOpacity>
            </View>

            {/* Type selector */}
            <View style={styles.todTabsRow}>
              <TouchableOpacity
                style={[styles.todTabBtn, customPromptCategory === 'truth' && styles.todTabActive]}
                onPress={() => setCustomPromptCategory('truth')}
              >
                <Text style={styles.todTabText}>Truth 💭</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.todTabBtn, customPromptCategory === 'dare' && styles.todTabActive]}
                onPress={() => setCustomPromptCategory('dare')}
              >
                <Text style={styles.todTabText}>Dare 🌶️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.todTabBtn, customPromptCategory === 'nhie' && styles.todTabActive]}
                onPress={() => setCustomPromptCategory('nhie')}
              >
                <Text style={styles.todTabText}>Never Have I 🍒</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.darkInputLabel}>
              Your Custom {customPromptCategory.toUpperCase()} Prompt:
            </Text>
            <TextInput
              style={styles.darkTextInput}
              placeholder={
                customPromptCategory === 'truth'
                  ? 'e.g. What is one fantasy you have always wanted to try?'
                  : customPromptCategory === 'dare'
                  ? 'e.g. Whisper your naughtiest secret in my ear for 20 seconds...'
                  : 'e.g. Never have I ever wanted to kiss you in the kitchen...'
              }
              placeholderTextColor="#8B6A8E"
              value={customPromptInput}
              onChangeText={setCustomPromptInput}
              multiline
            />

            <TouchableOpacity
              style={[styles.bigSpinBtn, { width: '100%', marginTop: 16 }]}
              onPress={handleSaveCustomPrompt}
              activeOpacity={0.85}
            >
              <Text style={styles.bigSpinBtnText}>ADD TO SPICY DECK ✨</Text>
            </TouchableOpacity>
          </View>
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerChiliEmblem: {
    width: 20,
    height: 20,
    transform: [{ rotate: '-12deg' }],
  },
  headerTitle: {
    fontFamily: AppFonts.title,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  duoHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 42, 109, 0.4)',
  },
  duoHeaderDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  duoHeaderPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  duoPresenceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(45, 8, 58, 0.7)',
    marginHorizontal: 14,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 42, 109, 0.3)',
  },
  duoPresenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  duoPresenceDot: {
    fontSize: 10,
    marginRight: 6,
  },
  duoPresenceText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginRight: 8,
  },
  duoOnlineTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  duoOnlineTagText: {
    color: '#34D399',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  duoRoomActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  duoRoomActionText: {
    color: '#FF6584',
    fontSize: 12,
    fontWeight: '700',
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
    paddingVertical: 24,
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
  cardIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
    fontSize: 9.5,
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
  duoSpicyTurnBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(45, 8, 58, 0.8)',
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 42, 109, 0.35)',
    marginBottom: 10,
  },
  duoTurnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  duoTurnLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C79CB4',
    marginRight: 6,
    letterSpacing: 0.5,
  },
  duoTurnBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  duoTurnBadgeUser: {
    backgroundColor: 'rgba(255, 42, 109, 0.25)',
  },
  duoTurnBadgePartner: {
    backgroundColor: 'rgba(192, 132, 252, 0.25)',
  },
  duoTurnBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  shuffleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF2A6D',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  shuffleBtnDisabled: {
    opacity: 0.6,
  },
  shuffleBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
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
  bigSpinBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 1.5,
  },

  // Truth or Dare
  todTabsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 10,
  },
  todTabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
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
    fontSize: 12,
    letterSpacing: 0.5,
  },
  todTabTextActive: {
    color: '#FFFFFF',
  },
  todCard: {
    width: '90%',
    minHeight: 200,
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
    marginVertical: 10,
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
    fontSize: 11,
    color: '#C79CB4',
    marginTop: 16,
    textAlign: 'center',
  },
  spicyActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  spicyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 101, 132, 0.3)',
  },
  spicyActionText: {
    color: '#FF6584',
    fontSize: 12,
    fontWeight: '800',
  },
  spicyAnswerContainer: {
    width: '90%',
    backgroundColor: 'rgba(45, 8, 58, 0.85)',
    borderRadius: 16,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#FF2A6D',
  },
  spicyAnswerTitle: {
    color: '#FFBAC8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  spicyAnswerInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: '#FFFFFF',
    minHeight: 50,
  },
  spicyAnswerSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF1E56',
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 8,
  },
  spicyAnswerSubmitText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  spicySavedAnswerCard: {
    width: '90%',
    backgroundColor: 'rgba(70, 10, 85, 0.7)',
    borderRadius: 14,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#FF6584',
  },
  spicySavedAnswerHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF6584',
  },
  spicySavedAnswerBody: {
    fontSize: 13,
    color: '#FFFFFF',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  spicyFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    marginTop: 14,
  },
  spicyShuffleNextBtn: {
    backgroundColor: '#8B5CF6',
    padding: 14,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Never Have I Ever
  nhieCard: {
    width: '90%',
    backgroundColor: 'rgba(55, 10, 75, 0.85)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF2A6D',
    marginVertical: 10,
  },
  nhieEmojiHeader: {
    fontSize: 11,
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
  duoVotingBox: {
    width: '90%',
    backgroundColor: 'rgba(45, 8, 58, 0.7)',
    borderRadius: 18,
    padding: 14,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 42, 109, 0.3)',
  },
  duoVotingHeader: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FF6584',
    letterSpacing: 1,
    marginBottom: 10,
    textAlign: 'center',
  },
  duoVotePlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  duoVotePlayerLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    width: '32%',
  },
  nhieVoteBtnGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  nhieSmallVoteBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  nhieVoteActive: {
    backgroundColor: '#FF1E56',
    borderColor: '#FF1E56',
  },
  nhieVoteActivePartner: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  nhieVoteText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11.5,
  },
  nhieComparisonBanner: {
    width: '90%',
    backgroundColor: 'rgba(255, 30, 86, 0.25)',
    borderRadius: 14,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#FF2A6D',
  },
  nhieComparisonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Trivia
  triviaCard: {
    width: '90%',
    backgroundColor: 'rgba(55, 10, 75, 0.85)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF2A6D',
    marginVertical: 10,
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
  triviaOptionsList: {
    width: '90%',
    gap: 10,
    marginTop: 8,
  },
  triviaOptionBtn: {
    backgroundColor: 'rgba(45, 8, 58, 0.8)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  triviaOptionBtnPicked: {
    backgroundColor: '#FF1E56',
    borderColor: '#FF1E56',
  },
  triviaOptionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  triviaOptionTextPicked: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  triviaAnswersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 10,
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

  // Dark Modals
  darkModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  darkGameModalCard: {
    width: '100%',
    backgroundColor: '#1E0A2A',
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: '#FF2A6D',
  },
  darkModalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  darkModalTitle: {
    fontFamily: AppFonts.title,
    fontSize: 18,
    color: '#FFFFFF',
  },
  darkModalSubtitle: {
    fontSize: 12,
    color: '#C79CB4',
    marginTop: 2,
  },
  darkInviteBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 14,
    marginVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 42, 109, 0.4)',
  },
  darkInviteLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FF6584',
    letterSpacing: 1,
    marginBottom: 6,
  },
  darkInviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
  },
  darkInviteCodeText: {
    fontFamily: AppFonts.title,
    fontSize: 24,
    color: '#FF2A6D',
    letterSpacing: 2,
  },
  darkCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF1E56',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  darkCopyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  darkStatusCard: {
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 8,
    borderWidth: 1.5,
  },
  darkStatusConnected: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  darkStatusWaiting: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#F59E0B',
  },
  darkStatusTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  darkStatusDesc: {
    fontSize: 11.5,
    color: '#C79CB4',
    lineHeight: 16,
  },
  darkToggleBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    marginVertical: 6,
  },
  darkToggleBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  darkInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFBAC8',
    marginBottom: 6,
    marginTop: 6,
  },
  darkTextInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#FFFFFF',
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },

  // SPICY MATCH ROOM & IN-GAME INVITE STYLES
  darkGameToastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF1E56',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 6,
  },
  darkGameToastText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  darkNewCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 42, 109, 0.2)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 42, 109, 0.4)',
  },
  darkNewCodePillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FF6584',
  },
  darkJoinCodeBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 42, 109, 0.3)',
  },
  darkJoinCodeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF88A3',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  darkJoinInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  darkJoinTextInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 42, 109, 0.4)',
  },
  darkPasteCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 42, 109, 0.25)',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 42, 109, 0.45)',
  },
  darkPasteCodeBtnText: {
    color: '#FF6584',
    fontWeight: '700',
    fontSize: 12,
  },
  darkJoinSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF1E56',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 4,
  },
  darkJoinSubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5,
  },
  darkInGameInviteCard: {
    backgroundColor: 'rgba(60, 10, 80, 0.7)',
    borderRadius: 16,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 42, 109, 0.4)',
  },
  darkInGamePartnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  darkInGameAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: '#FF2A6D',
  },
  darkOnlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
    bottom: -1,
    right: -1,
    borderWidth: 1.5,
    borderColor: '#1E0A2A',
  },
  darkInGamePartnerName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  darkInGamePartnerStatus: {
    fontSize: 11,
    color: '#C79CB4',
    fontWeight: '500',
    marginTop: 1,
  },
  darkInGameInviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  darkInGameInviteBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  darkSimulateIncomingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 42, 109, 0.4)',
  },
  darkSimulateIncomingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6584',
  },
  darkPermanentAccountNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 9,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  darkPermanentAccountNoticeText: {
    fontSize: 11,
    color: '#9CA3AF',
    flex: 1,
    lineHeight: 15,
  },

  // FLOATING SPICY IN-GAME INVITE POP-UP
  darkInvitePopupCard: {
    width: '88%',
    backgroundColor: '#1E0A2A',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#FF2A6D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#FF2A6D',
  },
  darkInvitePopupIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 42, 109, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#FF2A6D',
  },
  darkInvitePopupHeader: {
    fontFamily: AppFonts.title,
    fontSize: 22,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  darkInvitePopupBody: {
    fontSize: 13.5,
    color: '#E0C7D5',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 14,
  },
  darkPopupRoomCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 18,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 42, 109, 0.3)',
  },
  darkPopupRoomCodeLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FF6584',
    letterSpacing: 0.5,
  },
  darkPopupRoomCodeValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  darkInvitePopupActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  darkPopupDeclineBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  darkPopupDeclineBtnText: {
    color: '#C79CB4',
    fontWeight: '700',
    fontSize: 13,
  },
  darkPopupAcceptBtn: {
    flex: 1.4,
    flexDirection: 'row',
    backgroundColor: '#FF1E56',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF1E56',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 4,
  },
  darkPopupAcceptBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13.5,
  },
});

export default SpicyGamesLounge;
