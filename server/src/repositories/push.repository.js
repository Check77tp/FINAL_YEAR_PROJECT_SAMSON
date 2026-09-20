// Data access layer for `push_subscriptions`. No business logic here — only
// querying and mapping rows.
import { supabase } from '../config/supabaseClient.js';

// Upsert on endpoint: the same browser subscribing again (or a different
// user logging in on the same browser) takes over the existing row.
export async function upsertSubscription({ userId, endpoint, p256dh, auth }) {
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ user_id: userId, endpoint, p256dh, auth }, { onConflict: 'endpoint' });

  if (error) throw error;
}

export async function deleteSubscriptionByEndpoint(endpoint) {
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);

  if (error) throw error;
}

export async function deleteUserSubscriptionByEndpoint({ userId, endpoint }) {
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function findSubscriptionsByUserIds(userIds) {
  if (userIds.length === 0) return [];
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, user_id')
    .in('user_id', userIds);

  if (error) throw error;
  return data;
}
