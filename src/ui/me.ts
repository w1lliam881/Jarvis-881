// Vem som är inloggad: för hälsningen på startsidan och day streaken i spelet.
import { store } from '../data/store';
import { deviceUser } from './Boot';

/** Nyckel för personen (e-post när Supabase används, annars namnet på enheten). */
export function meKey(): string {
  const b = store().backend;
  return (b.email || deviceUser() || 'du').toLowerCase();
}

/** Förnamn att hälsa med: namnet i listan över tillåtna, namnet på enheten eller början av e-posten. */
export function meName(): string {
  const b = store().backend;
  const raw = b.intro?.name || deviceUser() || (b.email ? b.email.split('@')[0].split(/[._-]/)[0] : '');
  const first = raw.trim().split(/\s+/)[0] ?? '';
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : '';
}
