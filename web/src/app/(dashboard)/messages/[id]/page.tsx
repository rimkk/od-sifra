'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { threadApi } from '@/lib/api';
import { format, isToday, isYesterday } from 'date-fns';

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
  participantUsers: { id: string; name: string; avatarUrl?: string; email?: string }[];
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (threadId) {
      fetchThread();
    }
  }, [threadId]);

  useEffect(() => {
    scrollToBottom();
  }, [thread?.messages]);

  const fetchThread = async () => {
    try {
      const res = await threadApi.getById(threadId);
      setThread(res.data.thread);
    } catch (error) {
      console.error('Failed to fetch thread:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sending) return;

    const content = message.trim();
    setMessage('');
    setSending(true);

    try {
      const res = await threadApi.sendMessage(threadId, content);
      setThread((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...prev.messages, res.data.message],
        };
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessage(content);
    } finally {
      setSending(false);
    }
  };

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return `Yesterday ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, h:mm a');
  };

  const getThreadName = () => {
    if (!thread) return '';
    if (thread.title) return thread.title;
    const otherParticipants = thread.participantUsers.filter((p) => p.id !== user?.id);
    return otherParticipants.map((p) => p.name).join(', ') || 'Conversation';
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

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/messages')}
            className="p-2 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)]"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-medium">
              {thread.participantUsers[0]?.avatarUrl ? (
                <img src={thread.participantUsers[0].avatarUrl} alt="" className="w-full h-full rounded-full" />
              ) : (
                getThreadName().charAt(0)
              )}
            </div>
            <div>
              <p className="font-medium text-[var(--text)]">{getThreadName()}</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {thread.participantUsers.length} participants
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--background)]">
        {thread.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-[var(--text-tertiary)]">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          thread.messages.map((msg, idx) => {
            const isOwn = msg.sender.id === user?.id;
            const showAvatar = idx === 0 || thread.messages[idx - 1].sender.id !== msg.sender.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className="w-8 flex-shrink-0">
                  {showAvatar && !isOwn && (
                    <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-sm font-medium">
                      {msg.sender.avatarUrl ? (
                        <img src={msg.sender.avatarUrl} alt="" className="w-full h-full rounded-full" />
                      ) : (
                        msg.sender.name.charAt(0)
                      )}
                    </div>
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`max-w-[70%] ${isOwn ? 'text-right' : ''}`}>
                  {showAvatar && !isOwn && (
                    <p className="text-xs text-[var(--text-tertiary)] mb-1">{msg.sender.name}</p>
                  )}
                  <div
                    className={`inline-block px-4 py-2 rounded-2xl ${
                      isOwn
                        ? 'bg-[var(--primary)] text-white rounded-br-md'
                        : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  <p className={`text-xs text-[var(--text-muted)] mt-1 ${isOwn ? 'text-right' : ''}`}>
                    {formatMessageDate(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-[var(--border)] bg-[var(--surface)]">
        <form onSubmit={handleSend} className="flex items-center gap-3">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 h-10 px-4 rounded-full border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
          />
          <button
            type="submit"
            disabled={!message.trim() || sending}
            className="w-10 h-10 rounded-full bg-[var(--primary)] text-white flex items-center justify-center hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}
