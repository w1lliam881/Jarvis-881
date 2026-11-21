// Supabase slås på genom att sätta VITE_SUPABASE_URL och VITE_SUPABASE_ANON_KEY (se README).
// Utan dem körs Jarvis med lokal lagring i webbläsaren.
export function supabaseConfigured(): boolean {
  return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}
