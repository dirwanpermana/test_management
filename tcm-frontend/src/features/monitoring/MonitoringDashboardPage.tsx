import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { getTestCaseMonitoring } from '../../api/monitoringApi';
import { useBugs } from '../bugs/useBugs';
import type { MonitoringCategory } from '../../types/entities';

const categories: Array<MonitoringCategory | 'All'> = ['All', 'Complete', 'On Progress', 'Hold'];
const PAGE_SIZE = 10;

function usePagination<T>(items: T[], resetKey: unknown) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  useEffect(() => { setPage(1); }, [resetKey]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, page]);

  return { page, setPage, totalPages, paginated };
}

export function MonitoringDashboardPage() {
  const navigate = useNavigate();

  const { data: tcMonitoring = [], isLoading: loadingTc } = useQuery({
    queryKey: ['monitoring', 'test-cases'],
    queryFn: getTestCaseMonitoring,
  });
  const { data: bugs = [], isLoading: loadingBug } = useBugs();

  const [categoryFilter, setCategoryFilter] = useState<MonitoringCategory | 'All'>('All');

  // ---- Test Case: Sprint range + 1 search box (cari di semua kolom) ----
  const [tcSprintFrom, setTcSprintFrom] = useState('');
  const [tcSprintTo, setTcSprintTo] = useState('');
  const [tcSearch, setTcSearch] = useState('');

  const filteredTc = useMemo(() => tcMonitoring.filter((t) => {
    const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
    const matchesSprintFrom = !tcSprintFrom || (t.sprint != null && t.sprint >= Number(tcSprintFrom));
    const matchesSprintTo = !tcSprintTo || (t.sprint != null && t.sprint <= Number(tcSprintTo));
    const q = tcSearch.trim().toLowerCase();
    const matchesSearch = !q || [
      t.headerCode, t.namaTestCase, t.namaMenu, t.picQaNames, String(t.sprint ?? ''), t.category,
    ].some((v) => (v ?? '').toLowerCase().includes(q));
    return matchesCategory && matchesSprintFrom && matchesSprintTo && matchesSearch;
  }), [tcMonitoring, categoryFilter, tcSprintFrom, tcSprintTo, tcSearch]);

  const tcPagination = usePagination(filteredTc, [categoryFilter, tcSprintFrom, tcSprintTo, tcSearch]);

  // ---- Bug: Sprint range + 1 search box (cari di semua kolom) ----
  const [bugSprintFrom, setBugSprintFrom] = useState('');
  const [bugSprintTo, setBugSprintTo] = useState('');
  const [bugSearch, setBugSearch] = useState('');

  const filteredBugs = useMemo(() => bugs.filter((b) => {
    const matchesSprintFrom = !bugSprintFrom || (b.sprint != null && b.sprint >= Number(bugSprintFrom));
    const matchesSprintTo = !bugSprintTo || (b.sprint != null && b.sprint <= Number(bugSprintTo));
    const q = bugSearch.trim().toLowerCase();
    const matchesSearch = !q || [
      b.bugNo, b.scenario, b.testCaseHeaderCode, b.testCaseHeaderName,
      b.reporterName, b.assignedToName, b.status, b.severity, b.priority, String(b.sprint ?? ''),
    ].some((v) => (v ?? '').toLowerCase().includes(q));
    return matchesSprintFrom && matchesSprintTo && matchesSearch;
  }), [bugs, bugSprintFrom, bugSprintTo, bugSearch]);

  const bugPagination = usePagination(filteredBugs, [bugSprintFrom, bugSprintTo, bugSearch]);

  return (
    <div className="page page-fill">
      <div className="monitoring-grid">
        {/* ================= TEST CASE ================= */}
        <div className="monitoring-card">
          <div className="monitoring-card-header">
            <h2>📋 Test Case</h2>
          </div>

          <div className="monitoring-filters">
            <div className="filter-range">
              <label>Sprint</label>
              <input type="number" placeholder="from" value={tcSprintFrom} onChange={(e) => setTcSprintFrom(e.target.value)} />
              <span>-</span>
              <input type="number" placeholder="to" value={tcSprintTo} onChange={(e) => setTcSprintTo(e.target.value)} />
            </div>
            <input
              className="search-input"
              placeholder="Sarch Scenario Test"
              value={tcSearch}
              onChange={(e) => setTcSearch(e.target.value)}
            />
          </div>

          <div className="tab-filter">
            {categories.map((c) => (
              <button
                key={c}
                className={categoryFilter === c ? 'tab active' : 'tab'}
                onClick={() => setCategoryFilter(c)}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="monitoring-table-wrapper">
            {loadingTc ? <p>Memuat...</p> : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID Test Case</th>
                    <th>Nama Test Case</th>
                    <th>Sprint</th>
                    <th>Nama Menu</th>
                    <th>Persentase</th>
                    <th>PIC QA</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tcPagination.paginated.map((t) => (
                    <tr key={t.headerId}>
                      <td>{t.headerCode}</td>
                      <td>{t.namaTestCase}</td>
                      <td>{t.sprint ?? '-'}</td>
                      <td>{t.namaMenu}</td>
                      {/* <td>{t.percentage}% ({t.executedCase}/{t.totalCase})</td> */}
                      <td>{t.percentage}%</td>
                      <td>{t.picQaNames || '-'}</td>
                      <td><button className="btn-link" onClick={() => navigate(`/test-cases/${t.headerId}`)}>View</button></td>
                    </tr>
                  ))}
                  {filteredTc.length === 0 && (
                    <tr><td colSpan={7} className="muted">Tidak ada data.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="pagination-bar">
            <span className="pagination-info">{filteredTc.length} data</span>
            <div className="pagination-controls">
              <button className="btn-secondary" onClick={() => tcPagination.setPage((p) => Math.max(1, p - 1))} disabled={tcPagination.page <= 1}>&larr;</button>
              <span className="pagination-page">{tcPagination.page} / {tcPagination.totalPages}</span>
              <button className="btn-secondary" onClick={() => tcPagination.setPage((p) => Math.min(tcPagination.totalPages, p + 1))} disabled={tcPagination.page >= tcPagination.totalPages}>&rarr;</button>
            </div>
          </div>
        </div>

        {/* ================= BUG ================= */}
        <div className="monitoring-card">
          <div className="monitoring-card-header">
            <h2>🐞 Bug</h2>
          </div>

          <div className="monitoring-filters">
            <div className="filter-range">
              <label>Sprint</label>
              <input type="number" placeholder="from" value={bugSprintFrom} onChange={(e) => setBugSprintFrom(e.target.value)} />
              <span>-</span>
              <input type="number" placeholder="to" value={bugSprintTo} onChange={(e) => setBugSprintTo(e.target.value)} />
            </div>
            <input
              className="search-input"
              placeholder="Search list bug"
              value={bugSearch}
              onChange={(e) => setBugSearch(e.target.value)}
            />
          </div>

          <div className="monitoring-table-wrapper">
            {loadingBug ? <p>Memuat...</p> : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nomor Bug</th>
                    <th>Test Case</th>
                    <th>Sprint</th>
                    <th>Status</th>
                    <th>Pembuat</th>
                    <th>Assign To</th>
                    <th>Create Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {bugPagination.paginated.map((b) => (
                    <tr key={b.id}>
                      <td>{b.bugNo}</td>
                      <td>{b.testCaseHeaderCode ? `${b.testCaseHeaderCode} — ${b.testCaseHeaderName}` : '-'}</td>
                      <td>{b.sprint ?? '-'}</td>
                      <td><StatusBadge status={b.status} /></td>
                      <td>{b.reporterName}</td>
                      <td>{b.assignedToName ?? '-'}</td>
                      <td>{new Date(b.createdAt).toLocaleDateString('id-ID')}</td>
                      <td><button className="btn-link" onClick={() => navigate(`/bugs/${b.id}`)}>View</button></td>
                    </tr>
                  ))}
                  {filteredBugs.length === 0 && (
                    <tr><td colSpan={8} className="muted">Tidak ada data.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="pagination-bar">
            <span className="pagination-info">{filteredBugs.length} data</span>
            <div className="pagination-controls">
              <button className="btn-secondary" onClick={() => bugPagination.setPage((p) => Math.max(1, p - 1))} disabled={bugPagination.page <= 1}>&larr;</button>
              <span className="pagination-page">{bugPagination.page} / {bugPagination.totalPages}</span>
              <button className="btn-secondary" onClick={() => bugPagination.setPage((p) => Math.min(bugPagination.totalPages, p + 1))} disabled={bugPagination.page >= bugPagination.totalPages}>&rarr;</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}