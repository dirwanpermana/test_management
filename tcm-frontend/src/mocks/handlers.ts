import { http, HttpResponse } from 'msw';
import {
  users, credentials, findUser, testCaseHeaders, testCaseItems, bugs, bugComments,
  bugStatusHistory, bugStatusTransitions, dailyCounters, nextSeq, todayCode,
} from './seedData';
import type { Role, TestCaseItem, Bug, BugStatus } from '../types/entities';

const API = '/api';

// ---- fake JWT (mock only — real backend must issue a signed JWT) --------
function encodeToken(payload: Record<string, unknown>) {
  return `mock.${btoa(JSON.stringify(payload))}.signature`;
}
function decodeToken(authHeader: string | null): { sub: string; role: Role } | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const raw = authHeader.replace('Bearer ', '').split('.')[1];
    return JSON.parse(atob(raw));
  } catch {
    return null;
  }
}

function requireAuth(request: Request) {
  return decodeToken(request.headers.get('Authorization'));
}

function withPicNames(item: TestCaseItem): TestCaseItem {
  return {
    ...item,
    picQaName: findUser(item.picQa)?.fullName,
    picDevName: item.picDev ? findUser(item.picDev)?.fullName : undefined,
  };
}

function withBugNames(bug: Bug): Bug {
  return {
    ...bug,
    reporterName: findUser(bug.reporterId)?.fullName,
    assignedToName: bug.assignedTo ? findUser(bug.assignedTo)?.fullName : undefined,
  };
}

export const handlers = [
  // ---------------- AUTH ----------------
  http.post(`${API}/auth/login`, async ({ request }) => {
    const { username, password } = (await request.json()) as { username: string; password: string };
    const user = users.find((u) => u.username === username);
    if (!user || credentials[username] !== password) {
      return HttpResponse.json({ message: 'Username atau password salah' }, { status: 401 });
    }
    const token = encodeToken({ sub: user.id, role: user.role, username: user.username });
    return HttpResponse.json({ user, token });
  }),

  http.get(`${API}/users`, ({ request }) => {
    const auth = requireAuth(request);
    if (!auth) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const url = new URL(request.url);
    const role = url.searchParams.get('role');
    const result = role ? users.filter((u) => u.role === role) : users;
    return HttpResponse.json(result);
  }),

  // ---------------- TEST CASE HEADERS ----------------
  http.get(`${API}/test-case-headers`, ({ request }) => {
    if (!requireAuth(request)) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return HttpResponse.json(testCaseHeaders);
  }),

  http.post(`${API}/test-case-headers`, async ({ request }) => {
    const auth = requireAuth(request);
    if (!auth) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (auth.role !== 'QA') return HttpResponse.json({ message: 'Forbidden: hanya QA' }, { status: 403 });

    const body = (await request.json()) as { namaTestCase: string; jiraUrl: string; namaMenu: string };
    const header = {
      id: `h-${testCaseHeaders.length + 1}`,
      headerCode: todayCode(),
      namaTestCase: body.namaTestCase,
      jiraUrl: body.jiraUrl,
      namaMenu: body.namaMenu,
      createdBy: auth.sub,
      createdAt: new Date().toISOString(),
    };
    testCaseHeaders.push(header);
    return HttpResponse.json(header, { status: 201 });
  }),

  // ---------------- TEST CASE ITEMS ----------------
  http.get(`${API}/test-case-items`, ({ request }) => {
    if (!requireAuth(request)) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const url = new URL(request.url);
    const headerId = url.searchParams.get('headerId');
    const result = (headerId ? testCaseItems.filter((i) => i.headerId === headerId) : testCaseItems)
      .map(withPicNames);
    return HttpResponse.json(result);
  }),

  http.post(`${API}/test-case-headers/:headerId/items`, async ({ request, params }) => {
    const auth = requireAuth(request);
    if (!auth) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (auth.role !== 'QA') return HttpResponse.json({ message: 'Forbidden: hanya QA' }, { status: 403 });

    const headerId = params.headerId as string;
    const header = testCaseHeaders.find((h) => h.id === headerId);
    if (!header) return HttpResponse.json({ message: 'Header tidak ditemukan' }, { status: 404 });

    const body = (await request.json()) as Partial<TestCaseItem>;
    // NOTE: numbering global per-hari (lintas header) — lihat asumsi A1 di dokumen rancangan
    const code = todayCode();
    const seq = nextSeq(dailyCounters.testCase, code);
    const now = new Date().toISOString();
    const item: TestCaseItem = {
      id: `tci-${Date.now()}`,
      headerId,
      caseNo: `${code}-${String(seq).padStart(2, '0')}`,
      seqNo: seq,
      featureName: body.featureName ?? '',
      testType: body.testType ?? 'Positive',
      scenario: body.scenario ?? '',
      steps: body.steps ?? '',
      testData: body.testData,
      expectedResult: body.expectedResult ?? '',
      status: body.status ?? 'Not Executed',
      picQa: body.picQa ?? auth.sub,
      testDate: body.testDate,
      note: body.note,
      picDev: body.picDev,
      devArea: body.devArea,
      createdAt: now,
      updatedAt: now,
    };
    testCaseItems.push(item);
    return HttpResponse.json(withPicNames(item), { status: 201 });
  }),

  http.put(`${API}/test-case-items/:id`, async ({ request, params }) => {
    const auth = requireAuth(request);
    if (!auth) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (auth.role !== 'QA') return HttpResponse.json({ message: 'Forbidden: hanya QA' }, { status: 403 });

    const idx = testCaseItems.findIndex((i) => i.id === params.id);
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 });

    const body = (await request.json()) as Partial<TestCaseItem>;
    testCaseItems[idx] = { ...testCaseItems[idx], ...body, updatedAt: new Date().toISOString() };
    return HttpResponse.json(withPicNames(testCaseItems[idx]));
  }),

  http.delete(`${API}/test-case-items/:id`, ({ request, params }) => {
    const auth = requireAuth(request);
    if (!auth) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (auth.role !== 'QA') return HttpResponse.json({ message: 'Forbidden: hanya QA' }, { status: 403 });

    const idx = testCaseItems.findIndex((i) => i.id === params.id);
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    testCaseItems.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // ---------------- BUGS ----------------
  http.get(`${API}/bugs`, ({ request }) => {
    if (!requireAuth(request)) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return HttpResponse.json(bugs.map(withBugNames));
  }),

  http.get(`${API}/bugs/:id`, ({ request, params }) => {
    if (!requireAuth(request)) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const bug = bugs.find((b) => b.id === params.id);
    if (!bug) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    return HttpResponse.json({
      bug: withBugNames(bug),
      comments: bugComments.filter((c) => c.bugId === bug.id),
      history: bugStatusHistory.filter((h) => h.bugId === bug.id),
    });
  }),

  http.post(`${API}/bugs`, async ({ request }) => {
    const auth = requireAuth(request);
    if (!auth) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (auth.role !== 'QA') return HttpResponse.json({ message: 'Forbidden: hanya QA' }, { status: 403 });

    const body = (await request.json()) as Partial<Bug> & { testCaseNo?: string };
    const code = todayCode();
    const seq = nextSeq(dailyCounters.bug, code);
    const now = new Date().toISOString();
    const testCaseItem = testCaseItems.find((i) => i.caseNo === body.testCaseNo);

    const bug: Bug = {
      id: `bug-${Date.now()}`,
      bugNo: `BUG-${code}-${String(seq).padStart(2, '0')}`,
      testCaseItemId: testCaseItem?.id,
      testCaseNo: body.testCaseNo,
      reporterId: auth.sub,
      scenario: body.scenario ?? '',
      stepsToReproduce: body.stepsToReproduce ?? '',
      expectedResult: body.expectedResult ?? '',
      actualResult: body.actualResult ?? '',
      status: 'Open',
      assignedTo: body.assignedTo,
      attachments: [],
      createdAt: now,
      updatedAt: now,
    };
    bugs.push(bug);
    bugStatusHistory.push({
      id: `bsh-${Date.now()}`, bugId: bug.id, fromStatus: null, toStatus: 'Open',
      changedBy: auth.sub, changedAt: now,
    });
    return HttpResponse.json(withBugNames(bug), { status: 201 });
  }),

  http.patch(`${API}/bugs/:id/status`, async ({ request, params }) => {
    const auth = requireAuth(request);
    if (!auth) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const bug = bugs.find((b) => b.id === params.id);
    if (!bug) return HttpResponse.json({ message: 'Not found' }, { status: 404 });

    const { status: toStatus } = (await request.json()) as { status: BugStatus };
    const allowed = bugStatusTransitions.some(
      (t) => t.from === bug.status && t.to === toStatus && t.role === auth.role,
    );
    if (!allowed) {
      return HttpResponse.json(
        { message: `Transisi status '${bug.status}' -> '${toStatus}' tidak diizinkan untuk role ${auth.role}` },
        { status: 403 },
      );
    }
    const from = bug.status;
    bug.status = toStatus;
    bug.updatedAt = new Date().toISOString();
    bugStatusHistory.push({
      id: `bsh-${Date.now()}`, bugId: bug.id, fromStatus: from, toStatus,
      changedBy: auth.sub, changedAt: bug.updatedAt,
    });
    return HttpResponse.json(withBugNames(bug));
  }),

  http.post(`${API}/bugs/:id/comments`, async ({ request, params }) => {
    const auth = requireAuth(request);
    if (!auth) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const bug = bugs.find((b) => b.id === params.id);
    if (!bug) return HttpResponse.json({ message: 'Not found' }, { status: 404 });

    const { comment } = (await request.json()) as { comment: string };
    const c = {
      id: `bc-${Date.now()}`,
      bugId: bug.id,
      userId: auth.sub,
      userName: findUser(auth.sub)?.fullName ?? auth.sub,
      comment,
      createdAt: new Date().toISOString(),
    };
    bugComments.push(c);
    return HttpResponse.json(c, { status: 201 });
  }),

  // ---------------- MONITORING ----------------
  http.get(`${API}/monitoring/test-cases`, ({ request }) => {
    if (!requireAuth(request)) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const result = testCaseHeaders.map((h) => {
      const items = testCaseItems.filter((i) => i.headerId === h.id);
      const executed = items.filter((i) => ['Pass', 'Fail', 'Blocked'].includes(i.status));
      const hasHold = items.some((i) => i.status === 'On Hold');
      const category = hasHold ? 'Hold' : (executed.length === items.length && items.length > 0 ? 'Complete' : 'On Progress');
      const picNames = Array.from(new Set(items.map((i) => findUser(i.picQa)?.fullName).filter(Boolean)));
      return {
        headerId: h.id,
        headerCode: h.headerCode,
        namaTestCase: h.namaTestCase,
        totalCase: items.length,
        executedCase: executed.length,
        percentage: items.length ? Math.round((executed.length / items.length) * 10000) / 100 : 0,
        category,
        picQaNames: picNames.join(', '),
      };
    });
    return HttpResponse.json(result);
  }),

  http.get(`${API}/monitoring/bugs`, ({ request }) => {
    if (!requireAuth(request)) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const map = new Map<string, number>();
    bugs.forEach((b) => {
      const key = `${b.status}::${b.assignedTo ? findUser(b.assignedTo)?.fullName : '-'}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    const result = Array.from(map.entries()).map(([key, totalBug]) => {
      const [status, assignedToName] = key.split('::');
      return { status, assignedToName: assignedToName === '-' ? null : assignedToName, totalBug };
    });
    return HttpResponse.json(result);
  }),
];
