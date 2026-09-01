// Data access layer for `categories`. No business logic here.
import { supabase } from '../config/supabaseClient.js';

export async function findAllCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('category_id, name, description')
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
}
