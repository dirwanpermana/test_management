import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { allowedStatusesForRole } from '../../constants/bugWorkflow';
import { useAddComment, useBugDetail, useChangeBugStatus, useUploadAttachment } from './useBugs';
import type { BugStatus } from '../../types/entities';

export function BugDetailPage() {
  const { bugId } = useParams<{ bugId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading, isError } = useBugDetail(bugId);
  const changeStatus = useChangeBugStatus();
  const addComment = useAddComment();
  const uploadAttachment = useUploadAttachment();

  const [comment, setComment] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<BugStatus | ''>('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (data) setSelectedStatus(data.bug.status);
  }, [data]);

  async function handleAddComment(e: FormEvent) {
    e.preventDefault();
    if (!comment.trim() || !bugId) return;
    await addComment.mutateAsync({ id: bugId, comment });
    setComment('');
  }

  async function handleSaveStatus() {
    if (!data || !selectedStatus || selectedStatus === data.bug.status || !bugId) return;
    setStatusError(null);
    try {
      await changeStatus.mutateAsync({ id: bugId, status: selectedStatus });
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setStatusError(message ?? 'Gagal mengubah status');
    }
  }

  async function handleUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !bugId) return;
    setUploadError(null);
    try {
      await uploadAttachment.mutateAsync({ bugId, file });
    } catch {
      setUploadError('Gagal mengunggah dokumen. Coba lagi.');
    }
  }

  // QA: bisa ubah ke status manapun. DEV: dibatasi 3 status (lihat bugWorkflow.ts).
  // Role lain (kalau ada nanti): array kosong -> kontrol ubah status otomatis tersembunyi.
  const statusOptions = allowedStatusesForRole(user?.role);

  if (isLoading || !data) {
    return (
      <div className="page">
        <button className="btn-secondary mb-3" onClick={() => navigate('/bugs')}>&larr; Kembali ke List Bug</button>
        <p>{isError ? 'Gagal memuat detail bug.' : 'Memuat detail bug...'}</p>
      </div>
    );
  }

  const { bug } = data;

  return (
    <div className="page">
      <button className="btn-secondary mb-3" onClick={() => navigate('/bugs')}>&larr; Kembali ke List Bug</button>

      <div className="bug-detail-header">
        <div>
          <h1>{bug.bugNo}</h1>
          <div className="bug-detail-badges">
            <StatusBadge status={bug.status} />
            <StatusBadge status={bug.severity} />
            <StatusBadge status={bug.priority} />
          </div>
        </div>
      </div>

      <div className="bug-summary-grid">
        <div className="bug-summary-item">
          <div className="label">ID Test Case</div>
          <div className="value">
            {bug.testCaseHeaderCode ? `${bug.testCaseHeaderCode} — ${bug.testCaseHeaderName}` : '-'}
          </div>
        </div>
        <div className="bug-summary-item">
          <div className="label">Case ID</div>
          <div className="value monospace-cell">{bug.testCaseNo ?? '-'}</div>
        </div>
        <div className="bug-summary-item">
         <div className="label">Sprint</div>
         <div className="value">{bug.sprint ?? '-'}</div>
        </div>
        <div className="bug-summary-item">
          <div className="label">Pembuat</div>
          <div className="value">{bug.reporterName}</div>
        </div>
        <div className="bug-summary-item">
          <div className="label">Assigned to</div>
          <div className="value">{bug.assignedToName ?? '-'}</div>
        </div>
      </div>

      <div className="card bug-section-card">
        <h3>Detail Bug</h3>
        <dl className="detail-list">
          <dt>Scenario</dt><dd>{bug.scenario}</dd>
          <dt>Step Reproduce</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{bug.stepsToReproduce}</dd>
          <dt>Expected Result</dt><dd>{bug.expectedResult}</dd>
          <dt>Actual Result</dt><dd>{bug.actualResult}</dd>
        </dl>
      </div>

      <div className="card bug-section-card">
        <div className="toolbar">
          <h3 style={{ margin: 0 }}>Dokumen Pendukung</h3>
          <label className="btn-secondary" style={{ cursor: 'pointer' }}>
            {uploadAttachment.isPending ? 'Mengunggah...' : '+ Upload Dokumen'}
            <input type="file" hidden onChange={handleUploadFile} disabled={uploadAttachment.isPending} />
          </label>
        </div>
        {uploadError && <div className="error-text">{uploadError}</div>}
        <ul className="attachment-list">
          {bug.attachments.length === 0 && <li className="muted">Belum ada dokumen.</li>}
          {bug.attachments.map((a) => (
            <li key={a.id}>
              <a href={a.fileUrl} target="_blank" rel="noreferrer">{a.fileName}</a>
            </li>
          ))}
        </ul>
      </div>

      <div className="card bug-section-card">
        <h3>Ubah Status</h3>
        {statusOptions.length === 0 ? (
          <span className="muted">Role Anda tidak bisa mengubah status bug.</span>
        ) : (
          <div className="status-change-controls">
            <select
              value={selectedStatus || bug.status}
              onChange={(e) => setSelectedStatus(e.target.value as BugStatus)}
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button onClick={handleSaveStatus} disabled={changeStatus.isPending}>
              {changeStatus.isPending ? 'Menyimpan...' : 'Simpan Status'}
            </button>
          </div>
        )}
        {statusError && <div className="error-text">{statusError}</div>}

        <div className="card bug-section-card">
            <h3>Riwayat Status</h3>
            <ul className="history-list">
            {data.history.map((h) => (
                <li key={h.id}>{h.fromStatus ?? 'created'} → {h.toStatus} ({new Date(h.changedAt).toLocaleString('id-ID')})</li>
            ))}
            </ul>
        </div>
      </div>

      <div className="card bug-section-card">
        <h3>Komentar</h3>
        <div className="comment-list">
          {data.comments.length === 0 && <p className="muted">Belum ada komentar.</p>}
          {data.comments.map((c) => (
            <div key={c.id} className="comment-item">
             <div className="comment-item-header">
               <strong>{c.userName}</strong>
               <span className="comment-item-time">
                 {new Date(c.createdAt).toLocaleString('id-ID', {
                   day: '2-digit', month: '2-digit', year: 'numeric',
                   hour: '2-digit', minute: '2-digit',
                 })}
               </span>
             </div>
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
      </div>
    </div>
  );
}