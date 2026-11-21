import { useState } from 'react';
import { Camera, FileText, Paperclip, Trash2 } from 'lucide-react';
import { store, useData } from '../../data/store';
import { addAttachment, deleteAttachment } from '../../data/actions';
import { live } from '../../domain/metrics';
import type { Attachment, AttachmentKind } from '../../domain/types';
import { Card, Section } from '../components/ui';
import { toast } from '../Boot';

const KINDS: AttachmentKind[] = ['kvitto', 'orderbekräftelse', 'tullfaktura', 'fraktkvitto', 'utbetalning', 'bankutdrag', 'mejl', 'annat'];

/** Underlag (bild, PDF eller inklistrad text) kopplat till ett verifikat eller en drop. */
export function Attachments({ voucherId, dropId }: { voucherId?: string; dropId?: string }) {
  const ds = useData();
  const [kind, setKind] = useState<AttachmentKind>(dropId ? 'orderbekräftelse' : 'kvitto');
  const [text, setText] = useState('');
  const [showText, setShowText] = useState(false);
  const list = live(ds.attachments).filter((a) => (voucherId ? a.voucherId === voucherId : a.dropId === dropId && !a.voucherId));
  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const f of Array.from(files)) {
      if (f.size > 15 * 1024 * 1024) {
        toast(`${f.name} är för stor (max 15 MB)`, 'error');
        continue;
      }
      await addAttachment(f, { voucherId: voucherId ?? null, dropId: dropId ?? null, kind });
    }
  };
  return (
    <Section title={`Underlag${list.length ? ` · ${list.length}` : ''}`}>
      <Card className="flex flex-col gap-3">
        {list.map((a) => (
          <AttachmentRow key={a.id} a={a} />
        ))}
        {!list.length && <p className="m-0 text-[14px] text-muted">Inget underlag ännu. Fota kvittot eller dra in en PDF.</p>}
        <select className="field" value={kind} onChange={(e) => setKind(e.target.value as AttachmentKind)} aria-label="Typ av underlag">
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k[0].toUpperCase() + k.slice(1)}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-3 gap-2">
          <label className="btn btn-soft cursor-pointer px-2 text-[14px]">
            <Camera size={16} aria-hidden /> Fota
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => void add(e.target.files)} />
          </label>
          <label
            className="btn btn-soft cursor-pointer px-2 text-[14px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void add(e.dataTransfer.files);
            }}
          >
            <Paperclip size={16} aria-hidden /> Fil
            <input type="file" accept="image/*,application/pdf" multiple className="sr-only" onChange={(e) => void add(e.target.files)} />
          </label>
          <button type="button" className="btn btn-soft px-2 text-[14px]" onClick={() => setShowText((x) => !x)}>
            <FileText size={16} aria-hidden /> Text
          </button>
        </div>
        {showText && (
          <div className="flex flex-col gap-2">
            <textarea className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder="Klistra in mejltext eller kvittotext" />
            <button
              type="button"
              className="btn btn-primary"
              disabled={!text.trim()}
              onClick={async () => {
                if (await addAttachment(null, { voucherId: voucherId ?? null, dropId: dropId ?? null, kind, text, size: text.length })) {
                  setText('');
                  setShowText(false);
                }
              }}
            >
              Spara text som underlag
            </button>
          </div>
        )}
      </Card>
    </Section>
  );
}

function AttachmentRow({ a }: { a: Attachment }) {
  const open = async () => {
    if (a.text) {
      const w = window.open('', '_blank');
      if (w) {
        w.document.title = a.name;
        const pre = w.document.createElement('pre');
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.font = '14px system-ui';
        pre.textContent = a.text;
        w.document.body.appendChild(pre);
      }
      return;
    }
    if (!a.blobKey) return;
    const b = await store().backend.getBlob(a.blobKey);
    if (!b) return toast('Filen finns inte på den här enheten', 'error');
    const url = URL.createObjectURL(b);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={open} className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 text-left">
        <Paperclip size={16} className="shrink-0 text-muted" aria-hidden />
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-medium">{a.name}</span>
          <span className="block text-[12px] text-muted">
            {a.kind} · {a.date} · {Math.max(1, Math.round(a.size / 1024))} kB
          </span>
        </span>
      </button>
      <button type="button" aria-label={`Ta bort ${a.name}`} className="grid h-10 w-10 place-items-center rounded-lg text-muted" onClick={() => void deleteAttachment(a.id)}>
        <Trash2 size={16} aria-hidden />
      </button>
    </div>
  );
}
