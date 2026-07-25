export type Role = 'QA' | 'DEV';

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: Role;
}

export interface AuthSession {
  user: User;
  token: string;
}

export interface TestCaseHeader {
  id: string;
  headerCode: string;
  namaTestCase: string;
  sprint?: number | null;
  jiraUrl: string;
  namaMenu: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
}

export type TestType = 'Positive' | 'Negative';
export type TestCaseStatus = 'Not Executed' | 'Pass' | 'Fail' | 'Blocked' | 'On Hold';
export type DevTeam = 'Backend' | 'Frontend';

export interface TestCaseItem {
  id: string;
  headerId: string;
  caseNo: string;      // sekarang identifier acak (UUID-style), bukan lagi sequential
  seqNo: number;
  displayNo: number;   // NEW — nomor urut tampilan per header, dihitung otomatis
  featureName: string;
  testType: TestType;
  scenario: string;
  steps: string;
  testData?: string;
  expectedResult: string;
  status: TestCaseStatus;
  picQa: string;
  picQaName?: string;
  testDate?: string;
  note?: string;
  devArea?: DevTeam;        // NEW peran — ditampilkan sebagai kolom "PIC Dev"
  captureId?: string;       // NEW
  captureUrl?: string;      // NEW
  captureFileName?: string; // NEW
  createdAt: string;
  updatedAt: string;
}

export type BugStatus =
  | 'Open'
  | 'On Progress Dev'
  | 'Ready to Test'
  | 'On Progress QA'
  | 'Reopen'
  | 'Close'
  | 'Take Out'
  | 'Hold';

export type Severity = 'Critical' | 'Major' | 'Medium' | 'Low';
export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';

export interface Attachment {
  id: string;
  fileUrl: string;
  fileName: string;
}

export interface Bug {
    id: string;
    bugNo: string;
    testCaseItemId?: string;
    testCaseNo?: string;
    testCaseHeaderCode?: string;
    testCaseHeaderName?: string;
    reporterId: string;
    reporterName?: string;
    scenario: string;
    stepsToReproduce: string;
    expectedResult: string;
    actualResult: string;
    status: BugStatus;
    severity: Severity;
    priority: Priority;
    assignedTo?: string;
    assignedToName?: string;
    attachments: Attachment[];
    createdAt: string;
    updatedAt: string;
  }

export interface BugComment {
  id: string;
  bugId: string;
  userId: string;
  userName: string;
  comment: string;
  createdAt: string;
}

export interface BugStatusHistory {
  id: string;
  bugId: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string;
  changedAt: string;
}

export type MonitoringCategory = 'Complete' | 'On Progress' | 'Hold';

export interface TestCaseMonitoring {
  headerId: string;
  headerCode: string;
  namaTestCase: string;
  totalCase: number;
  executedCase: number;
  percentage: number;
  category: MonitoringCategory;
  picQaNames: string;
}

export interface BugMonitoring {
  status: BugStatus;
  assignedToName: string | null;
  totalBug: number;
}
