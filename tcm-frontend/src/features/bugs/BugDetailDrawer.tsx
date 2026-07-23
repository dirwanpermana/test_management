import { useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/useAuth';
import { RoleGuard } from '../../auth/RoleGuard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAddComment, useBugDetail, useChangeBugStatus } from './useBugs';
import type { BugStatus } from '../../types/entities';

export function BugDetailDrawer({ bugId, onClose }: { bugId: string; onClose: () => void }) {
  const { user } = useAuth();
  const { data, isLoading } = useBugDetail(bugId);
  const changeStatus = useChangeBugStatus();
  const addComment = useAddComment();
  const [comment, setComment] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);

  async function handleChangeStatus(status: BugStatus) {
    setStatusError(null);
    try {
      await changeStatus.mutateAsync({ id: bugId, status });
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setStatusError(message ?? 'Gagal mengubah status');
    }
  }

  async function handleAddComment(e: FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    await addComment.mutateAsync({ id: bugId, comment });
    setComment('');
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="drawer-card" onClick={(e) => e.stopPropagation()}>
        <button className="drawer-close" onClick={onClose}>Tutup</button>

        {isLoading || !data ? (
          <p>Memuat detail bug...</p>
        ) : (
          <>
            <h2>{data.bug.bugNo}</h2>
            <StatusBadge status={data.bug.status} />

            <dl className="detail-list">
              <dt>Test Case</dt><dd>{data.bug.testCaseNo ?? '-'}</dd>
              <dt>Pembuat</dt><dd>{data.bug.reporterName}</dd>
              <dt>Assigned to</dt><dd>{data.bug.assignedToName ?? '-'}</dd>
              <dt>Scenario</dt><dd>{data.bug.scenario}</dd>
              <dt>Step Reproduce</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{data.bug.stepsToReproduce}</dd>
              <dt>Expected Result</dt><dd>{data.bug.expectedResult}</dd>
              <dt>Actual Result</dt><dd>{data.bug.actualResult}</dd>
            </dl>

            <div className="status-actions">
              <RoleGuard allow={['DEV']}>
                {data.bug.status === 'Open' && (
                  <button onClick={() => handleChangeStatus('Ready to Test')}>Mark Ready to Test</button>
                )}
                {data.bug.status === 'Reopen' && (
                  <button onClick={() => handleChangeStatus('Ready to Test')}>Mark Ready to Test (ulang)</button>
                )}
              </RoleGuard>
              <RoleGuard allow={['QA']}>
                {data.bug.status === 'Ready to Test' && (
                  <>
                    <button onClick={() => handleChangeStatus('Closed')}>Tandai Closed (lolos retest)</button>
                    <button className="btn-secondary" onClick={() => handleChangeStatus('Reopen')}>Reopen (gagal retest)</button>
                  </>
                )}
                {data.bug.status === 'Open' && (
                  <button className="btn-secondary" onClick={() => handleChangeStatus('Rejected')}>Reject</button>
                )}
              </RoleGuard>
            </div>
            {statusError && <div className="error-text">{statusError}</div>}

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
