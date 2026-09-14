let _whatsapp: ((msg: string) => Promise<void>) | null = null;

/** Owner notifications (WhatsApp). */
export function registerCriticalNotifier(fn: (msg: string) => Promise<void>): void {
  _whatsapp = fn;
}

/** All owner notifications go to WhatsApp. */
export async function notifyOwner(msg: string): Promise<void> {
  if (_whatsapp) await _whatsapp(msg).catch(() => {});
}

/** Force WhatsApp (critical path). */
export async function notifyOwnerCritical(msg: string): Promise<void> {
  if (_whatsapp) await _whatsapp(msg).catch(() => {});
}

/** Routine notification (also via WhatsApp). */
export async function notifyOwnerRoutine(msg: string): Promise<void> {
  if (_whatsapp) await _whatsapp(msg).catch(() => {});
}
