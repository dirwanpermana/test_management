import type {
  User, TestCaseHeader, TestCaseItem, Bug, BugComment, BugStatusHistory,
} from '../types/entities';

// --- Users -------------------------------------------------------------
export const users: User[] = [
  { id: 'u-qa-1', username: 'qa1', fullName: 'Siti (QA)', email: 'qa1@kopnus.com', role: 'QA' },
  { id: 'u-qa-2', username: 'qa2', fullName: 'Andi (QA)', email: 'qa2@kopnus.com', role: 'QA' },
  { id: 'u-dev-1', username: 'dev1', fullName: 'Budi (Dev FE)', email: 'dev1@kopnus.com', role: 'DEV' },
  { id: 'u-dev-2', username: 'dev2', fullName: 'Rani (Dev BE)', email: 'dev2@kopnus.com', role: 'DEV' },
];

// password for ALL mock users: "password123"
export const credentials: Record<string, string> = {
  qa1: 'password123',
  qa2: 'password123',
  dev1: 'password123',
  dev2: 'password123',
};

export const findUser = (id: string) => users.find((u) => u.id === id);

// --- Daily counters (mirrors Postgres test_case_daily_counter / bug_daily_counter) --
export const dailyCounters = {
  testCase: new Map<string, number>(),
  bug: new Map<string, number>(),
};

export function nextSeq(store: Map<string, number>, dateKey: string): number {
  const current = store.get(dateKey) ?? 0;
  const next = current + 1;
  store.set(dateKey, next);
  return next;
}

export function todayCode(): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

// --- Test Case Headers & Items -----------------------------------------
export const testCaseHeaders: TestCaseHeader[] = [
  {
    id: 'h-1',
    headerCode: todayCode(),
    namaTestCase: 'Login Module',
    jiraUrl: 'https://jira.kopnus.com/browse/QA-101',
    namaMenu: 'Login',
    createdBy: 'u-qa-1',
    createdAt: new Date().toISOString(),
  },
];

export const testCaseItems: TestCaseItem[] = [];

// seed 2 example rows under header h-1
(function seedItems() {
  const code = testCaseHeaders[0].headerCode;
  const rows: Array<Partial<TestCaseItem>> = [
    {
      featureName: 'Login',
      testType: 'Positive',
      scenario: 'Login dengan username & password valid',
      steps: '1. Buka halaman login\n2. Isi username & password valid\n3. Klik tombol Login',
      testData: 'username: qa1 / password: password123',
      expectedResult: 'User berhasil login dan diarahkan ke dashboard',
      status: 'Pass',
      picQa: 'u-qa-1',
      testDate: new Date().toISOString().slice(0, 10),
      picDev: 'u-dev-1',
      devArea: 'FE',
    },
    {
      featureName: 'Login',
      testType: 'Negative',
      scenario: 'Login dengan password salah',
      steps: '1. Buka halaman login\n2. Isi username valid, password salah\n3. Klik tombol Login',
      testData: 'username: qa1 / password: salahpassword',
      expectedResult: 'Muncul pesan error "Username atau password salah"',
      status: 'Fail',
      picQa: 'u-qa-1',
      testDate: new Date().toISOString().slice(0, 10),
      picDev: 'u-dev-2',
      devArea: 'BE',
    },
  ];
  rows.forEach((r) => {
    const seq = nextSeq(dailyCounters.testCase, code);
    const now = new Date().toISOString();
    testCaseItems.push({
      id: `tci-${seq}`,
      headerId: 'h-1',
      caseNo: `${code}-${String(seq).padStart(2, '0')}`,
      seqNo: seq,
      featureName: r.featureName!,
      testType: r.testType!,
      scenario: r.scenario!,
      steps: r.steps!,
      testData: r.testData,
      expectedResult: r.expectedResult!,
      status: r.status as TestCaseItem['status'],
      picQa: r.picQa!,
      testDate: r.testDate,
      picDev: r.picDev,
      devArea: r.devArea,
      createdAt: now,
      updatedAt: now,
    });
  });
})();

// --- Bugs ----------------------------------------------------------------
export const bugs: Bug[] = [];
export const bugComments: BugComment[] = [];
export const bugStatusHistory: BugStatusHistory[] = [];

// Allowed transitions: from_status -> to_status -> allowed role
export const bugStatusTransitions: Array<{ from: string; to: string; role: 'QA' | 'DEV' }> = [
  { from: 'Open', to: 'Ready to Test', role: 'DEV' },
  { from: 'Ready to Test', to: 'Reopen', role: 'QA' },
  { from: 'Ready to Test', to: 'Closed', role: 'QA' },
  { from: 'Reopen', to: 'Ready to Test', role: 'DEV' },
  { from: 'Open', to: 'Rejected', role: 'QA' },
];
