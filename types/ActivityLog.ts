export interface ActivityLog {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout';
  resource: 'product' | 'user' | 'auth';
  resourceId?: string;
  details: string;
  metadata?: { [key: string]: unknown };
  createdAt: Date;
}
