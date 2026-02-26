export interface PaymentSettings {
  _id?: string;
  project: 'ghadaq' | 'manasik';
  paymentMethod: 'paymob' | 'easykash';
  createdAt?: Date;
  updatedAt?: Date;
}
