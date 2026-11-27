// Rutan på Idag: klistra in en Doorzo-länk direkt, så öppnas inköpet med plagget ifyllt.
import { useState } from 'react';
import { ClipboardPaste, Link2 } from 'lucide-react';
import { findLinks } from '../../domain/doorzolink';
import { openDoorzo } from '../Quick';
import { toast } from '../Boot';

export function DoorzoBar() {
  const [text, setText] = useState('');
  const take = (v: string) => {
    if (findLinks(v).length) {
      setText('');
      openDoorzo(v);
    } else setText(v);
  };
  const paste = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (findLinks(t).length) openDoorzo(t);
      else toast('Ingen Doorzo-länk i urklipp. Kopiera länken på Doorzo först.');
    } catch {
      openDoorzo();
    }
  };
  return (
    <div className="card flex items-center gap-2 p-2 pl-3">
      <Link2 size={18} className="shrink-0 text-accent" aria-hidden />
      <input
        className="min-w-0 flex-1 bg-transparent py-2 text-[16px] outline-none placeholder:text-muted"
        inputMode="url"
        value={text}
        onChange={(e) => take(e.target.value)}
        placeholder="Köpt på Doorzo? Klistra in länken"
        aria-label="Klistra in Doorzo-länk"
      />
      <button type="button" onClick={() => void paste()} className="btn btn-primary min-h-[44px] shrink-0 px-3.5 text-[14px]" aria-label="Klistra in Doorzo-länk från urklipp">
        <ClipboardPaste size={17} aria-hidden /> Klistra in
      </button>
    </div>
  );
}
