import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { getBugMonitoring, getTestCaseMonitoring } from '../../api/monitoringApi';
import type { MonitoringCategory } from '../../types/entities';

const categories: Array<MonitoringCategory | 'All'> = ['All', 'Complete', 'On Progress', 'Hold'];

export function MonitoringDashboardPage() {
  const { data: tcMonitoring = [], isLoading: loadingTc } = useQuery({
    queryKey: ['monitoring', 'test-cases'],
    queryFn: getTestCaseMonitoring,
  });
  const { data: bugMonitoring = [], isLoading: loadingBug } = useQuery({
    queryKey: ['monitoring', 'bugs'],
    queryFn: getBugMonitoring,
  });
  const [filter, setFilter] = useState<MonitoringCategory | 'All'>('All');

  const filteredTc = useMemo(
    () => (filter === 'All' ? tcMonitoring : tcMonitoring.filter((t) => t.category === filter)),
    [tcMonitoring, filter],
  );

  return (
    <div className="page">
      <h1>Monitoring Test Case &amp; Bug</h1>

      <div className="card">
        <h2>Test Case</h2>
        <div className="tab-filter">
          {categories.map((c) => (
            <button
              key={c}
              className={filter === c ? 'tab active' : 'tab'}
              onClick={() => setFilter(c)}
            >
              {c}
            </button>
          ))}
        </div>
        {loadingTc ? <p>Memuat...</p> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID Test Case</th>
                <th>Nama Test Case</th>
                <th>Persentase</th>
                <th>PIC QA</th>
                <th>Kategori</th>
              </tr>
            </thead>
            <tbody>
              {filteredTc.map((t) => (
                <tr key={t.headerId}>
                  <td>{t.headerCode}</td>
                  <td>{t.namaTestCase}</td>
                  <td>{t.percentage}% ({t.executedCase}/{t.totalCase})</td>
                  <td>{t.picQaNames || '-'}</td>
                  <td><StatusBadge status={t.category} /></td>
                </tr>
              ))}
              {filteredTc.length === 0 && (
                <tr><td colSpan={5} className="muted">Tidak ada data.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Bug</h2>
        {loadingBug ? <p>Memuat...</p> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Assigned to</th>
                <th>Total Bug</th>
              </tr>
            </thead>
            <tbody>
              {bugMonitoring.map((b, idx) => (
                <tr key={idx}>
                  <td><StatusBadge status={b.status} /></td>
                  <td>{b.assignedToName ?? '-'}</td>
                  <td>{b.totalBug}</td>
                </tr>
              ))}
              {bugMonitoring.length === 0 && (
                <tr><td colSpan={3} className="muted">Tidak ada data.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
