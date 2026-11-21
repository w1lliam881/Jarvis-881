import { useState } from 'react';
import { sendMagicLink } from '../../data/supabase';

/** Inloggning med e-postlänk (bara när Supabase är uppsatt). */
export function Login() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  return (
    <div className="min-h-dvh bg-forest text-on-forest">
      <div className="safe-top mx-auto max-w-[480px] px-5 pt-16">
        <h1 className="m-0 font-serif text-[34px] font-semibold">Jarvis</h1>
        <p className="text-on-forest-muted">Logga in med din e-post. Du får en länk, inget lösenord behövs.</p>
        <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-surface p-4 text-text">
          {sent ? (
            <p className="m-0">Kolla din mejl och tryck på länken. Du kan stänga den här fliken.</p>
          ) : (
            <>
              <input className="field" type="email" autoComplete="email" placeholder="din@mejl.se" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="E-post" />
              <button
                className="btn btn-primary"
                disabled={!/.+@.+\..+/.test(email)}
                onClick={async () => {
                  const r = await sendMagicLink(email.trim());
                  if (r) setErr(r);
                  else setSent(true);
                }}
              >
                Skicka inloggningslänk
              </button>
              {err && <p className="m-0 text-[14px] text-hi">{err}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
