import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing, fontSize } from '@/theme';
import { Avatar, EmptyState } from '@/components/ui';
import { messageApi } from '@/services/api';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  partner: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string;
  };
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
  };
  unreadCount: number;
}

export default function MessagesScreen() {
  const theme = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = async () => {
    try {
      const response = await messageApi.getConversations();
      setConversations(response.data.conversations);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  }, []);

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={[
        styles.conversationItem,
        { borderBottomColor: theme.colors.border },
      ]}
      onPress={() => router.push(`/chat/${item.partner.id}`)}
      activeOpacity={0.7}
    >
      <Avatar name={item.partner.name} imageUrl={item.partner.avatarUrl} size={50} />
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={[styles.partnerName, { color: theme.colors.text }]}>
            {item.partner.name}
          </Text>
          {item.lastMessage && (
            <Text style={[styles.timestamp, { color: theme.colors.textTertiary }]}>
              {formatDistanceToNow(new Date(item.lastMessage.createdAt), {
                addSuffix: true,
              })}
            </Text>
          )}
        </View>
        <View style={styles.conversationFooter}>
          <Text
            style={[
              styles.lastMessage,
              {
                color: item.unreadCount > 0 ? theme.colors.text : theme.colors.textSecondary,
                fontWeight: item.unreadCount > 0 ? '600' : '400',
              },
            ]}
            numberOfLines={1}
          >
            {item.lastMessage?.content || 'No messages yet'}
          </Text>
          {item.unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: theme.colors.secondary }]}>
              <Text style={styles.unreadCount}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading conversations...
        </Text>
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <EmptyState
          icon="chatbubbles-outline"
          title="No Messages Yet"
          description="Start a conversation with your contacts."
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.partner.id}
        renderItem={renderConversation}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingVertical: spacing.sm,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: fontSize.md,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  conversationContent: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  partnerName: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: fontSize.xs,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: fontSize.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
});
