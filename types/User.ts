export interface User {
  _id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'super_admin';
  createdAt: Date;
  updatedAt: Date;
}
