
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Supabase: URL ou Clé Anon manquante dans process.env");
}

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Helper pour formater les erreurs
const formatError = (error: any) => {
  if (error.code === 'PGRST116') return null; // No rows found
  console.error("Supabase Error Details:", error);
  return error.message;
};

export async function fetchFamilyData(userEmail: string) {
  if (!supabase) return null;

  try {
    // 1. Récupérer la famille
    let { data: family, error: fError } = await supabase
      .from('families')
      .select('*')
      .eq('email', userEmail)
      .single();

    if (fError && fError.code !== 'PGRST116') {
      throw new Error(`Erreur Table 'families': ${fError.message}`);
    }

    if (!family) return null;

    // 2. Récupérer les données liées
    const [childrenRes, agendaRes, notesRes] = await Promise.all([
      supabase.from('children').select('*').eq('family_id', family.id),
      supabase.from('agenda_entries').select('*').eq('family_id', family.id),
      supabase.from('sticky_notes').select('*').eq('family_id', family.id)
    ]);

    return { 
      family, 
      children: childrenRes.data || [], 
      agenda: agendaRes.data || [], 
      notes: notesRes.data || [] 
    };
  } catch (err: any) {
    console.error("Fetch Family Data Failed:", err);
    throw err;
  }
}

export async function createFamily(email: string, familyName: string) {
  if (!supabase) throw new Error("Supabase non initialisé");
  
  const { data, error } = await supabase
    .from('families')
    .insert([{ email, family_name: familyName }])
    .select()
    .single();
    
  if (error) throw error;
  return data;
}
