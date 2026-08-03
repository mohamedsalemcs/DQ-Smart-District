/** Human-readable transaction number, separate from nanoid record IDs. */
export const formatTxn = (n: number) => `DQ-2026-${String(n).padStart(6, '0')}`;
