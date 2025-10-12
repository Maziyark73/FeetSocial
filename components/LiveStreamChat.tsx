import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface LiveStreamChatProps {
  streamId: string;
  currentUserId?: string | null;
  isStreamer?: boolean;
  compact?: boolean; // TikTok-style compact overlay mode
}

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_creator: boolean;
}

export default function LiveStreamChat({ streamId, currentUserId, isStreamer, compact = false }: LiveStreamChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    const cleanup = subscribeToMessages();
    
    // Fallback: Poll for new messages every 3 seconds (in case Realtime fails)
    const pollInterval = setInterval(() => {
      loadMessages();
    }, 3000);
    
    return () => {
      cleanup();
      clearInterval(pollInterval);
    };
  }, [streamId]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const { data, error } = await (supabase as any)
        .rpc('get_stream_messages', { 
          stream_uuid: streamId,
          message_limit: 100 
        });

      if (error) throw error;
      
      // Reverse to show oldest first (bottom)
      setMessages((data || []).reverse());
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const subscribeToMessages = () => {
    console.log('📡 Subscribing to real-time messages for stream:', streamId);
    
    // Subscribe to new messages
    const channel = supabase
      .channel(`stream-chat:${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stream_messages',
          filter: `stream_id=eq.${streamId}`,
        },
        async (payload: any) => {
          console.log('💬 New message received via Realtime:', payload.new);
          
          // Fetch user details for the message
          const { data: user } = await (supabase as any)
            .from('users')
            .select('username, display_name, avatar_url, is_creator')
            .eq('id', payload.new.user_id)
            .single();

          if (user) {
            const newMsg: ChatMessage = {
              ...payload.new,
              ...user,
            };
            setMessages((prev) => [...prev, newMsg]);
            console.log('✅ Message added to UI:', newMsg.message);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'stream_messages',
          filter: `stream_id=eq.${streamId}`,
        },
        (payload: any) => {
          console.log('🗑️ Message deleted:', payload.old.id);
          setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    return () => {
      console.log('🔌 Unsubscribing from stream chat');
      supabase.removeChannel(channel);
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUserId || sending) return;

    setSending(true);
    try {
      const { error } = await (supabase as any)
        .from('stream_messages')
        .insert({
          stream_id: streamId,
          user_id: currentUserId,
          message: newMessage.trim(),
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('stream_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  // TikTok-style compact overlay mode
  if (compact) {
    return (
      <div className="flex flex-col h-full">
        {/* Comments floating up (last 4 messages) - much smaller and fading */}
        <div className="flex-1 flex flex-col justify-end p-3 space-y-1.5 pointer-events-none">
          {messages.slice(-4).map((msg, index) => {
            const isNewest = index === messages.slice(-4).length - 1;
            const opacity = isNewest ? 1 : 0.7 - (3 - index) * 0.15; // Fade older messages
            
            return (
              <div
                key={msg.id}
                className="bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs max-w-[70%] animate-fade-in"
                style={{
                  animation: `slideUp 0.3s ease-out ${index * 0.05}s both`,
                  opacity: opacity,
                }}
              >
                <span className="font-semibold text-white text-xs">
                  {msg.display_name}
                  {msg.is_creator && ' ⭐'}
                </span>
                <span className="text-white/90 text-xs">: {msg.message}</span>
              </div>
            );
          })}
        </div>

        {/* Comment Input at bottom - smaller and minimal */}
        {currentUserId && (
          <div className="p-2 bg-gradient-to-t from-black/60 to-transparent pointer-events-auto">
            <form onSubmit={handleSendMessage} className="flex gap-1.5">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Add a comment..."
                maxLength={200}
                className="flex-1 px-3 py-1.5 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-full focus:outline-none focus:ring-1 focus:ring-white/30 text-xs placeholder-white/50"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="px-3 py-1.5 bg-white/15 backdrop-blur-sm text-white rounded-full hover:bg-white/25 transition-colors disabled:opacity-20 disabled:cursor-not-allowed text-xs border border-white/20"
              >
                {sending ? '...' : '💬'}
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  // Full chat view (original)
  return (
    <div className="flex flex-col h-full bg-gray-800 rounded-lg overflow-hidden">
      {/* Chat Header */}
      <div className="bg-gray-900 px-4 py-3 border-b border-gray-700">
        <h3 className="text-white font-semibold flex items-center gap-2">
          💬 Live Chat
          <span className="text-xs text-gray-400">({messages.length})</span>
        </h3>
      </div>

      {/* Messages Container */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
        style={{ maxHeight: '400px' }}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-sm text-center">
              No messages yet.<br />Be the first to say something!
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className="flex items-start gap-3 group"
            >
              {/* Avatar */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-gray-700">
                {msg.avatar_url ? (
                  <img
                    src={msg.avatar_url}
                    alt={msg.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                    {msg.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Message */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-white">
                    {msg.display_name}
                  </span>
                  {msg.is_creator && (
                    <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">
                      Creator
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {new Date(msg.created_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-200 break-words">{msg.message}</p>
              </div>

              {/* Delete Button (for streamer or message owner) */}
              {(isStreamer || msg.user_id === currentUserId) && (
                <button
                  onClick={() => handleDeleteMessage(msg.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400 p-1"
                  title="Delete message"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      {currentUserId ? (
        <form onSubmit={handleSendMessage} className="p-4 bg-gray-900 border-t border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Send a message..."
              maxLength={500}
              className="flex-1 px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
            >
              {sending ? '...' : 'Send'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {newMessage.length}/500
          </p>
        </form>
      ) : (
        <div className="p-4 bg-gray-900 border-t border-gray-700 text-center">
          <p className="text-sm text-gray-400">
            <a href="/login" className="text-purple-400 hover:text-purple-300">
              Sign in
            </a>{' '}
            to chat
          </p>
        </div>
      )}
    </div>
  );
}

