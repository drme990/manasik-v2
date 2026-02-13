export interface ActivityLog {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'upload';
  resource: 'product' | 'user' | 'auth' | 'image';
  resourceId?: string;
  details: string;
  metadata?: { [key: string]: unknown };
  createdAt: Date;
}
