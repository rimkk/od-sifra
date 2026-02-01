'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, Plus, Search, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { threadApi, workspaceApi } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface Thread {
  id: string;
  title?: string;
  isGroup: boolean;
  updatedAt: string;
  participantUsers: { id: string; name: string; avatarUrl?: string; role?: string }[];
  unreadCount: number;
  lastMessage?: {
    content: string;
    sender: { id: string; name: string };
    createdAt: string;
  };
}

interface Member {
  user: { id: string; name: string; avatarUrl?: string; role?: string };
  role: string;
}

export default function MessagesPage() {
  const { user, currentWorkspace } = useAuthStore();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewThread, setShowNewThread] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentWorkspace]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [threadsRes, membersRes] = await Promise.all([
        threadApi.getAll(),
        currentWorkspace ? workspaceApi.getMembers(currentWorkspace.id) : Promise.resolve({ data: { members: [] } }),
      ]);
      setThreads(threadsRes.data.threads || []);
      setMembers(membersRes.data.members || []);
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartThread = async () => {
    if (!selectedMember || !currentWorkspace) return;

    setCreating(true);
    try {
      const res = await threadApi.create({
        workspaceId: currentWorkspace.id,
        participantIds: [selectedMember],
      });

      // Navigate to thread
      window.location.href = `/messages/${res.data.thread.id}`;
    } catch (error) {
      console.error('Failed to create thread:', error);
    } finally {
      setCreating(false);
    }
  };

  const getThreadName = (thread: Thread) => {
    if (thread.title) return thread.title;
    const otherParticipants = thread.participantUsers.filter((p) => p.id !== user?.id);
    return otherParticipants.map((p) => p.name).join(', ') || 'Conversation';
  };

  const filteredThreads = threads.filter((t) =>
    searchQuery === '' || getThreadName(t).toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] lg:h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-3 sm:p-4 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h1 className="text-base sm:text-lg font-semibold text-[var(--text)]">Messages</h1>
          <button
            onClick={() => setShowNewThread(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs sm:text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
          >
            <Plus size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">New Message</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] sm:w-4 sm:h-4" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto">
        {filteredThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <MessageSquare className="mb-3 text-[var(--text-muted)]" size={40} />
            <h3 className="font-medium text-[var(--text)] mb-1">No messages yet</h3>
            <p className="text-sm text-[var(--text-tertiary)] mb-4">
              Start a conversation with a team member
            </p>
            <button
              onClick={() => setShowNewThread(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
            >
              <Plus size={16} />
              New Message
            </button>
          </div>
        ) : (
          filteredThreads.map((thread) => {
            const otherParticipant = thread.participantUsers.find((p) => p.id !== user?.id);
            const roleLabels: Record<string, { label: string; color: string }> = {
              OWNER_ADMIN: { label: 'Admin', color: 'text-purple-400 bg-purple-500/10' },
              EMPLOYEE: { label: 'Team', color: 'text-blue-400 bg-blue-500/10' },
              CUSTOMER: { label: 'Client', color: 'text-emerald-400 bg-emerald-500/10' },
            };
            const role = otherParticipant?.role ? roleLabels[otherParticipant.role] : null;
            
            return (
              <Link
                key={thread.id}
                href={`/messages/${thread.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-hover)] border-b border-[var(--border)] transition-colors"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-medium">
                    {otherParticipant?.avatarUrl ? (
                      <img src={otherParticipant.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      getThreadName(thread).charAt(0).toUpperCase()
                    )}
                  </div>
                  {/* Online indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[var(--background)]" />
                  {thread.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--primary)] text-white text-xs flex items-center justify-center font-medium">
                      {thread.unreadCount > 9 ? '9+' : thread.unreadCount}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className={`font-medium text-sm truncate ${thread.unreadCount > 0 ? 'text-[var(--text)]' : 'text-[var(--text-secondary)]'}`}>
                        {getThreadName(thread)}
                      </p>
                      {role && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${role.color}`}>
                          {role.label}
                        </span>
                      )}
                    </div>
                    {thread.lastMessage && (
                      <span className="text-[10px] sm:text-xs text-[var(--text-muted)] flex-shrink-0 ml-2">
                        {formatDistanceToNow(new Date(thread.lastMessage.createdAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  {thread.lastMessage && (
                    <p className={`text-xs sm:text-sm truncate ${thread.unreadCount > 0 ? 'text-[var(--text-secondary)] font-medium' : 'text-[var(--text-tertiary)]'}`}>
                      {thread.lastMessage.sender.id === user?.id ? 'You: ' : ''}
                      {thread.lastMessage.content}
                    </p>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* New Thread Modal */}
      {showNewThread && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] w-full max-w-sm shadow-xl">
            <div className="px-5 py-4 border-b border-[var(--border)]">
              <h2 className="font-semibold text-[var(--text)]">New Message</h2>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Start a conversation with a team member</p>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                  Select recipient
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {members
                    .filter((m) => m.user.id !== user?.id)
                    .map((m) => {
                      const roleLabels: Record<string, { label: string; color: string }> = {
                        OWNER_ADMIN: { label: 'Admin', color: 'text-purple-400 bg-purple-500/10' },
                        EMPLOYEE: { label: 'Team', color: 'text-blue-400 bg-blue-500/10' },
                        CUSTOMER: { label: 'Client', color: 'text-emerald-400 bg-emerald-500/10' },
                      };
                      const role = roleLabels[m.user.role || m.role] || roleLabels.CUSTOMER;
                      
                      return (
                        <button
                          key={m.user.id}
                          onClick={() => setSelectedMember(m.user.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                            selectedMember === m.user.id
                              ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                              : 'border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)]'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-medium flex-shrink-0">
                            {m.user.avatarUrl ? (
                              <img src={m.user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              m.user.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="font-medium text-sm text-[var(--text)] truncate">{m.user.name}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${role.color}`}>
                              {role.label}
                            </span>
                          </div>
                          {selectedMember === m.user.id && (
                            <div className="w-5 h-5 rounded-full bg-[var(--primary)] flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  {members.filter((m) => m.user.id !== user?.id).length === 0 && (
                    <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
                      No team members available
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowNewThread(false); setSelectedMember(''); }}
                  className="flex-1 h-10 rounded-lg border border-[var(--border)] text-[var(--text)] font-medium text-sm hover:bg-[var(--surface-hover)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartThread}
                  disabled={!selectedMember || creating}
                  className="flex-1 h-10 rounded-lg bg-[var(--primary)] text-white font-medium text-sm hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {creating ? <Loader2 size={16} className="animate-spin" /> : 'Start Chat'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
