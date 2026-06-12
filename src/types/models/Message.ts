/**
 * Message & Review Models - MESSAGES & REVIEWS tables
 */

export interface Message {
  id: string;
  content: string;
  
  // Frontend & Mock backend properties
  conversationId?: string;
  senderId?: string;
  type?: string;
  createdAt?: string;
  isRead?: boolean;
  fileUrl?: string;
  fileName?: string;

  // DB/Backend schema compatibility properties
  contract_id?: string;
  sender_id?: string;
  receiver_id?: string;
  is_read?: boolean;
}

export interface Review {
  id: string;
  contract_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number; // 1-5
  comment: string;
}
