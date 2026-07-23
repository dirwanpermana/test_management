import { useState } from 'react';
import { RoleGuard } from '../../auth/RoleGuard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { BugCreateForm } from './BugCreateForm';
import { BugDetailDrawer } from './BugDetailDrawer';
import { useBugs } from './useBugs';

export function BugListPage() {
  const { data: bugs = [], isLoading } = useBugs();
  const [showForm, setShowForm] = useState(false);
  const [activeBugId, setActiveBugId] = useState<string | null>(null);

  return (
    <div className="page">
      <h1>List Bug</h1>

      <RoleGuard allow={['QA']}>
        <button className="mb-3" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Tutup Form' : '+ Buat Bug Baru'}
        </button>
        {showForm && <BugCreateForm onCreated={() => setShowForm(false)} />}
      </RoleGuard>

      <div className="card">
        {isLoading ? (
          <p>Memuat data...</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nomor Bug</th>
                <th>Test Case</th>
                <th>Pembuat</th>
                <th>Scenario</th>
                <th>Status</th>
                <th>Assign to</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bugs.map((b) => (
                <tr key={b.id}>
                  <td>{b.bugNo}</td>
                  <td>{b.testCaseNo ?? '-'}</td>
                  <td>{b.reporterName}</td>
                  <td>{b.scenario}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td>{b.assignedToName ?? '-'}</td>
                  <td><button className="btn-link" onClick={() => setActiveBugId(b.id)}>Detail</button></td>
                </tr>
              ))}
              {bugs.length === 0 && (
                <tr><td colSpan={7} className="muted">Belum ada bug tercatat.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {activeBugId && (
        <BugDetailDrawer bugId={activeBugId} onClose={() => setActiveBugId(null)} />
      )}
    </div>
  );
}
