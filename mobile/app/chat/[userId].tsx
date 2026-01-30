import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, fontSize, borderRadius } from '@/theme';
import { Avatar } from '@/components/ui';
import { messageApi, userApi } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import {
  initializeSocket,
  onNewMessage,
  onUserTyping,
  onUserStopTyping,
  sendMessage as socketSendMessage,
  sendTyping,
  sendStopTyping,
} from '@/services/socket';
import { format, isToday, isYesterday } from 'date-fns';

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

interface Partner {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export default function ChatScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const theme = useTheme();
  const { user } = useAuthStore();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetchMessages();
    initializeSocket();

    const unsubscribeNewMessage = onNewMessage((message: Message) => {
      if (message.senderId === userId) {
        setMessages((prev) => [...prev, message]);
        setIsTyping(false);
      }
    });

    const unsubscribeTyping = onUserTyping((data) => {
      if (data.userId === userId) {
        setIsTyping(true);
      }
    });

    const unsubscribeStopTyping = onUserStopTyping((data) => {
      if (data.userId === userId) {
        setIsTyping(false);
      }
    });

    return () => {
      unsubscribeNewMessage?.();
      unsubscribeTyping?.();
      unsubscribeStopTyping?.();
    };
  }, [userId]);

  const fetchMessages = async () => {
    try {
      const [messagesRes, contactsRes] = await Promise.all([
        messageApi.getMessages(userId!),
        userApi.getContacts(),
      ]);

      setMessages(messagesRes.data.messages);
      const foundPartner = contactsRes.data.contacts.find(
        (c: Partner) => c.id === userId
      );
      setPartner(foundPartner);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;

    const content = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const response = await messageApi.send({
        receiverId: userId!,
        content,
      });
      setMessages((prev) => [...prev, response.data.message]);
      sendStopTyping(userId!);
    } catch (error) {
      console.error('Failed to send message:', error);
      setInputText(content);
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (text: string) => {
    setInputText(text);

    if (text.length > 0) {
      sendTyping(userId!);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        sendStopTyping(userId!);
      }, 2000);
    } else {
      sendStopTyping(userId!);
    }
  };

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    }
    if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`;
    }
    return format(date, 'MMM d, h:mm a');
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.senderId === user?.id;
    const showAvatar =
      index === 0 || messages[index - 1].senderId !== item.senderId;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        {!isOwnMessage && showAvatar && (
          <Avatar
            name={item.sender.name}
            imageUrl={item.sender.avatarUrl}
            size={32}
            style={styles.messageAvatar}
          />
        )}
        {!isOwnMessage && !showAvatar && <View style={styles.avatarPlaceholder} />}
        <View
          style={[
            styles.messageBubble,
            isOwnMessage
              ? { backgroundColor: theme.colors.secondary }
              : { backgroundColor: theme.colors.surfaceSecondary },
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isOwnMessage ? '#FFFFFF' : theme.colors.text },
            ]}
          >
            {item.content}
          </Text>
          <Text
            style={[
              styles.messageTime,
              {
                color: isOwnMessage
                  ? 'rgba(255,255,255,0.7)'
                  : theme.colors.textTertiary,
              },
            ]}
          >
            {formatMessageDate(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.secondary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: partner?.name || 'Chat',
          headerRight: () => (
            partner && (
              <Avatar
                name={partner.name}
                imageUrl={partner.avatarUrl}
                size={32}
              />
            )
          ),
        }}
      />
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {isTyping && (
          <View style={styles.typingIndicator}>
            <Text style={[styles.typingText, { color: theme.colors.textSecondary }]}>
              {partner?.name} is typing...
            </Text>
          </View>
        )}

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surfaceSecondary,
                color: theme.colors.text,
              },
            ]}
            placeholder="Type a message..."
            placeholderTextColor={theme.colors.textTertiary}
            value={inputText}
            onChangeText={handleInputChange}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  inputText.trim() && !sending
                    ? theme.colors.secondary
                    : theme.colors.border,
              },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    maxWidth: '85%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  messageAvatar: {
    marginRight: spacing.sm,
    alignSelf: 'flex-end',
  },
  avatarPlaceholder: {
    width: 32,
    marginRight: spacing.sm,
  },
  messageBubble: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    maxWidth: '100%',
  },
  messageText: {
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  messageTime: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
  },
  typingIndicator: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  typingText: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
