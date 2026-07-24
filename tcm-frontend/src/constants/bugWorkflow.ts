import type { BugStatus, Role } from '../types/entities';

export const ALL_BUG_STATUSES: BugStatus[] = [
  'Open', 'On Progress Dev', 'Ready to Test', 'On Progress QA',
  'Reopen', 'Close', 'Take Out', 'Hold',
];

// DEV hanya boleh mengubah status ke dua nilai ini. QA boleh ke status manapun.
// Backend WAJIB memvalidasi aturan yang sama (lihat bugService.isTransitionAllowed) —
// daftar di sini hanya mengontrol opsi mana yang tampil di UI, bukan enforcement sesungguhnya.
const DEV_ALLOWED_STATUSES: BugStatus[] = ['Ready to Test', 'On Progress Dev'];

export function allowedStatusesForRole(role?: Role): BugStatus[] {
  if (role === 'QA') return ALL_BUG_STATUSES;
  if (role === 'DEV') return DEV_ALLOWED_STATUSES;
  return [];
}
