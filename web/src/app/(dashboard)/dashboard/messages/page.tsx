'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, Search } from 'lucide-react';
import { Card, Avatar, Input } from '@/components/ui';
import { messageApi, userApi } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  partner: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string;
  };
  lastMessage?: {
    content: string;
    createdAt: string;
    senderId: string;
  };
  unreadCount: number;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: { id: string; name: string };
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.partner.id);
    }
  }, [selectedConversation]);

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

  const fetchMessages = async (userId: string) => {
    try {
      const response = await messageApi.getMessages(userId);
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    setSending(true);
    try {
      const response = await messageApi.send({
        receiverId: selectedConversation.partner.id,
        content: newMessage.trim(),
      });
      setMessages([...messages, response.data.message]);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      <h1 className="text-2xl font-bold text-[var(--text)] mb-6">Messages</h1>

      <div className="flex gap-4 h-[calc(100%-4rem)]">
        {/* Conversations List */}
        <Card variant="outlined" className="w-80 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-[var(--border)]">
            <Input
              placeholder="Search conversations..."
              icon={<Search size={16} />}
              className="text-sm"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <MessageSquare className="text-[var(--text-tertiary)] mb-2" size={32} />
                <p className="text-sm text-[var(--text-secondary)]">No conversations yet</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.partner.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-3 flex items-start gap-3 hover:bg-[var(--surface-secondary)] transition-colors border-b border-[var(--border)] ${
                    selectedConversation?.partner.id === conv.partner.id
                      ? 'bg-[var(--surface-secondary)]'
                      : ''
                  }`}
                >
                  <Avatar name={conv.partner.name} size="md" />
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-[var(--text)] truncate">{conv.partner.name}</p>
                      {conv.lastMessage && (
                        <span className="text-xs text-[var(--text-tertiary)]">
                          {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: false })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] truncate">
                      {conv.lastMessage?.content || 'No messages yet'}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-secondary text-white rounded-full">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Chat Area */}
        <Card variant="outlined" className="flex-1 flex flex-col overflow-hidden">
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-[var(--border)] flex items-center gap-3">
                <Avatar name={selectedConversation.partner.name} size="md" />
                <div>
                  <p className="font-medium text-[var(--text)]">{selectedConversation.partner.name}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{selectedConversation.partner.role}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => {
                  const isOwn = msg.senderId !== selectedConversation.partner.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          isOwn
                            ? 'bg-secondary text-white'
                            : 'bg-[var(--surface-secondary)] text-[var(--text)]'
                        }`}
                      >
                        <p>{msg.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isOwn ? 'text-white/70' : 'text-[var(--text-tertiary)]'
                          }`}
                        >
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-[var(--border)] flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="flex-1 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:border-secondary focus:outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  className="px-4 py-2 rounded-lg bg-secondary text-white font-medium disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="mx-auto text-[var(--text-tertiary)] mb-4" size={48} />
                <p className="text-[var(--text-secondary)]">Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
