import { useEffect, useState } from 'react';
import { BookOpen, Calculator, CalendarClock, Clapperboard, Castle, Database, Eye, Gamepad2, History, Languages, LineChart, Settings as Cog, Upload, Wallet } from 'lucide-react';
import { store, useData } from '../../data/store';
import { updateSettings } from '../../data/actions';
import type { BackupInfo } from '../../data/backend';
import type { ChangeLogEntry, Dataset } from '../../domain/types';
import { backupJson } from '../../domain/export';
import { todayISO } from '../../domain/dates';
import type { Route } from '../router';
import { Card, Chips, ConfirmButton, Empty, Field, Page, Row, Section, Segmented, TextInput, Toggle, TopBand, cx } from '../components/ui';
import { changeDetails, initial, isSystemChange } from '../../domain/changes';
import { longDate } from '../../domain/dates';
import { Importer } from './Welcome';
import { deviceUser, setDeviceUser, toast } from '../Boot';
import { Presence } from '../components/Presence';
import { disablePush, enablePush, pushActive, pushBlocker, type PushPrefs } from '../../data/push';

export function Mer({ route }: { route: Route }) {
  const sub = route.path[1];
  if (sub === 'installningar') return <Settings />;
  if (sub === 'backup') return <Backups />;
  if (sub === 'import') return <ImportPage />;
  if (sub === 'logg') return <Log />;
  if (sub === 'guide') return <Guide />;
  return <Menu />;
}

function Menu() {
  const ds = useData();
  const item = (href: string, Icon: typeof Cog, title: string, sub: string) => (
    <Row href={href} chevron>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
        <Icon size={18} aria-hidden />
      </span>
      <span className="flex-1">
        <span className="block font-medium">{title}</span>
        <span className="block text-[12px] text-muted">{sub}</span>
      </span>
    </Row>
  );
  return (
    <>
      <TopBand title="Mer" sub={`Inloggad som ${store().user()}`} right={<Presence />} />
      <Page>
        <div className="desk-flow">
        <Section title="Planering">
          <Card pad={false}>
            {item('#/planering/kalkyl', Calculator, 'Kalkyl', 'Räkna på Doorzo-plagg innan du köper')}
            {item('#/planering/framtid', Wallet, 'Framtid och budget', 'Maxpris per kategori, orderplan och mål')}
            {item('#/planering/doorzo', Languages, 'Doorzo-sökningar', 'Svenska till japanska söktermer')}
            {item('#/planering/doorzo', Eye, 'Bevakningar', 'Sparade sökningar med maxpris (under Doorzo-sökningar)')}
            {item('#/planering/marknad', LineChart, 'Marknadsföring', 'Dina TikTok-klipp och vad som fungerar')}
            {item('#/planering/video', Clapperboard, 'Videoidéer', 'Idéer och bedömning av dina egna')}
          </Card>
        </Section>
        <Card pad={false}>
          {item('#/byn', Castle, 'Agentbyn', 'Dina fem agenter och vad de har gjort')}
          {ds.settings.gameEnabled && item('#/spelet', Gamepad2, 'Spelet', 'Uppdrag, världar och bossar')}
        </Card>
        <Section title="Data">
          <Card pad={false}>
            {item('#/idag?v=kalender', CalendarClock, 'Kalender', 'Uppgifter, försäljning och bokföring per dag')}
            {item('#/mer/backup', Database, 'Säkerhetskopior', 'Dagliga kopior, ladda ner och återställ')}
            {item('#/mer/import', Upload, 'Import och migrering', 'Hämta data från v14 med avstämning')}
            {item('#/mer/logg', History, 'Ändringslogg', 'Vem ändrade vad och när')}
          </Card>
        </Section>
        <Card pad={false}>
          {item('#/mer/installningar', Cog, 'Inställningar', 'Tema, moms, underlag, spelet')}
          {item('#/mer/guide', BookOpen, 'Så använder du Jarvis', 'Kort guide')}
        </Card>
        </div>
        <p className="m-0 px-1 text-[12px] text-muted">
          Jarvis 2.0 · lagring: {store().backend.kind === 'supabase' ? 'Supabase (EU)' : store().backend.kind === 'local' ? 'den här enheten' : 'tillfällig (sparas inte)'} · driftkostnad 0 kr/mån
        </p>
      </Page>
    </>
  );
}

function PasswordCard({ email }: { email: string }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const short = pw.length > 0 && pw.length < 8;
  const mismatch = pw2.length > 0 && pw !== pw2;
  return (
    <Section title="Lösenord">
      <Card>
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (pw.length < 8 || pw !== pw2) return;
            setBusy(true);
            try {
              const { setPassword } = await import('../../data/supabase');
              const r = await setPassword(pw);
              if (r) setMsg(r);
              else {
                setPw('');
                setPw2('');
                setMsg('');
                toast('Lösenordet sparat');
              }
            } catch (err) {
              setMsg(`Kunde inte spara lösenordet: ${(err as Error)?.message ?? 'okänt fel'}. Kontrollera nätet och försök igen.`);
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="m-0 text-[14px] text-muted">Välj ett lösenord för {email}. Sedan kan du logga in med e-post och lösenord, även i appen på hemskärmen. Inloggningslänken fungerar fortfarande.</p>
          <input type="email" autoComplete="username" value={email} readOnly hidden />
          <Field label="Nytt lösenord" hint={short ? 'Minst 8 tecken.' : 'Minst 8 tecken. Spara det gärna i lösenordshanteraren.'}>
            <input className="field" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </Field>
          <Field label="Samma lösenord igen" hint={mismatch ? 'Lösenorden är inte lika.' : undefined}>
            <input className="field" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </Field>
          {msg && <p className="m-0 text-[14px] text-hi">{msg}</p>}
          <button type="submit" className="btn btn-primary" disabled={busy || pw.length < 8 || pw !== pw2}>
            Spara lösenord
          </button>
        </form>
      </Card>
    </Section>
  );
}

function Settings() {
  const ds = useData();
  const s = ds.settings;
  const [name, setName] = useState(deviceUser());
  return (
    <>
      <TopBand title="Inställningar" back="#/mer" />
      <Page>
        <div className="desk-flow">
        <Section title="Utseende">
          <Card>
            <Segmented
              value={s.theme}
              onChange={(v) => void updateSettings({ theme: v })}
              options={[
                { value: 'system', label: 'Som telefonen' },
                { value: 'light', label: 'Ljust' },
                { value: 'dark', label: 'Mörkt' },
              ]}
            />
          </Card>
        </Section>
        <Section title="Du">
          <Card>
            <Field label="Ditt namn på den här enheten" hint="Syns i ändringsloggen.">
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && (setDeviceUser(name.trim()), toast('Namnet sparat'))} />
            </Field>
          </Card>
        </Section>
        {store().backend.email && <PasswordCard email={store().backend.email!} />}
        <Section title="Företag och bokföring">
          <Card className="flex flex-col">
            <Field label="Företagsnamn">
              <TextInput value={s.companyName} onCommit={(v) => void updateSettings({ companyName: v })} />
            </Field>
            <Toggle label="Momsregistrerad" sub="Slår på momsrader och momsrapporten. Av tills företaget är registrerat." checked={s.vatEnabled} onChange={(v) => void updateSettings({ vatEnabled: v })} />
            <Toggle label="Flagga verifikat utan underlag" sub="Visas i Kontroll. Gäller bara nya verifikat." checked={s.attachmentsFlag} onChange={(v) => void updateSettings({ attachmentsFlag: v })} />
            <Field label="Bokföringen låst till och med" hint="Verifikat till och med datumet ändras inte längre, inte heller automatiskt. Rättelser bokförs med ett senare datum. Lås ett år när det är avstämt.">
              <input type="date" className="field" value={s.lockedThrough ?? ''} onChange={(e) => void updateSettings({ lockedThrough: e.target.value || null }, e.target.value ? `Låst till och med ${e.target.value}` : 'Låsningen borttagen')} />
            </Field>
            <p className="m-0 mt-2 text-[12px] text-muted">Räkenskapsår: kalenderår. Metod: fakturametoden (händelser bokförs på order- eller fakturadatum). Kontoplan: BAS.</p>
          </Card>
        </Section>
        <Section title="Annonser">
          <Card className="grid grid-cols-2 gap-3">
            <Field label="Modellens längd (cm)" hint="0 = utelämnas">
              <TextInput inputMode="numeric" value={String(s.adModelHeight ?? 0)} onCommit={(v) => void updateSettings({ adModelHeight: parseInt(v, 10) || 0 })} />
            </Field>
            <Field label="Yen per krona (bevakningar)">
              <TextInput inputMode="decimal" value={String(s.yenPerSek ?? 14)} onCommit={(v) => void updateSettings({ yenPerSek: parseFloat(v.replace(',', '.')) || 14 })} />
            </Field>
            <Field label="Modellens vikt (kg)">
              <TextInput inputMode="numeric" value={String(s.adModelWeight ?? 0)} onCommit={(v) => void updateSettings({ adModelWeight: parseInt(v, 10) || 0 })} />
            </Field>
          </Card>
        </Section>
        <Reminders />
        <Section title="Spelet">
          <Card>
            <Toggle label="Visa spelet" checked={s.gameEnabled} onChange={(v) => void updateSettings({ gameEnabled: v })} />
            <Toggle label="Ljud i spelet" checked={s.gameSound} onChange={(v) => void updateSettings({ gameSound: v })} />
          </Card>
        </Section>
        </div>
      </Page>
    </>
  );
}

function Backups() {
  const ds = useData();
  const [list, setList] = useState<BackupInfo[] | null>(null);
  const load = () => void store().backend.listBackups().then(setList);
  useEffect(load, []);
  const restore = async (id: string) => {
    const data = await store().backend.readBackup(id);
    if (!data) return toast('Kopian kunde inte läsas', 'error');
    await store().replaceAll(data, `återställning från ${id}`);
    toast('Återställd. En kopia av läget före återställningen sparades.');
    load();
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (j.format !== 'jarvis-2' || !j.data) return toast('Det här är inte en säkerhetskopia från Jarvis 2.0. Använd Import för v14-filer.', 'error');
      await store().replaceAll(j.data as Dataset, `återställning från fil ${f.name}`);
      toast('Återställd från fil');
      load();
    } catch {
      toast('Filen kunde inte läsas', 'error');
    }
  };
  return (
    <>
      <TopBand title="Säkerhetskopior" back="#/mer" sub="En kopia tas automatiskt varje dag (de senaste 30 sparas)" />
      <Page>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="btn btn-primary"
            onClick={async () => {
              await store().backend.createBackup('Manuell kopia', ds);
              toast('Kopia sparad');
              load();
            }}
          >
            Ta kopia nu
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              const url = URL.createObjectURL(new Blob([backupJson(ds)], { type: 'application/json' }));
              const a = document.createElement('a');
              a.href = url;
              a.download = `jarvis-backup-${todayISO()}.json`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 5000);
            }}
          >
            Ladda ner
          </button>
        </div>
        <label className="btn btn-ghost cursor-pointer">
          Återställ från fil
          <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} />
        </label>
        <Card pad={false}>
          {list?.map((b) => (
            <div key={b.id} className="flex min-h-[60px] items-center gap-3 border-b border-line-2 px-4 py-2 last:border-0">
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium">{new Date(b.at).toLocaleString('sv-SE', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                <span className="block text-[12px] text-muted">
                  {b.note} · {b.counts}
                </span>
              </span>
              <ConfirmButton className="h-9 min-h-0 px-3 text-[13px]" label="Återställ" confirmLabel="Säker?" onConfirm={() => void restore(b.id)} />
            </div>
          ))}
          {list && !list.length && <p className="m-0 p-4 text-[14px] text-muted">Inga kopior än.</p>}
        </Card>
        <p className="m-0 px-1 text-[12px] text-muted">Innan en återställning eller import sparas alltid en kopia av nuvarande läge, så inget kan försvinna.</p>
      </Page>
    </>
  );
}

function ImportPage() {
  return (
    <>
      <TopBand title="Import och migrering" back="#/mer" sub="Från Jarvis v14 eller en säkerhetskopia" />
      <Page>
        <Card>
          <Importer />
        </Card>
        <p className="m-0 px-1 text-[12px] text-muted">Importen ersätter all data i Jarvis 2.0. En säkerhetskopia av nuvarande läge tas först. Rapporten visar att antal och summor stämmer innan något skrivs.</p>
      </Page>
    </>
  );
}

function Log() {
  const [list, setList] = useState<ChangeLogEntry[] | null>(null);
  const [who, setWho] = useState('alla');
  const [sys, setSys] = useState(false);
  useEffect(() => void store().backend.changelog(300).then(setList), []);
  const me = store().user();
  const people = [...new Set((list ?? []).map((e) => e.by))];
  const shown = (list ?? []).filter((e) => (who === 'alla' ? true : who === 'jag' ? e.by === me : e.by !== me) && (sys || !isSystemChange(e)));
  const days = new Map<string, ChangeLogEntry[]>();
  for (const e of shown) days.set(e.at.slice(0, 10), [...(days.get(e.at.slice(0, 10)) ?? []), e]);
  const verb: Record<string, string> = { skapa: 'Lade till', ändra: 'Ändrade', 'ta bort': 'Tog bort', återställ: 'Återställde' };
  return (
    <>
      <TopBand title="Ändringslogg" back="#/mer" sub="Vem som gjort vad, och när" />
      <Page>
        <Chips
          value={who}
          onChange={setWho}
          options={[
            { value: 'alla', label: 'Alla' },
            { value: 'jag', label: `Jag (${me})` },
            ...(people.some((p) => p !== me) ? [{ value: 'andra', label: people.filter((p) => p !== me).join(', ') }] : []),
          ]}
        />
        <Toggle label="Visa automatiska verifikat" sub="Verifikat som räknas om när ni ändrar plagg och drops" checked={sys} onChange={setSys} />
        {[...days].map(([d, es]) => (
          <Section key={d} title={<span className="first-letter:uppercase">{longDate(d)}</span>}>
            <Card pad={false}>
              {es.map((e) => {
                const mine = e.by === me;
                const details = changeDetails(e);
                return (
                  <div key={e.id} className="flex gap-3 border-b border-line-2 px-4 py-3 last:border-0">
                    <span className={cx('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-bold', mine ? 'bg-forest text-on-forest' : 'bg-sun text-sun-ink')} aria-hidden>
                      {initial(e.by)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px]">
                        <b>{mine ? 'Du' : e.by}</b> · {verb[e.action] ?? e.action} {e.summary.charAt(0).toLowerCase() + e.summary.slice(1)}
                      </span>
                      {details.map((x) => (
                        <span key={x} className="num block text-[12px] text-muted">
                          {x}
                        </span>
                      ))}
                      <span className="block text-[12px] text-muted">{new Date(e.at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                  </div>
                );
              })}
            </Card>
          </Section>
        ))}
        {list && !shown.length && <Empty title="Inga ändringar här" text="När du eller din kompis ändrar något syns det här." />}
      </Page>
    </>
  );
}

function Guide() {
  const q = (t: string, a: string) => (
    <details className="card p-4">
      <summary className="cursor-pointer font-semibold">{t}</summary>
      <p className="mb-0 mt-2 text-[14px]">{a}</p>
    </details>
  );
  return (
    <>
      <TopBand title="Så använder du Jarvis" back="#/mer" />
      <Page>
        {q('Registrera en försäljning', 'Tryck på Ny → Försäljning. Sök plagget, skriv priset och spara. Verifikatet skapas automatiskt och allt räknas om: översikt, analys, bokföring och kalender.')}
        {q('Lägga in en ny drop', 'Ny → Drop. Klistra in plaggen, ett per rad med priset sist, t.ex. "11x Nudie jeans 132,19". Kategorin gissas och vikten fylls i. Frakt och tull kan läggas in direkt eller senare på dropen.')}
        {q('Bokföra en kostnad', 'Ny → Kostnad eller händelse. Välj typ (frakt, tull, material, annonsering…), belopp och datum. Frakt och tull kan kopplas till en drop så fördelas de på plaggen.')}
        {q('Ändra en siffra', 'Öppna plagget eller dropen och skriv i rutan. Allt sparas när du lämnar rutan och syns som "Sparat" längst ner. Tryck Ångra om det blev fel.')}
        {q('Underlag', 'Öppna ett verifikat eller en drop och tryck Fota, Fil eller Text. Verifikat utan underlag visas i Kontroll.')}
        {q('Mejl från Vinted, Plick och Doorzo', 'Ny → Klistra in mejl. Jarvis läser ut belopp och datum och lägger ett utkast i godkännandekön under Ekonomi. Inget bokförs förrän du godkänner.')}
        {q('Kontroll', 'Ekonomi → Kontroll visar en hälsopoäng och allt som ser fel ut: obalanserade verifikat, dubbletter, sålda utan datum, saknad frakt eller tull med mera.')}
        {q('Säkerhetskopior', 'En kopia tas varje dag automatiskt. Under Mer → Säkerhetskopior kan du ta en kopia, ladda ner och återställa.')}
        {q('Bokföringen', 'Jarvis skapar riktiga verifikat med debet och kredit enligt BAS. Det är ett stöd för eget bruk: låt någon redovisningskunnig granska innan det används för deklaration. Jarvis ger inga skatteråd.')}
        {q('Agentbyn', 'Mer → Agentbyn. Fem agenter som jobbar i Claude: Reminder (varje dag 10:30), Advisor och Reviewer (måndagar och fredagar 08:40), Noter (söndagar 20:00) och Builder (när du ber om det). Tryck på ett hus för att läsa vad agenten gjort. Agenterna läser bara din data, de ändrar den aldrig.')}
        {q('Tangentbord på dator', 'n = ny försäljning, k = ny kostnad, u = ny uppgift, 1–5 = flikarna.')}
      </Page>
    </>
  );
}

function Reminders() {
  const blocked = pushBlocker();
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState<PushPrefs>(() => {
    try {
      return { time: '18:00', kinds: { daily: true, inbox: true, oldStock: true }, ...JSON.parse(localStorage.getItem('jarvis-push') ?? '{}') };
    } catch {
      return { time: '18:00', kinds: { daily: true, inbox: true, oldStock: true } };
    }
  });
  useEffect(() => void pushActive().then(setOn), []);
  const save = async (p: PushPrefs, enable: boolean) => {
    setPrefs(p);
    try {
      localStorage.setItem('jarvis-push', JSON.stringify(p));
    } catch {
      /* valfritt */
    }
    setBusy(true);
    const err = enable ? await enablePush(p) : (await disablePush(), null);
    setBusy(false);
    if (err) toast(err, 'error');
    else {
      setOn(enable);
      toast(enable ? 'Påminnelser på' : 'Påminnelser av');
    }
  };
  return (
    <Section title="Påminnelser">
      <Card className="flex flex-col">
        <Toggle label="Skicka påminnelser som notiser" sub={blocked ?? `Varje dag kl ${prefs.time} om det finns något att göra`} checked={on} onChange={(v) => !blocked && !busy && void save(prefs, v)} />
        {!blocked && (
          <>
            <Field label="Tid">
              <select className="field" value={prefs.time} onChange={(e) => void save({ ...prefs, time: e.target.value }, on)}>
                {['08:00', '09:00', '12:00', '15:00', '17:00', '18:00', '19:00', '20:00', '21:00'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Toggle label="Uppgifter för dagen" checked={prefs.kinds.daily} onChange={(v) => void save({ ...prefs, kinds: { ...prefs.kinds, daily: v } }, on)} />
            <Toggle label="Utkast i godkännandekön" checked={prefs.kinds.inbox} onChange={(v) => void save({ ...prefs, kinds: { ...prefs.kinds, inbox: v } }, on)} />
            <Toggle label="Gamla plagg (måndagar)" checked={prefs.kinds.oldStock} onChange={(v) => void save({ ...prefs, kinds: { ...prefs.kinds, oldStock: v } }, on)} />
            <Toggle label="Bevakningar" checked={prefs.kinds.watch !== false} onChange={(v) => void save({ ...prefs, kinds: { ...prefs.kinds, watch: v } }, on)} />
          </>
        )}
      </Card>
    </Section>
  );
}

