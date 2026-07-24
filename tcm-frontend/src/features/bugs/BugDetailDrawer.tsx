import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/useAuth';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { allowedStatusesForRole } from '../../constants/bugWorkflow';
import { useAddComment, useBugDetail, useChangeBugStatus } from './useBugs';
import type { BugStatus } from '../../types/entities';

export function BugDetailDrawer({ bugId, onClose }: { bugId: string; onClose: () => void }) {
  const { user } = useAuth();
  const { data, isLoading } = useBugDetail(bugId);
  const changeStatus = useChangeBugStatus();
  const addComment = useAddComment();
  const [comment, setComment] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<BugStatus | ''>('');

  // Sinkronkan pilihan dropdown dengan status terkini setiap kali data bug berubah
  // (misal setelah berhasil disimpan, atau saat pertama kali dimuat).
  useEffect(() => {
    if (data) setSelectedStatus(data.bug.status);
  }, [data]);

  async function handleAddComment(e: FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    await addComment.mutateAsync({ id: bugId, comment });
    setComment('');
  }

  async function handleSaveStatus() {
    if (!data || !selectedStatus || selectedStatus === data.bug.status) return;
    setStatusError(null);
    try {
      await changeStatus.mutateAsync({ id: bugId, status: selectedStatus });
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setStatusError(message ?? 'Gagal mengubah status');
    }
  }

  const statusOptions = allowedStatusesForRole(user?.role);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="drawer-card drawer-card-wide" onClick={(e) => e.stopPropagation()}>
        <button className="drawer-close" onClick={onClose}>Tutup</button>

        {isLoading || !data ? (
          <p>Memuat detail bug...</p>
        ) : (
          <>
            <h2>{data.bug.bugNo}</h2>

            <dl className="detail-list">
              <dt>Status</dt><dd><StatusBadge status={data.bug.status} /></dd>
              <dt>Severity</dt><dd><StatusBadge status={data.bug.severity} /></dd>
              <dt>Priority</dt><dd><StatusBadge status={data.bug.priority} /></dd>
              <dt>Test Case</dt><dd>{data.bug.testCaseNo ?? '-'}</dd>
              <dt>Pembuat</dt><dd>{data.bug.reporterName}</dd>
              <dt>Assigned to</dt><dd>{data.bug.assignedToName ?? '-'}</dd>
              <dt>Scenario</dt><dd>{data.bug.scenario}</dd>
              <dt>Step Reproduce</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{data.bug.stepsToReproduce}</dd>
              <dt>Expected Result</dt><dd>{data.bug.expectedResult}</dd>
              <dt>Actual Result</dt><dd>{data.bug.actualResult}</dd>
            </dl>

            <h3>Dokumen Pendukung</h3>
            <ul className="attachment-list">
              {data.bug.attachments.length === 0 && <li className="muted">Belum ada dokumen.</li>}
              {data.bug.attachments.map((a) => (
                <li key={a.id}>
                  <a href={a.fileUrl} target="_blank" rel="noreferrer">{a.fileName}</a>
                </li>
              ))}
            </ul>

            <h3>Komentar</h3>
            <div className="comment-list">
              {data.comments.length === 0 && <p className="muted">Belum ada komentar.</p>}
              {data.comments.map((c) => (
                <div key={c.id} className="comment-item">
                  <strong>{c.userName}</strong>
                  <span>{c.comment}</span>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddComment} className="comment-form">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={`Komentar sebagai ${user?.fullName}`}
              />
              <button type="submit">Kirim</button>
            </form>

            <div className="status-change-row">
              <div className="status-change-label">
                <h3>Ubah Status</h3>
                {statusOptions.length === 0 && (
                  <span className="muted">Role Anda tidak bisa mengubah status bug.</span>
                )}
              </div>
              {statusOptions.length > 0 && (
                <div className="status-change-controls">
                  <select
                    value={selectedStatus || data.bug.status}
                    onChange={(e) => setSelectedStatus(e.target.value as BugStatus)}
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button onClick={handleSaveStatus} disabled={changeStatus.isPending}>
                    {changeStatus.isPending ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              )}
              {statusError && <div className="error-text">{statusError}</div>}
            </div>

            <h3>Riwayat Status</h3>
            <ul className="history-list">
              {data.history.map((h) => (
                <li key={h.id}>{h.fromStatus ?? 'created'} → {h.toStatus} ({new Date(h.changedAt).toLocaleString('id-ID')})</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
