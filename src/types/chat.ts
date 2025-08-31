export interface ChatParticipant {
  id: string;
  user_id: string;
  chat_id: string;
  role: 'admin' | 'member' | 'moderator';
  joined_at: string;
  profiles?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface Chat {
  id: string;
  name: string;
  chat_type: 'private' | 'group' | 'team';
  created_by: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  is_pinned?: boolean;
  team_id?: string;
  last_message_at?: string;
  unread_count?: number;
  chat_participants: ChatParticipant[];
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'video' | 'file' | 'location' | 'link';
  media_url?: string;
  media_type?: string;
  media_size?: number;
  reply_to_id?: string;
  is_edited: boolean;
  is_deleted: boolean;
  is_recalled: boolean;
  is_archived: boolean;
  created_at: string;
  edited_at?: string;
  read_by: Record<string, string>;
  delivery_status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  sender_profile?: {
    id: string;
    full_name: string;
    email: string;
  };
  reactions?: MessageReaction[];
  _optimistic?: boolean;
  _pending?: boolean;
  _failed?: boolean;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ChatSettings {
  notifications: boolean;
  sound: boolean;
  message_preview: boolean;
  typing_indicators: boolean;
  read_receipts: boolean;
  auto_archive_days: number;
  theme: 'light' | 'dark' | 'auto';
}

export interface ChatNotification {
  id: string;
  chat_id: string;
  user_id: string;
  type: 'mention' | 'message' | 'join' | 'leave';
  title: string;
  message: string;
  data: Record<string, any>;
  created_at: string;
  read: boolean;
}

export interface TypingIndicator {
  user_id: string;
  chat_id: string;
  typing: boolean;
  timestamp: number;
}

export interface ChatPresence {
  user_id: string;
  online: boolean;
  last_seen: string;
}