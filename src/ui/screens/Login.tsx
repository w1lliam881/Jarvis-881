import { useState } from 'react';
import { ClipboardPaste } from 'lucide-react';
import { forgetLocalSession, isStandalone, sendMagicLink, signInWithHandoff, signInWithPassword } from '../../data/supabase';

/** Inloggning med e-post och lösenord, eller med e-postlänk. I appen på hemskärmen fungerar länken via en kod som Safari visar. */
export function Login() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [mode, setMode] = useState<'password' | 'link'>('password');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const app = isStandalone();
  const useCode = async (c: string) => {
    if (!c.trim()) return;
    setBusy(true);
    const e = await signInWithHandoff(c);
    setBusy(false);
    if (e) setErr(e);
    else location.reload();
  };
  const okEmail = /.+@.+\..+/.test(email);
  const login = async () => {
    if (!okEmail || !pw || busy) return;
    setBusy(true);
    setErr('');
    const e = await signInWithPassword(email.trim(), pw);
    setBusy(false);
    if (e) setErr(e);
    else location.reload();
  };
  const paste = async () => {
    try {
      const t = await navigator.clipboard.readText();
      setCode(t.trim());
      void useCode(t);
    } catch {
      setErr('Kunde inte läsa urklipp. Håll fingret i rutan och välj Klistra in.');
    }
  };
  return (
    <div className="min-h-dvh bg-forest text-on-forest">
      <div className="safe-top mx-auto max-w-[480px] px-5 pt-16">
        <h1 className="m-0 font-serif text-[34px] font-semibold">Jarvis</h1>
        <p className="text-on-forest-muted">{mode === 'password' ? 'Logga in med e-post och lösenord.' : 'Logga in med din e-post. Du får en länk i mejlen.'}</p>
        <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-surface p-4 text-text">
          {mode === 'password' ? (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void login();
              }}
            >
              <input className="field" type="email" autoComplete="username" inputMode="email" placeholder="din@mejl.se" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="E-post" />
              <input className="field" type="password" autoComplete="current-password" placeholder="Lösenord" value={pw} onChange={(e) => setPw(e.target.value)} aria-label="Lösenord" />
              <button type="submit" className="btn btn-primary" disabled={!okEmail || !pw || busy}>
                Logga in
              </button>
              <button type="button" className="text-[14px] text-muted underline" onClick={() => (setMode('link'), setErr(''))}>
                Inget lösenord än, eller glömt det? Få en inloggningslänk
              </button>
            </form>
          ) : !sent ? (
            <>
              <input className="field" type="email" autoComplete="email" inputMode="email" placeholder="din@mejl.se" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="E-post" />
              <button
                className="btn btn-primary"
                disabled={!okEmail || busy}
                onClick={async () => {
                  setBusy(true);
                  const r = await sendMagicLink(email.trim());
                  setBusy(false);
                  if (r) setErr(r);
                  else setSent(true);
                }}
              >
                Skicka inloggningslänk
              </button>
              <p className="m-0 text-[13px] text-muted">När du är inne kan du välja ett lösenord under Mer → Inställningar → Lösenord.</p>
              <button type="button" className="text-[14px] text-muted underline" onClick={() => (setMode('password'), setErr(''))}>
                Logga in med lösenord istället
              </button>
            </>
          ) : app ? (
            <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5 text-[15px]">
              <li>Öppna mejlet från Supabase och tryck på länken. Den öppnas i Safari.</li>
              <li>Safari visar en inloggningskod. Tryck <b>Kopiera kod</b>.</li>
              <li>Kom tillbaka hit och tryck <b>Klistra in kod</b> nedan.</li>
            </ol>
          ) : (
            <p className="m-0">Kolla din mejl och tryck på länken. Den kan hamna i skräpposten.</p>
          )}
          {err && <p className="m-0 text-[14px] text-hi">{err}</p>}
        </div>
        {app && mode === 'link' && (
          <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-surface p-4 text-text">
            <div className="font-semibold">Har du en kod från Safari?</div>
            <button className="btn btn-sun" disabled={busy} onClick={paste}>
              <ClipboardPaste size={18} aria-hidden /> Klistra in kod
            </button>
            <div className="flex gap-2">
              <input className="field num" value={code} onChange={(e) => setCode(e.target.value)} placeholder="eller skriv koden här" autoCapitalize="off" autoCorrect="off" spellCheck={false} aria-label="Inloggningskod" />
              <button className="btn btn-primary shrink-0" disabled={!code.trim() || busy} onClick={() => void useCode(code)}>
                Logga in
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Visas i Safari direkt efter länken i mejlet: koden som för över inloggningen till appen på hemskärmen. */
export function Handoff({ code, onContinue }: { code: string; onContinue: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="min-h-dvh bg-forest text-on-forest">
      <div className="safe-top mx-auto max-w-[480px] px-5 pt-16">
        <h1 className="m-0 font-serif text-[30px] font-semibold">Du är inloggad</h1>
        <p className="text-on-forest-muted">Använder du Jarvis från hemskärmen? Kopiera koden och klistra in den i appen.</p>
        <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-surface p-4 text-text">
          <div className="num select-all break-all rounded-xl bg-accent-soft px-4 py-3 text-center text-[24px] font-semibold tracking-wider text-accent">{code}</div>
          <button
            className="btn btn-sun"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(code);
                setCopied(true);
                await forgetLocalSession();
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? 'Kopierad. Öppna appen och tryck Klistra in kod' : 'Kopiera kod'}
          </button>
          <p className="m-0 text-[13px] text-muted">Koden fungerar en gång. När du kopierar den loggas Safari-fliken ut, så att bara appen är inloggad. Du kan stänga fliken.</p>
        </div>
        {!copied && (
          <button className="mt-4 text-[14px] text-on-forest-muted underline" onClick={onContinue}>
            Fortsätt i Safari istället
          </button>
        )}
      </div>
    </div>
  );
}
