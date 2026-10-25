//  new file: src/utils/auditLogger.ts
import { db } from '../config/firebaseSetup';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface AuditLogData {
  action: string;
  userId: string;
  email: string;
  employeeId?: string;
  role?: string;
  status: 'success' | 'failed';
  failureReason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export const logAuditActivity = async (data: AuditLogData) => {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      ...data,
      timestamp: serverTimestamp(),
      userAgent: data.userAgent || navigator.userAgent
    });
    console.log('Audit log recorded:', data.action, data.email);
  } catch (error) {
    console.error('Error logging audit activity:', error);
  }
};