export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: number;
  avatar?: string; 
  isCurrentUser?: boolean; 
}
