
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export async function testConnection() {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.from('families').select('count', { count: 'exact', head: true });
    return !error;
  } catch {
    return false;
  }
}

// --- Fonctions de Synchronisation ---

export async function fetchFamilyData(userEmail: string) {
  if (!supabase) return null;

  // 1. Récupérer ou Créer la famille
  let { data: family, error: fError } = await supabase
    .from('families')
    .select('*')
    .eq('email', userEmail)
    .single();

  if (!family && !fError) return null;
  if (fError && fError.code !== 'PGRST116') throw fError;

  if (!family) return null;

  // 2. Récupérer les enfants
  const { data: children } = await supabase
    .from('children')
    .select('*')
    .eq('family_id', family.id);

  // 3. Récupérer l'agenda
  const { data: agenda } = await supabase
    .from('agenda_entries')
    .select('*')
    .eq('family_id', family.id);

  // 4. Récupérer les notes
  const { data: notes } = await supabase
    .from('sticky_notes')
    .select('*')
    .eq('family_id', family.id);

  return { family, children: children || [], agenda: agenda || [], notes: notes || [] };
}

export async function createFamily(email: string, familyName: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('families')
    .insert([{ email, family_name: familyName }])
    .select()
    .single();
  if (error) throw error;
  return data;
}
