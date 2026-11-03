import { Globe } from 'lucide-react';
import { useState } from 'react';
import { deviceTimeZone } from '../../lib/dates/civil-date';
import { useApp } from '../../shell';
import { Button, useToast } from '../../ui';
import { ProfileSection } from './ProfileSection';

/**
 * The owner's time zone (docs/etapas/10-quadro-tarefa.md, decision 1), where today, late tasks and the done
 * column's 14 days count. When this device is in another one, "Usar o fuso deste aparelho" switches to it.
 */
export function TimeZoneSection() {
  const app = useApp();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const device = deviceTimeZone();
  async function adoptDevice() {
    setBusy(true);
    const refused = await app.setTimeZone(device);
    setBusy(false);
    // The server's words, as for a fixed offset: "Use o nome de um fuso horário, …".
    if (refused) toast(refused, 'error');
    else toast(`Fuso horário: ${device}.`);
  }
  return (
    <ProfileSection
      id="profile-time-zone"
      label="Fuso horário"
      description="Hoje, as tarefas atrasadas e os 14 dias da coluna de conclusão contam neste fuso."
    >
      <p className="profile-time-zone">
        <Globe size={16} aria-hidden="true" />
        {app.timeZone}
      </p>
      {device !== app.timeZone && (
        <div>
          <Button isPending={busy} onPress={() => void adoptDevice()}>
            Usar o fuso deste aparelho ({device})
          </Button>
        </div>
      )}
    </ProfileSection>
  );
}
