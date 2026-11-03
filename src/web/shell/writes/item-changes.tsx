import { createContext, type ReactNode, useContext, useState } from 'react';
import { createItemChanges, type ItemChanges } from '../../lib/writes/item-changes';

const ItemChangesContext = createContext<ItemChanges | null>(null);

/** The app's latest change of each document and drawing (lib/item-changes.ts), for the life of the app. */
export function ItemChangesProvider({ children }: { children: ReactNode }) {
  const [changes] = useState(createItemChanges);
  return <ItemChangesContext.Provider value={changes}>{children}</ItemChangesContext.Provider>;
}

export function useItemChanges() {
  const changes = useContext(ItemChangesContext);
  if (!changes) throw new Error('As mudanças dos itens estão indisponíveis.');
  return changes;
}
