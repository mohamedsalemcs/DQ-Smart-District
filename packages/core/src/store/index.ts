import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { PersonaKind, ToastMsg } from '../types';
import type { Store } from './storeTypes';
import { buildSeed } from './seed';
import { nowISO } from '../lib/time';
import { createPermitsSlice } from './slices/permits';
import { createRequestsSlice } from './slices/requests';
import { createViolationsSlice } from './slices/violations';
import { createIncidentsSlice } from './slices/incidents';
import { createMahadirSlice } from './slices/mahadir';
import { createGatesSlice } from './slices/gates';
import { createSensorsSlice } from './slices/sensors';
import { createBookingsSlice } from './slices/bookings';
import { createSecurityOpsSlice } from './slices/securityOps';
import { createEmbassySlice } from './slices/embassy';
import { createVisitorsSlice } from './slices/visitors';

const seed = buildSeed();

export const useStore = create<Store>()((set, get) => ({
  ...seed,
  audit: [],
  persona: 'resident' as PersonaKind,
  toasts: [],
  demoSpeed: 1,

  /* system */
  setPersona: (p) => set({ persona: p }),

  pushToast: (titleAr, bodyAr, tone = 'info') => {
    const toast: ToastMsg = { id: nanoid(6), titleAr, bodyAr, tone };
    set((s) => ({ toasts: [...s.toasts.slice(-3), toast] }));
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  /* audit — every mutation in every slice calls this; no exceptions */
  appendAudit: (entity, entityId, action, before, after) => {
    const s = get();
    set((st) => ({
      audit: [
        { id: nanoid(8), atISO: nowISO(), actorId: s.currentUsers[s.persona], entity, entityId, action, before, after },
        ...st.audit,
      ],
    }));
  },

  /* notifications */
  notify: (to, titleAr, bodyAr, deepLink, severity = 'info') => {
    set((st) => ({
      notifications: [
        { id: nanoid(8), toPersonaOrPerson: to, titleAr, bodyAr, atISO: nowISO(), read: false, deepLink, severity },
        ...st.notifications,
      ],
    }));
  },
  markAllRead: (persona) => {
    const s = get();
    const personId = s.currentUsers[persona];
    set((st) => ({
      notifications: st.notifications.map((n) =>
        n.toPersonaOrPerson === persona || n.toPersonaOrPerson === personId ? { ...n, read: true } : n,
      ),
    }));
  },
  markRead: (id) => {
    set((st) => ({ notifications: st.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
  },

  ...createPermitsSlice(set, get),
  ...createRequestsSlice(set, get),
  ...createViolationsSlice(set, get),
  ...createIncidentsSlice(set, get),
  ...createMahadirSlice(set, get),
  ...createGatesSlice(set, get),
  ...createSensorsSlice(set, get),
  ...createBookingsSlice(set, get),
  ...createSecurityOpsSlice(set, get),
  ...createEmbassySlice(set, get),
  ...createVisitorsSlice(set, get),
}));

/** NOTE: derived arrays must be memoized in components (zustand snapshot identity) —
 *  never `useStore((s) => s.x.filter(...))` directly. */
