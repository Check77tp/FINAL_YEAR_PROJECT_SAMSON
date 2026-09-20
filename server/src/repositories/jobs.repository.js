// Data access layer for `job_runs`. No business logic here — only querying
// and mapping rows.
import { supabase } from '../config/supabaseClient.js';

export async function findLastRun(jobName) {
  const { data, error } = await supabase
    .from('job_runs')
    .select('last_run_at')
    .eq('job_name', jobName)
    .maybeSingle();

  if (error) throw error;
  return data ? new Date(data.last_run_at) : null;
}

export async function recordRun(jobName, at = new Date()) {
  const { error } = await supabase
    .from('job_runs')
    .upsert({ job_name: jobName, last_run_at: at.toISOString() }, { onConflict: 'job_name' });

  if (error) throw error;
}
