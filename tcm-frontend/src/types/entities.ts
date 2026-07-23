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
  headerCode: string; // '260722'
  namaTestCase: string;
  jiraUrl: string;
  namaMenu: string;
  createdBy: string;
  createdAt: string;
}

export type TestType = 'Positive' | 'Negative';
export type TestCaseStatus = 'Not Executed' | 'Pass' | 'Fail' | 'Blocked' | 'On Hold';

export interface TestCaseItem {
  id: string;
  headerId: string;
  caseNo: string; // '260722-01'
  seqNo: number;
  featureName: string;
  testType: TestType;
  scenario: string;
  steps: string;
  testData?: string;
  expectedResult: string;
  status: TestCaseStatus;
  picQa: string; // user id
  picQaName?: string;
  testDate?: string;
  note?: string;
  picDev?: string;
  picDevName?: string;
  devArea?: 'FE' | 'BE';
  createdAt: string;
  updatedAt: string;
}

export type BugStatus = 'Open' | 'Ready to Test' | 'Reopen' | 'Closed' | 'Rejected';

export interface Attachment {
  id: string;
  fileUrl: string;
  fileName: string;
}

export interface Bug {
  id: string;
  bugNo: string; // 'BUG-260722-01'
  testCaseItemId?: string;
  testCaseNo?: string;
  reporterId: string;
  reporterName?: string;
  scenario: string;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  status: BugStatus;
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
