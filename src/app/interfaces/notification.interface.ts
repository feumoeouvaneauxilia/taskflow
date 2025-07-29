export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'task_assigned' | 'task_completed' | 'task_validation' | 'task_reminder' | 'task_overdue' | 'group_added' | 'general';
  recipientId: string;
  senderId?: string;
  relatedEntityId?: string; // taskId, groupId, etc.
  relatedEntityType?: 'task' | 'group' | 'user';
  isRead: boolean;
  isSent: boolean;
  sentAt?: Date;
  readAt?: Date;
  createdAt: Date;
  data?: any; // Additional metadata
}

export interface NotificationResponse {
  notifications: Notification[];
  total: number;
}
