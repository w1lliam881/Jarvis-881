import { useState } from 'react';
import { go } from '../router';
import { CheckCircle2, AlertTriangle, Upload } from 'lucide-react';
import { store, useData } from '../../data/store';
import { emptyDataset } from '../../domain/defaults';
import { importV14, reconcile, type Reconciliation, type V14Export } from '../../domain/import-v14';
import { kr } from '../../domain/money';
import { Card, Field, cx } from '../components/ui';
import { deviceUser, setDeviceUser, toast } from '../Boot';
import { startGame } from '../../game/engine';
import type { Dataset } from '../../domain/types';

/** Första start: vem är du, och importera data från v14. */
export function Welcome() {
  const ds = useData();
  const [name, setName] = useState(deviceUser());
  const [named, setNamed] = useState(!!deviceUser() || !!store().backend.email);
  const hasData = ds.drops.length > 0 || ds.vouchers.length > 0;

  if (!named)
    return (
      <Shell>
        <h1 className="m-0 font-serif text-[34px] font-semibold">Välkommen till Jarvis</h1>
        <p className="text-on-forest-muted">Lager, försäljning och bokföring för 881 på ett ställe.</p>
        <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-surface p-4 text-text">
          <Field label="Vad heter du?" hint="Syns i ändringsloggen så att ni ser vem som ändrat vad.">
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <button
            className="btn btn-primary"
            disabled={!name.trim()}
            onClick={() => {
              setDeviceUser(name.trim());
              setNamed(true);
              if (hasData) void store().reload();
            }}
          >
            Fortsätt
          </button>
        </div>
      </Shell>
    );
  return (
    <Shell>
      <h1 className="m-0 font-serif text-[30px] font-semibold">Hämta din data</h1>
      <p className="text-on-forest-muted">Importera från Jarvis v14. Inget i den gamla versionen ändras.</p>
      <div className="mt-4 rounded-2xl bg-surface p-4 text-text">
        <Importer />
      </div>
      <button
        className="mt-4 text-[14px] text-on-forest-muted underline"
        onClick={async () => {
          await startEmpty(emptyDataset());
        }}
      >
        Börja utan data
      </button>
    </Shell>
  );
}

async function startEmpty(d: Dataset) {
  d.settings.migratedAt = new Date().toISOString();
  d.settings.gameStartedAt = new Date().toISOString();
  await store().replaceAll(d, 'Start utan data');
  go('#/idag');
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-forest text-on-forest">
      <div className="safe-top mx-auto max-w-[560px] px-5 pb-10 pt-10">{children}</div>
    </div>
  );
}

/** Import med avstämning. Används vid första start och under Mer → Import. */
export function Importer({ onDone }: { onDone?: () => void }) {
  const [src, setSrc] = useState<V14Export | null>(null);
  const [result, setResult] = useState<{ ds: Dataset; recon: Reconciliation; warnings: string[] } | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = (json: V14Export) => {
    try {
      const { dataset, warnings } = importV14(json, 'import');
      setSrc(json);
      setResult({ ds: dataset, recon: reconcile(json, dataset), warnings });
      setErr('');
    } catch (e) {
      setErr(`Filen kunde inte läsas: ${(e as Error).message}`);
    }
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      load(j.data && j.format === 'jarvis-2' ? j.data : j);
    } catch {
      setErr('Filen är inte en giltig JSON-fil från Jarvis.');
    }
  };
  const approve = async () => {
    if (!result) return;
    setBusy(true);
    const d = result.ds;
    d.settings.gameStartedAt = new Date().toISOString();
    d.game.badgeBaseline = startGame(d).baseline;
    go('#/idag');
    try {
      await store().replaceAll(d, 'Import från v14');
    } catch (e) {
      setBusy(false);
      setErr(`Importen misslyckades och ingenting ändrades: ${(e as Error).message}`);
      return;
    }
    // Räkna om automatiska verifikat direkt (exakt ett per händelse)
    await store().save('Bokföringen avstämd efter import', () => [{ settings: store().ds!.settings }], { undoable: false });
    setBusy(false);
    toast('Importen är klar');
    onDone?.();
  };

  if (!src)
    return (
      <div className="flex flex-col gap-3">
        <label className="btn btn-primary cursor-pointer">
          <Upload size={18} aria-hidden /> Välj fil från v14
          <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <p className="m-0 text-[13px] text-muted">I v14: Idag → Mer → Säkerhetskopior → "Ladda ner kopia". Du kan också välja en säkerhetskopia från Jarvis 2.0.</p>
        {import.meta.env.MODE === 'preview' && <PreviewFixture onLoad={load} />}
        {err && <p className="m-0 text-[14px] text-hi">{err}</p>}
      </div>
    );
  if (!result) return null;
  return (
    <div className="flex flex-col gap-3">
      <MigrationReport recon={result.recon} warnings={result.warnings} />
      {err && <p className="m-0 text-[14px] text-hi">{err}</p>}
      <div className="flex gap-2">
        <button className="btn btn-ghost flex-1" onClick={() => (setSrc(null), setResult(null))}>
          Avbryt
        </button>
        <button className="btn btn-primary flex-1" disabled={busy} onClick={approve}>
          {busy ? 'Importerar…' : 'Godkänn och importera'}
        </button>
      </div>
      <p className="m-0 text-[12px] text-muted">En säkerhetskopia av nuvarande data tas automatiskt innan importen.</p>
    </div>
  );
}

function PreviewFixture({ onLoad }: { onLoad: (j: V14Export) => void }) {
  return (
    <button
      className="btn btn-soft"
      onClick={async () => {
        const m = await import('../../../fixtures/v14-audit.json');
        onLoad(m.default as unknown as V14Export);
      }}
    >
      Använd audit-filen från v14 (förhandsvisning)
    </button>
  );
}

export function MigrationReport({ recon, warnings }: { recon: Reconciliation; warnings: string[] }) {
  const fmt = (n: number, unit: 'st' | 'öre') => (unit === 'öre' ? kr(n, { decimals: true }) : `${n} st`);
  const accBad = recon.accounts.filter((a) => !a.ok);
  return (
    <div className="flex flex-col gap-3">
      <div className={cx('flex items-center gap-2 rounded-xl p-3 text-[14px] font-semibold', recon.ok ? 'bg-lo-bg text-lo' : 'bg-me-bg text-me')}>
        {recon.ok ? <CheckCircle2 size={18} aria-hidden /> : <AlertTriangle size={18} aria-hidden />}
        {recon.ok ? 'Alla siffror stämmer mot v14' : 'Några siffror skiljer sig, se nedan'}
      </div>
      <Card pad={false}>
        <table className="w-full text-[14px]">
          <thead>
            <tr className="text-left text-[12px] text-muted">
              <th className="px-3 py-2 font-medium">Kontroll</th>
              <th className="px-3 py-2 text-right font-medium">v14</th>
              <th className="px-3 py-2 text-right font-medium">Jarvis 2.0</th>
            </tr>
          </thead>
          <tbody>
            {recon.lines.map((l) => (
              <tr key={l.label} className="border-t border-line-2">
                <td className="px-3 py-2">{l.label}</td>
                <td className="num px-3 py-2 text-right">{fmt(l.source, l.unit)}</td>
                <td className={cx('num px-3 py-2 text-right', l.ok ? 'text-pos' : 'text-neg')}>{fmt(l.target, l.unit)}</td>
              </tr>
            ))}
            <tr className="border-t border-line-2">
              <td className="px-3 py-2">Saldo per konto ({recon.accounts.length} konton)</td>
              <td className="px-3 py-2" />
              <td className={cx('px-3 py-2 text-right', accBad.length ? 'text-neg' : 'text-pos')}>{accBad.length ? `${accBad.length} avviker` : 'Stämmer'}</td>
            </tr>
          </tbody>
        </table>
      </Card>
      {recon.ledgerChanges.details.length > 0 && (
        <Card>
          <div className="mb-1 font-semibold">Bokföringen räknas om efter importen</div>
          <p className="m-0 mb-2 text-[13px] text-muted">
            Automatiska verifikat räknas fram från plaggen. Det här är skillnaderna mot hur v14 senast sparade dem. Försäljning av äldre plagg bokförs nu per månad de såldes, och sålda plagg som saknade verifikat får ett.
          </p>
          <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[13px]">
            {recon.ledgerChanges.details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </Card>
      )}
      {warnings.length > 0 && (
        <Card>
          <div className="mb-1 font-semibold">Varningar</div>
          <ul className="m-0 list-disc pl-5 text-[13px]">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
