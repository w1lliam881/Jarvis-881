// Morgonbriefingen: första gången du öppnar Jarvis efter att Advisor skickat dagens briefing
// fälls telefonen med Advisor upp av sig själv. En gång per dag.
import { useEffect, useState } from 'react';
import { useAgentChat, markSeen } from '../../data/chat';
import { agentById, todaysBriefing } from '../../domain/agents';
import { villageTheme } from '../../domain/season';
import { useAgentRuns } from '../screens/Byn';
import { Phone } from '../screens/ByChat';

const KEY = 'jarvis-briefing-visad';

function shownId(): string {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

export function MorningBriefing({ enabled }: { enabled: boolean }) {
  const chat = useAgentChat();
  const [open, setOpen] = useState(false);
  const brief = chat.msgs ? todaysBriefing(chat.msgs) : null;
  useEffect(() => {
    if (!enabled || !brief || open || shownId() === brief.id) return;
    try {
      localStorage.setItem(KEY, brief.id);
    } catch {
      /* ingen lagring: visas bara den här gången */
    }
    setOpen(true);
  }, [enabled, brief, open]);
  if (!open) return null;
  return <BriefingPhone chat={chat} onClose={() => setOpen(false)} />;
}

function BriefingPhone({ chat, onClose }: { chat: ReturnType<typeof useAgentChat>; onClose: () => void }) {
  const { runs } = useAgentRuns();
  const def = agentById('advisor');
  if (!def) return null;
  return (
    <Phone
      def={def}
      runs={(runs ?? []).filter((r) => r.agent === 'advisor')}
      chat={chat}
      xmas={villageTheme(new Date()).xmas}
      onClose={() => {
        markSeen('dm:advisor');
        onClose();
      }}
    />
  );
}
