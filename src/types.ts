/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LoanStatus = 'Pending' | 'Approved' | 'Rejected';

export interface Payment {
  id: string;
  amount: number;
  date: number;
  method: string;
}

export interface LoanApplication {
  id: string;
  fullName: string;
  bankName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  loanAmount: number;
  phoneNumber: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  status: LoanStatus;
  createdAt: number;
  payments: Payment[];
  dueDate: number;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
}
