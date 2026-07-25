import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoleGuard } from '../../auth/RoleGuard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { BugCreateForm } from './BugCreateForm';
import { useBugs } from './useBugs';

export function BugListPage() {
  const navigate = useNavigate();
  const { data: bugs = [], isLoading } = useBugs();
  const [showForm, setShowForm] = useState(false);

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
                <th>Severity</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assign to</th>
                <th>Create Date</th>
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
                  <td><StatusBadge status={b.severity} /></td>
                  <td><StatusBadge status={b.priority} /></td>
                  <td><StatusBadge status={b.status} /></td>
                  <td>{b.assignedToName ?? '-'}</td>
                  <td>{new Date(b.createdAt).toLocaleString('id-ID')}</td>
                  <td className="action-cell">
                    <button className="btn-link" onClick={() => navigate(`/bugs/${b.id}`)}>Detail</button>
                    <button className="btn-link" onClick={() => navigate(`/bugs/${b.id}/update`)}>Update</button>
                  </td>
                </tr>
              ))}
              {bugs.length === 0 && (
                <tr><td colSpan={10} className="muted">Belum ada bug tercatat.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}