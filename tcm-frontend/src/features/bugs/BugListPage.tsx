import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoleGuard } from '../../auth/RoleGuard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useBugs } from './useBugs';
import { downloadBugReport } from '../../api/bugApi';

const PAGE_SIZE = 25;

export function BugListPage() {
  const navigate = useNavigate();
  const { data: bugs = [], isLoading } = useBugs();

  const [search, setSearch] = useState('');
  const [testCaseFilter, setTestCaseFilter] = useState('');
  const [reporterFilter, setReporterFilter] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [sprintFilter, setSprintFilter] = useState('');

  const [page, setPage] = useState(1);

  function testCaseLabel(b: (typeof bugs)[number]) {
    return b.testCaseHeaderCode ? `${b.testCaseHeaderCode} — ${b.testCaseHeaderName}` : '-';
  }

  const testCaseOptions = useMemo(
    () => Array.from(new Set(bugs.map((b) => testCaseLabel(b)))).filter((v) => v !== '-').sort(),
    [bugs],
  );
  const reporterOptions = useMemo(
    () => Array.from(new Set(bugs.map((b) => b.reporterName).filter(Boolean))).sort(),
    [bugs],
  );
  const assignedToOptions = useMemo(
    () => Array.from(new Set(bugs.map((b) => b.assignedToName).filter(Boolean))).sort(),
    [bugs],
  );
  const sprintOptions = useMemo(
    () => Array.from(new Set(bugs.map((b) => b.sprint).filter((s): s is number => s != null))).sort((a, b) => a - b),
    [bugs],
  );

  const filteredBugs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bugs.filter((b) => {
      const matchesSearch = !q
        || b.bugNo.toLowerCase().includes(q)
        || b.scenario.toLowerCase().includes(q)
        || testCaseLabel(b).toLowerCase().includes(q);
      const matchesTestCase = !testCaseFilter || testCaseLabel(b) === testCaseFilter;
      const matchesReporter = !reporterFilter || b.reporterName === reporterFilter;
      const matchesAssignedTo = !assignedToFilter || b.assignedToName === assignedToFilter;
      const matchesSprint = !sprintFilter || String(b.sprint ?? '') === sprintFilter;
      return matchesSearch && matchesTestCase && matchesReporter && matchesAssignedTo && matchesSprint;
    });
  }, [bugs, search, testCaseFilter, reporterFilter, assignedToFilter, sprintFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredBugs.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [search, testCaseFilter, reporterFilter, assignedToFilter, sprintFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedBugs = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredBugs.slice(start, start + PAGE_SIZE);
  }, [filteredBugs, page]);

  return (
    <div className="page">
      {/* <h1>List Bug</h1> */}

      <div className="page-actions">
        <RoleGuard allow={['QA']}>
          <button onClick={() => navigate('/bugs/new')}>+ Create New Bug</button>
        </RoleGuard>
        <button className="btn-secondary" onClick={() => downloadBugReport()}>
          📊 Download Report
        </button>
      </div>

      <div className="card">
        <div className="toolbar">
          <select value={testCaseFilter} onChange={(e) => setTestCaseFilter(e.target.value)}>
            <option value="">All ID Test Case</option>
            {testCaseOptions.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={reporterFilter} onChange={(e) => setReporterFilter(e.target.value)}>
            <option value="">All QA</option>
            {reporterOptions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={assignedToFilter} onChange={(e) => setAssignedToFilter(e.target.value)}>
            <option value="">All Dev</option>
            {assignedToOptions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={sprintFilter} onChange={(e) => setSprintFilter(e.target.value)}>
            <option value="">All Sprint</option>
            {sprintOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            className="search-input toolbar-search"
            placeholder="Cari nomor bug / scenario / test case..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nomor Bug</th>
                  <th>Test Case</th>
                  <th>Sprint</th>
                  <th>Pembuat</th>
                  <th>Scenario</th>
                  <th>Severity</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assign to</th>
                  <th>Create Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginatedBugs.map((b) => (
                  <tr key={b.id}>
                    <td>{b.bugNo}</td>
                    <td>{testCaseLabel(b)}</td>
                    <td>{b.sprint ?? '-'}</td>
                    <td>{b.reporterName}</td>
                    <td>{b.scenario}</td>
                    <td><StatusBadge status={b.severity} /></td>
                    <td><StatusBadge status={b.priority} /></td>
                    <td><StatusBadge status={b.status} /></td>
                    <td>{b.assignedToName ?? '-'}</td>
                    <td>{new Date(b.createdAt).toLocaleString('id-ID')}</td>
                    <td className="action-cell">
                      <button className="btn-link" onClick={() => navigate(`/bugs/${b.id}`)}>Detail</button>
                    </td>
                  </tr>
                ))}
                {filteredBugs.length === 0 && (
                  <tr><td colSpan={11} className="muted">Tidak ada bug ditemukan.</td></tr>
                )}
              </tbody>
            </table>

            {filteredBugs.length > 0 && (
              <div className="pagination-bar">
                <span className="pagination-info">
                  Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredBugs.length)} of {filteredBugs.length} data
                </span>
                <div className="pagination-controls">
                  <button className="btn-secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                    Back
                  </button>
                  <span className="pagination-page">Halaman {page} / {totalPages}</span>
                  <button className="btn-secondary" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}