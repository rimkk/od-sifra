'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Loader2, RefreshCw, Phone, Video, MoreVertical, CheckCheck, Check } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { threadApi } from '@/lib/api';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string; avatarUrl?: string };
}

interface Thread {
  id: string;
  title?: string;
  isGroup: boolean;
  participantUsers: { id: string; name: string; avatarUrl?: string; email?: string; role?: string }[];
  messages: Message[];
}

export default function ThreadPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const threadId = params.id as string;

  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isPolling, setIsPolling] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastMessageCountRef = useRef(0);

  const fetchThread = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await threadApi.getById(threadId);
      const newThread = res.data.thread;
      
      // Only update if there are new messages to avoid re-render flicker
      if (newThread.messages.length !== lastMessageCountRef.current) {
        setThread(newThread);
        lastMessageCountRef.current = newThread.messages.length;
      } else if (!thread) {
        setThread(newThread);
      }
    } catch (error) {
      console.error('Failed to fetch thread:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [threadId, thread]);

  // Initial fetch
  useEffect(() => {
    if (threadId) {
      fetchThread(true);
    }
  }, [threadId]);

  // Polling for new messages every 3 seconds
  useEffect(() => {
    if (!threadId || !isPolling) return;

    const interval = setInterval(() => {
      fetchThread(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [threadId, isPolling, fetchThread]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [thread?.messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sending) return;

    const content = message.trim();
    setMessage('');
    setSending(true);

    // Optimistic update
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content,
      createdAt: new Date().toISOString(),
      sender: { id: user!.id, name: user!.name, avatarUrl: undefined },
    };

    setThread((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        messages: [...prev.messages, optimisticMessage],
      };
    });
    lastMessageCountRef.current++;

    try {
      const res = await threadApi.sendMessage(threadId, content);
      // Replace optimistic message with real one
      setThread((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map((m) => 
            m.id === optimisticMessage.id ? res.data.message : m
          ),
        };
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message on error
      setThread((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.filter((m) => m.id !== optimisticMessage.id),
        };
      });
      lastMessageCountRef.current--;
      setMessage(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'h:mm a');
  };

  const formatDateDivider = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  const shouldShowDateDivider = (currentMsg: Message, prevMsg?: Message) => {
    if (!prevMsg) return true;
    const currentDate = new Date(currentMsg.createdAt);
    const prevDate = new Date(prevMsg.createdAt);
    return !isSameDay(currentDate, prevDate);
  };

  const getThreadName = () => {
    if (!thread) return '';
    if (thread.title) return thread.title;
    const otherParticipants = thread.participantUsers.filter((p) => p.id !== user?.id);
    return otherParticipants.map((p) => p.name).join(', ') || 'Conversation';
  };

  const getOtherParticipant = () => {
    if (!thread) return null;
    return thread.participantUsers.find((p) => p.id !== user?.id);
  };

  const getRoleBadge = (role?: string) => {
    if (!role) return null;
    const badges: Record<string, { label: string; className: string }> = {
      OWNER_ADMIN: { label: 'Admin', className: 'bg-purple-500/20 text-purple-400' },
      EMPLOYEE: { label: 'Team', className: 'bg-blue-500/20 text-blue-400' },
      CUSTOMER: { label: 'Client', className: 'bg-emerald-500/20 text-emerald-400' },
    };
    return badges[role];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-[var(--text-secondary)]">Thread not found</p>
      </div>
    );
  }

  const otherParticipant = getOtherParticipant();
  const roleBadge = otherParticipant ? getRoleBadge(otherParticipant.role) : null;

  return (
    <div className="h-[calc(100vh-3.5rem)] lg:h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-3 sm:p-4 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => router.push('/messages')}
              className="p-1.5 sm:p-2 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] flex-shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-medium">
                {otherParticipant?.avatarUrl ? (
                  <img src={otherParticipant.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  getThreadName().charAt(0).toUpperCase()
                )}
              </div>
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[var(--surface)]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm sm:text-base text-[var(--text)] truncate">{getThreadName()}</p>
                {roleBadge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${roleBadge.className}`}>
                    {roleBadge.label}
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-emerald-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Online
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => fetchThread(false)}
              className="p-2 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-[var(--background)]">
        {thread.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-full bg-[var(--primary)]/10 flex items-center justify-center mb-4">
              <Send className="w-8 h-8 text-[var(--primary)]" />
            </div>
            <h3 className="font-medium text-[var(--text)] mb-1">Start the conversation</h3>
            <p className="text-sm text-[var(--text-tertiary)] max-w-xs">
              Send a message to {getThreadName()} to get started
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {thread.messages.map((msg, idx) => {
              const isOwn = msg.sender.id === user?.id;
              const prevMsg = idx > 0 ? thread.messages[idx - 1] : undefined;
              const showDateDivider = shouldShowDateDivider(msg, prevMsg);
              const showAvatar = !prevMsg || prevMsg.sender.id !== msg.sender.id || showDateDivider;
              const isLastFromSender = idx === thread.messages.length - 1 || thread.messages[idx + 1].sender.id !== msg.sender.id;
              const isOptimistic = msg.id.startsWith('temp-');

              return (
                <div key={msg.id}>
                  {/* Date Divider */}
                  {showDateDivider && (
                    <div className="flex items-center justify-center my-4">
                      <span className="px-3 py-1 text-[10px] sm:text-xs text-[var(--text-muted)] bg-[var(--surface)] rounded-full border border-[var(--border)]">
                        {formatDateDivider(msg.createdAt)}
                      </span>
                    </div>
                  )}

                  <div
                    className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''} ${showAvatar ? 'mt-3' : 'mt-0.5'}`}
                  >
                    {/* Avatar */}
                    <div className="w-7 sm:w-8 flex-shrink-0">
                      {showAvatar && !isOwn && (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-xs sm:text-sm font-medium">
                          {msg.sender.avatarUrl ? (
                            <img src={msg.sender.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            msg.sender.name.charAt(0).toUpperCase()
                          )}
                        </div>
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div className={`max-w-[75%] sm:max-w-[65%] ${isOwn ? 'text-right' : ''}`}>
                      {showAvatar && !isOwn && (
                        <p className="text-[10px] sm:text-xs text-[var(--text-tertiary)] mb-1 ml-1">{msg.sender.name}</p>
                      )}
                      <div
                        className={`inline-block px-3 sm:px-4 py-2 rounded-2xl ${
                          isOwn
                            ? `bg-[var(--primary)] text-white ${showAvatar ? 'rounded-tr-md' : ''} ${isLastFromSender ? 'rounded-br-md' : ''}`
                            : `bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] ${showAvatar ? 'rounded-tl-md' : ''} ${isLastFromSender ? 'rounded-bl-md' : ''}`
                        } ${isOptimistic ? 'opacity-70' : ''}`}
                      >
                        <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>
                      {isLastFromSender && (
                        <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {formatMessageTime(msg.createdAt)}
                          </span>
                          {isOwn && !isOptimistic && (
                            <CheckCheck size={12} className="text-[var(--primary)]" />
                          )}
                          {isOwn && isOptimistic && (
                            <Check size={12} className="text-[var(--text-muted)]" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-3 sm:p-4 border-t border-[var(--border)] bg-[var(--surface)]">
        <form onSubmit={handleSend} className="flex items-end gap-2 sm:gap-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Type a message..."
              className="w-full h-10 sm:h-11 px-4 rounded-full border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all"
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            disabled={!message.trim() || sending}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
              message.trim()
                ? 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] scale-100'
                : 'bg-[var(--surface-hover)] text-[var(--text-muted)] scale-95'
            } disabled:opacity-50`}
          >
            {sending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} className={message.trim() ? '' : 'opacity-50'} />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
