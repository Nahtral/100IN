export interface ChatParticipant {
  id: string;
  user_id: string;
  chat_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  last_read_at: string;
  user_name?: string;
  user_email?: string;
}

export interface Chat {
  id: string;
  name: string;
  chat_type: 'private' | 'group' | 'team';
  created_by: string;
  team_id?: string;
  is_archived: boolean;
  is_pinned: boolean;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'archived' | 'deleted';
  last_message_content?: string;
  last_message_sender?: string;
  unread_count: number;
  participant_count: number;
  participants?: ChatParticipant[];
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  attachment_url?: string;
  attachment_name?: string;
  attachment_size?: number;
  reply_to_id?: string;
  is_edited: boolean;
  is_deleted: boolean;
  edited_at?: string;
  created_at: string;
  sender_name: string;
  sender_email: string;
  reactions: MessageReaction[];
  status: 'visible' | 'recalled' | 'deleted_sender';
  language_code?: string;
  // UI states for optimistic updates
  _optimistic?: boolean;
  _pending?: boolean;
  _failed?: boolean;
  delivery_status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface MessageReaction {
  id: string;
  emoji: string;
  user_id: string;
  created_at: string;
}

export interface CreateChatData {
  name: string;
  type: 'private' | 'group' | 'team';
  participants: string[];
  team_id?: string;
}

export interface ChatError {
  code: string;
  message: string;
  details?: any;
}

// Legacy type aliases for compatibility
export type Message = ChatMessage;
export interface TypingIndicator {
  userId: string;
  userName: string;
  timestamp: string;
}

export interface ChatSettings {
  notifications: boolean;
  sound: boolean;
  theme: 'light' | 'dark';
}