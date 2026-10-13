import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AppColors from '../theme/AppColors';
import AppFonts from '../theme/AppFonts';
import FallingHeartsBackground from '../components/FallingHeartsBackground';
import StorageService, { ChatMessage, CoupleProfile } from '../services/StorageService';
import RealtimeService from '../services/RealtimeService';

interface ChatScreenProps {
  onOpenPairing: () => void;
  onOpenDoodle: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ onOpenPairing, onOpenDoodle }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [profile, setProfile] = useState<CoupleProfile | null>(null);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const partnerNameRef = useRef('Partner');

  useEffect(() => {
    partnerNameRef.current = profile?.partnerName || 'Partner';
  }, [profile?.partnerName]);

  useEffect(() => {
    const loadChat = async () => {
      const prof = await StorageService.getProfile();
      const msgs = await StorageService.getMessages();
      setProfile(prof);
      setMessages(msgs);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 300);
    };

    loadChat();

    // Listen to real-time incoming messages
    const unsubMsg = RealtimeService.on('message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });

    const unsubNudge = RealtimeService.on('nudge', (nudgeData) => {
      const nudgeMsg: ChatMessage = {
        id: `nudge-${Date.now()}`,
        sender: 'partner',
        type: 'nudge',
        text: nudgeData.text || `${partnerNameRef.current} sent you a warm squeeze! 💕`,
        timestamp: Date.now(),
        status: 'read',
      };
      setMessages((prev) => [...prev, nudgeMsg]);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });

    return () => {
      unsubMsg();
      unsubNudge();
    };
  }, []);

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      type: 'text',
      text: inputText.trim(),
      timestamp: Date.now(),
      status: 'delivered',
    };

    const updated = [...messages, newMsg];
    setMessages(updated);
    await StorageService.saveMessages(updated);
    await RealtimeService.broadcastMessage(newMsg);
    setInputText('');
    scrollToBottom();

    // Simulate partner typing response after user sends message
    setTimeout(() => {
      setIsPartnerTyping(true);
      scrollToBottom();
      setTimeout(async () => {
        setIsPartnerTyping(false);
        const partnerReplies = [
          'Aww love you so much sweetheart! 🥰',
          'Counting down the minutes until I see you today! 💕',
          'You just made my whole day brighter! ✨',
          'Sending you the warmest biggest hug right now! 🤗',
        ];
        const randomReply = partnerReplies[Math.floor(Math.random() * partnerReplies.length)];
        const replyMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          sender: 'partner',
          type: 'text',
          text: randomReply,
          timestamp: Date.now(),
          status: 'read',
        };
        const withReply = [...updated, replyMsg];
        setMessages(withReply);
        await StorageService.saveMessages(withReply);
        scrollToBottom();
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }, 2000);
    }, 1200);
  };

  const handleSendVoiceNote = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    const voiceMsg: ChatMessage = {
      id: `voice-${Date.now()}`,
      sender: 'user',
      type: 'voice',
      voiceSeconds: 6,
      timestamp: Date.now(),
      status: 'delivered',
    };
    const updated = [...messages, voiceMsg];
    setMessages(updated);
    await StorageService.saveMessages(updated);
    await RealtimeService.broadcastMessage(voiceMsg);
    scrollToBottom();
  };

  const toggleVoicePlay = (id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (playingVoiceId === id) {
      setPlayingVoiceId(null);
    } else {
      setPlayingVoiceId(id);
      setTimeout(() => setPlayingVoiceId(null), 6000);
    }
  };

  return (
    <LinearGradient colors={['#FCE8EC', '#FFF7F8']} style={styles.gradientContainer}>
      <FallingHeartsBackground />
      <SafeAreaView style={styles.safeArea}>
        {/* Chat Top Header */}
        <View style={styles.headerRow}>
          <View style={styles.partnerInfoRow}>
            <View style={styles.avatarWrapper}>
              {profile?.partnerAvatar ? (
                <Image
                  source={{ uri: profile.partnerAvatar }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.partnerAvatarFallback}>
                  <Text style={styles.partnerAvatarInitial}>
                    {profile?.partnerName ? profile.partnerName.charAt(0).toUpperCase() : 'P'}
                  </Text>
                </View>
              )}
              {profile?.isPaired && <View style={styles.onlineBadge} />}
            </View>

            <View style={styles.partnerTextCol}>
              <Text style={styles.partnerName}>
                {profile?.isPaired ? profile.partnerName : 'Your Partner'}
              </Text>
              <Text style={styles.partnerStatus}>
                {profile?.isPaired
                  ? isPartnerTyping
                    ? 'Typing... 💕'
                    : 'Active now'
                  : 'Not paired yet'}
              </Text>
            </View>
          </View>

          {/* Quick Actions in Header */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={onOpenDoodle}
              activeOpacity={0.7}
            >
              <Ionicons name="brush" size={18} color={AppColors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pairingCodeChip}
              onPress={onOpenPairing}
              activeOpacity={0.7}
            >
              <Ionicons name="key" size={13} color={AppColors.primary} />
              <Text style={styles.pairingCodeText}>{profile?.inviteCode || 'LOVE-77'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages Stream */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Romantic end-to-end encrypted pill */}
            <View style={styles.securityPill}>
              <Ionicons name="lock-closed" size={12} color={AppColors.textSecondary} />
              <Text style={styles.securityText}>Private & end-to-end encrypted for couple only</Text>
            </View>

            {messages.length === 0 && (
              <View style={styles.emptyChatBox}>
                <View style={styles.emptyChatIconCircle}>
                  <Ionicons name="chatbubble-ellipses-outline" size={32} color={AppColors.primary} />
                </View>
                <Text style={styles.emptyChatTitle}>No messages yet</Text>
                <Text style={styles.emptyChatSubtitle}>
                  Send a sweet note, voice note, or love nudge to start your conversation with {profile?.isPaired ? profile.partnerName : 'your partner'}! 💕
                </Text>
              </View>
            )}

            {messages.map((m) => {
              const isMe = m.sender === 'user';
              return (
                <View
                  key={m.id}
                  style={[
                    styles.messageRow,
                    isMe ? styles.messageRowMe : styles.messageRowPartner,
                  ]}
                >
                  {/* Nudge Banner message */}
                  {m.type === 'nudge' ? (
                    <View style={styles.nudgeBubble}>
                      <Ionicons name="heart" size={16} color="#FF6575" />
                      <Text style={styles.nudgeBubbleText}>{m.text}</Text>
                    </View>
                  ) : m.type === 'voice' ? (
                    /* Voice Note Player Bubble */
                    <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubblePartner]}>
                      <TouchableOpacity
                        style={styles.voicePlayRow}
                        onPress={() => toggleVoicePlay(m.id)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.playIconCircle}>
                          <Ionicons
                            name={playingVoiceId === m.id ? 'pause' : 'play'}
                            size={16}
                            color={isMe ? AppColors.primary : '#FFFFFF'}
                          />
                        </View>
                        <View style={styles.waveformContainer}>
                          {[14, 24, 18, 30, 22, 16, 28, 20, 12].map((height, i) => (
                            <View
                              key={i}
                              style={[
                                styles.waveBar,
                                { height },
                                isMe ? styles.waveBarMe : styles.waveBarPartner,
                              ]}
                            />
                          ))}
                        </View>
                        <Text style={[styles.voiceDuration, isMe ? styles.voiceDurationMe : null]}>
                          0:0{m.voiceSeconds || 6}
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.bubbleFooter}>
                        <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>
                          {new Date(m.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                        {isMe && (
                          <Ionicons
                            name="checkmark-done"
                            size={14}
                            color={m.status === 'read' ? '#4592D9' : '#A89E9F'}
                            style={{ marginLeft: 4 }}
                          />
                        )}
                      </View>
                    </View>
                  ) : (
                    /* Standard Text Bubble */
                    <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubblePartner]}>
                      <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextPartner]}>
                        {m.text}
                      </Text>

                      <View style={styles.bubbleFooter}>
                        <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>
                          {new Date(m.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                        {isMe && (
                          <Ionicons
                            name="checkmark-done"
                            size={14}
                            color={m.status === 'read' ? '#4592D9' : '#FFE8EC'}
                            style={{ marginLeft: 4 }}
                          />
                        )}
                      </View>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Partner Typing Bubble */}
            {isPartnerTyping && (
              <View style={[styles.messageRow, styles.messageRowPartner]}>
                <View style={[styles.bubble, styles.bubblePartner, styles.typingBubble]}>
                  <Text style={styles.typingDots}>• • •</Text>
                </View>
              </View>
            )}

            <View style={{ height: 90 }} />
          </ScrollView>

          {/* Bottom Chat Input Bar */}
          <View style={styles.inputBar}>
            <TouchableOpacity
              style={styles.attachBtn}
              onPress={handleSendVoiceNote}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="microphone" size={22} color={AppColors.primary} />
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              placeholder={`Send sweet note to ${profile?.partnerName || 'Partner'}...`}
              placeholderTextColor="#B8A4AA"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSendMessage}
              returnKeyType="send"
            />

            <TouchableOpacity
              style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
              onPress={handleSendMessage}
              disabled={!inputText.trim()}
              activeOpacity={0.85}
            >
              <Ionicons name="paper-plane" size={17} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.68)',
    borderBottomWidth: 1.2,
    borderBottomColor: 'rgba(255, 255, 255, 0.95)',
  },
  partnerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    position: 'relative',
    marginRight: 10,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  onlineBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AppColors.onlineGreen,
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  partnerTextCol: {},
  partnerName: {
    fontFamily: AppFonts.title,
    fontSize: 18,
    color: AppColors.textPrimary,
  },
  partnerStatus: {
    fontSize: 11,
    color: AppColors.primary,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF2F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairingCodeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    gap: 4,
  },
  pairingCodeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: AppColors.primary,
  },
  keyboardAvoid: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  securityPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
  securityText: {
    fontSize: 11,
    color: AppColors.textSecondary,
    fontWeight: '500',
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowPartner: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  bubbleMe: {
    backgroundColor: AppColors.primary,
    borderBottomRightRadius: 6,
  },
  bubblePartner: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderBottomLeftRadius: 6,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  bubbleText: {
    fontSize: 14.5,
    lineHeight: 20,
  },
  bubbleTextMe: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  bubbleTextPartner: {
    color: AppColors.textPrimary,
    fontWeight: '500',
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  msgTime: {
    fontSize: 10,
    color: AppColors.textSecondary,
  },
  msgTimeMe: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  nudgeBubble: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 232, 236, 0.78)',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.92)',
    gap: 6,
    marginVertical: 6,
  },
  nudgeBubbleText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: AppColors.primary,
  },
  voicePlayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  playIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
  },
  waveBarMe: {
    backgroundColor: '#FFFFFF',
  },
  waveBarPartner: {
    backgroundColor: AppColors.primary,
  },
  voiceDuration: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.textSecondary,
  },
  voiceDurationMe: {
    color: '#FFFFFF',
  },
  typingBubble: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  typingDots: {
    fontSize: 18,
    color: AppColors.primary,
    fontWeight: '900',
    letterSpacing: 2,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderTopWidth: 1.2,
    borderTopColor: 'rgba(255, 255, 255, 0.95)',
    gap: 8,
    marginBottom: Platform.OS === 'ios' ? 70 : 60,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 242, 244, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.92)',
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 247, 248, 0.75)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: 14,
    color: AppColors.textPrimary,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.92)',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  partnerAvatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    backgroundColor: '#F0E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerAvatarInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: '#8F78D2',
  },
  emptyChatBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyChatIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFE8EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyChatTitle: {
    fontFamily: AppFonts.title,
    fontSize: 20,
    color: AppColors.textPrimary,
    marginBottom: 6,
  },
  emptyChatSubtitle: {
    fontSize: 13,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default ChatScreen;
