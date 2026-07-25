import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoleGuard } from '../../auth/RoleGuard';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TestCaseHeaderFormModal } from './TestCaseHeaderFormModal';
import { useDeleteHeader, useHeaders } from './useTestCases';
import { downloadTemplate } from '../../api/testCaseApi';
import type { TestCaseHeader } from '../../types/entities';

const PAGE_SIZE_OPTIONS = [15, 25, 50, 75, 100] as const;

export function TestCaseListPage() {
  const navigate = useNavigate();
  const { data: headers = [], isLoading } = useHeaders();
  const deleteHeader = useDeleteHeader();

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [menuFilter, setMenuFilter] = useState('');
  const [pendingDelete, setPendingDelete] = useState<TestCaseHeader | null>(null);

  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = useState(1);

  const menuOptions = useMemo(
    () => Array.from(new Set(headers.map((h) => h.namaMenu))).sort(),
    [headers],
  );

  const filteredHeaders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return headers.filter((h) => {
      const matchesSearch = !q
        || h.namaTestCase.toLowerCase().includes(q)
        || h.headerCode.toLowerCase().includes(q);
      const matchesMenu = !menuFilter || h.namaMenu === menuFilter;
      return matchesSearch && matchesMenu;
    });
  }, [headers, search, menuFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredHeaders.length / pageSize));

  // Reset ke halaman 1 setiap kali filter/pencarian/jumlah baris per halaman
  // berubah — supaya tidak "nyangkut" di halaman 3 padahal hasil filter baru
  // cuma punya 1 halaman.
  useEffect(() => {
    setPage(1);
  }, [search, menuFilter, pageSize]);

  // Jaga-jaga: kalau data berkurang (mis. ada yang dihapus) dan halaman aktif
  // jadi lebih besar dari totalPages yang baru, mundurkan ke halaman terakhir
  // yang valid.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedHeaders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredHeaders.slice(start, start + pageSize);
  }, [filteredHeaders, page, pageSize]);

  return (
    <div className="page">
      <h1>Test Case</h1>

      <div className="card">
        <div className="toolbar">
          <input
            className="search-input"
            placeholder="Cari ID atau nama test case..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={menuFilter} onChange={(e) => setMenuFilter(e.target.value)}>
            <option value="">Semua Menu</option>
            {menuOptions.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            title="Jumlah baris per halaman"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>view {size} / data</option>
            ))}
          </select>
          <RoleGuard allow={['QA']}>
            <button onClick={() => setShowForm(true)}>+ Tambah Test Case</button>
            <button className="btn-secondary" onClick={() => downloadTemplate()}>
              📥 Download Template
            </button>
          </RoleGuard>
        </div>

        {isLoading ? (
          <p>Memuat data...</p>
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
                      <button className="btn-link" onClick={() => navigate(`/test-cases/${h.id}`)}>Edit</button>
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
                  Menampilkan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredHeaders.length)} dari {filteredHeaders.length} data
                </span>
                <div className="pagination-controls">
                  <button
                    className="btn-secondary"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    &larr; Sebelumnya
                  </button>
                  <span className="pagination-page">Halaman {page} / {totalPages}</span>
                  <button
                    className="btn-secondary"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Berikutnya &rarr;
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