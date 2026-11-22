import { useEffect, useState } from 'react';
import { BookOpen, Calculator, CalendarClock, Clapperboard, Database, Gamepad2, History, Languages, LineChart, Settings as Cog, Upload, Wallet } from 'lucide-react';
import { store, useData } from '../../data/store';
import { updateSettings } from '../../data/actions';
import type { BackupInfo } from '../../data/backend';
import type { ChangeLogEntry, Dataset } from '../../domain/types';
import { backupJson } from '../../domain/export';
import { todayISO } from '../../domain/dates';
import type { Route } from '../router';
import { Card, ConfirmButton, Field, Page, Row, Section, Segmented, TextInput, Toggle, TopBand } from '../components/ui';
import { Importer } from './Welcome';
import { deviceUser, setDeviceUser, toast } from '../Boot';

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
      <TopBand title="Mer" sub={`Inloggad som ${deviceUser()}`} />
      <Page>
        <Section title="Planering">
          <Card pad={false}>
            {item('#/planering/kalkyl', Calculator, 'Kalkyl', 'Räkna på Doorzo-plagg innan du köper')}
            {item('#/planering/framtid', Wallet, 'Framtid och budget', 'Maxpris per kategori, orderplan och mål')}
            {item('#/planering/doorzo', Languages, 'Doorzo-sökningar', 'Svenska till japanska söktermer')}
            {item('#/planering/marknad', LineChart, 'Marknadsföring', 'Dina TikTok-klipp och vad som fungerar')}
            {item('#/planering/video', Clapperboard, 'Videoidéer', 'Idéer och bedömning av dina egna')}
          </Card>
        </Section>
        {ds.settings.gameEnabled && (
          <Card pad={false}>
            {item('#/spelet', Gamepad2, 'Spelet', 'Uppdrag, världar och bossar')}
          </Card>
        )}
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
        <p className="m-0 px-1 text-[12px] text-muted">
          Jarvis 2.0 · lagring: {store().backend.kind === 'supabase' ? 'Supabase (EU)' : store().backend.kind === 'local' ? 'den här enheten' : 'tillfällig (sparas inte)'} · driftkostnad 0 kr/mån
        </p>
      </Page>
    </>
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
        <Section title="Spelet">
          <Card>
            <Toggle label="Visa spelet" checked={s.gameEnabled} onChange={(v) => void updateSettings({ gameEnabled: v })} />
            <Toggle label="Ljud i spelet" checked={s.gameSound} onChange={(v) => void updateSettings({ gameSound: v })} />
          </Card>
        </Section>
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
  useEffect(() => void store().backend.changelog(200).then(setList), []);
  return (
    <>
      <TopBand title="Ändringslogg" back="#/mer" sub="De senaste 200 ändringarna" />
      <Page>
        <Card pad={false}>
          {list?.map((e) => (
            <div key={e.id} className="border-b border-line-2 px-4 py-2.5 last:border-0">
              <div className="flex justify-between gap-2 text-[14px]">
                <span className="truncate">{e.summary}</span>
                <span className="shrink-0 text-[12px] text-muted">{e.action}</span>
              </div>
              <div className="text-[12px] text-muted">
                {e.by} · {new Date(e.at).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })}
              </div>
            </div>
          ))}
          {list && !list.length && <p className="m-0 p-4 text-muted">Inga ändringar ännu.</p>}
        </Card>
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
        {q('Tangentbord på dator', 'n = ny försäljning, k = ny kostnad, u = ny uppgift, 1–5 = flikarna.')}
      </Page>
    </>
  );
}
