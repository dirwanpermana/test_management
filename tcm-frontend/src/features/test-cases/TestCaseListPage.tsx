import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoleGuard } from '../../auth/RoleGuard';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TestCaseHeaderFormModal } from './TestCaseHeaderFormModal';
import { useDeleteHeader, useHeaders, useItems, useQaUsers } from './useTestCases';
import { downloadTemplate, downloadReport } from '../../api/testCaseApi';
import type { TestCaseHeader } from '../../types/entities';
import { useAuth } from '../../auth/useAuth';

const PAGE_SIZE = 25;

export function TestCaseListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: headers = [], isLoading } = useHeaders();
  const { data: allItems = [] } = useItems();
  const { data: qaUsers = [] } = useQaUsers();
  const deleteHeader = useDeleteHeader();

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [menuFilter, setMenuFilter] = useState('');
  const [qaFilter, setQaFilter] = useState('');
  const [pendingDelete, setPendingDelete] = useState<TestCaseHeader | null>(null);

  const [page, setPage] = useState(1);

  const menuOptions = useMemo(
    () => Array.from(new Set(headers.map((h) => h.namaMenu))).sort(),
    [headers],
  );

  // Test case header itu sendiri tidak punya field PIC QA (PIC QA nempel di
  // level item/baris) — jadi filternya: header ikut lolos kalau MINIMAL SATU
  // item di bawahnya di-assign ke QA yang dipilih.
  const filteredHeaders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return headers.filter((h) => {
      const matchesSearch = !q
        || h.namaTestCase.toLowerCase().includes(q)
        || h.headerCode.toLowerCase().includes(q);
      const matchesMenu = !menuFilter || h.namaMenu === menuFilter;
      const matchesQa = !qaFilter || allItems.some((it) => it.headerId === h.id && it.picQa === qaFilter);
      return matchesSearch && matchesMenu && matchesQa;
    });
  }, [headers, allItems, search, menuFilter, qaFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredHeaders.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [search, menuFilter, qaFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedHeaders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredHeaders.slice(start, start + PAGE_SIZE);
  }, [filteredHeaders, page]);

  return (
    <div className="page">
      {/* <h1>Test Case</h1> */}

      <div className="card">
        <div className="toolbar">
          <select value={menuFilter} onChange={(e) => setMenuFilter(e.target.value)}>
            <option value="">All Menu</option>
            {menuOptions.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select value={qaFilter} onChange={(e) => setQaFilter(e.target.value)}>
            <option value="">All PIC QA</option>
            {qaUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.fullName}</option>
            ))}
          </select>
          <RoleGuard allow={['QA']}>
            <button onClick={() => setShowForm(true)}>+ Tambah Test Case</button>
            <button className="btn-secondary" onClick={() => downloadTemplate()}>
              📥 Download Template
            </button>
          </RoleGuard>
          <button className="btn-secondary" onClick={() => downloadReport()}>
            📊 Download Report
          </button>
          <input
            className="search-input toolbar-search"
            placeholder="Cari ID atau nama test case..."
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
                  <th>Action</th>
                  <th>ID Test Case</th>
                  <th>Nama Test Case</th>
                  <th>Sprint</th>
                  <th>Nama Menu</th>
                  <th>Jira URL</th>
                  <th>Create By</th>
                  <th>Create Date</th>
                  <th>Update Date</th>
                </tr>
              </thead>
              <tbody>
                {paginatedHeaders.map((h) => (
                  <tr key={h.id}>
                    <td className="action-cell">
                      <button className="btn-link" onClick={() => navigate(`/test-cases/${h.id}`)}>
                        {user?.role === 'QA' ? 'Update' : 'Detail'}
                      </button>
                      <RoleGuard allow={['QA']}>
                        <button className="btn-link btn-link-danger" onClick={() => setPendingDelete(h)}>Hapus</button>
                      </RoleGuard>
                    </td>
                    <td>{h.headerCode}</td>
                    <td>{h.namaTestCase}</td>
                    <td>{h.sprint || '-'}</td>
                    <td>{h.namaMenu}</td>
                    <td>{h.jiraUrl ? <a href={h.jiraUrl} target="_blank" rel="noreferrer">Link</a> : '-'}</td>
                    <td>{h.createdByName ?? h.createdBy}</td>
                    <td>{new Date(h.createdAt).toLocaleString('id-ID')}</td>
                    <td>{h.updatedAt ? new Date(h.updatedAt).toLocaleString('id-ID') : '-'}</td>
                  </tr>
                ))}
                {filteredHeaders.length === 0 && (
                  <tr><td colSpan={9} className="muted">Tidak ada test case ditemukan.</td></tr>
                )}
              </tbody>
            </table>

            {filteredHeaders.length > 0 && (
              <div className="pagination-bar">
                <span className="pagination-info">
                  Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredHeaders.length)} of {filteredHeaders.length} data
                </span>
                <div className="pagination-controls">
                  <button
                    className="btn-secondary"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Back
                  </button>
                  <span className="pagination-page">Halaman {page} / {totalPages}</span>
                  <button
                    className="btn-secondary"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showForm && (
        <TestCaseHeaderFormModal
          onClose={() => setShowForm(false)}
          onCreated={(id) => {
            setShowForm(false);
            navigate(`/test-cases/${id}`);
          }}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Hapus test case ${pendingDelete?.headerCode}?`}
        description="Semua baris test case di dalamnya akan ikut terhapus. Tindakan ini tidak bisa dibatalkan."
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete) await deleteHeader.mutateAsync(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}