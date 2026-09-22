// Data access layer for `announcements`. No business logic here — only
// querying and mapping rows.
import { supabase } from '../config/supabaseClient.js';

const COLUMNS = 'announcement_id, title, message, hostel, created_by, created_at, expires_at';

export async function insertAnnouncement({ title, message, hostel, createdBy, expiresAt }) {
  const { data, error } = await supabase
    .from('announcements')
    .insert({ title, message, hostel, created_by: createdBy, expires_at: expiresAt })
    .select(COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

// Newest first. The service filters by hostel/expiry so the rule is visible
// (and unit-tested) there rather than hidden in a query.
export async function findRecentAnnouncements(limit = 100) {
  const { data, error } = await supabase
    .from('announcements')
    .select(`${COLUMNS}, author:users!created_by ( name )`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function deleteAnnouncement(announcementId) {
  const { error } = await supabase.from('announcements').delete().eq('announcement_id', announcementId);

  if (error) throw error;
}
