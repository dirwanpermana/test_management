import { useState, type FormEvent } from 'react';
import { useCreateHeader } from './useTestCases';

interface Props {
  onClose: () => void;
  onCreated: (headerId: string) => void;
}

export function TestCaseHeaderFormModal({ onClose, onCreated }: Props) {
  const createHeader = useCreateHeader();
  const [namaTestCase, setNamaTestCase] = useState('');
  const [sprint, setSprint] = useState('');
  const [namaMenu, setNamaMenu] = useState('');
  const [jiraUrl, setJiraUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const header = await createHeader.mutateAsync({ namaTestCase, sprint, namaMenu, jiraUrl });
      onCreated(header.id);
    } catch {
      setError('Gagal menyimpan test case. Coba lagi.');
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-card modal-card-lg" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3>Tambah Test Case</h3>

        <div className="field">
          <label>ID Test Case</label>
          <input value="Otomatis (YYMMDD)" disabled />
        </div>
        <div className="field">
          <label>Nama Test Case</label>
          <input
            value={namaTestCase}
            onChange={(e) => setNamaTestCase(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="field">
          <label>Sprint</label>
          <input value={sprint} onChange={(e) => setSprint(e.target.value)} placeholder="Sprint 12" />
        </div>
        <div className="field">
          <label>Nama Menu</label>
          <input value={namaMenu} onChange={(e) => setNamaMenu(e.target.value)} required />
        </div>
        <div className="field">
          <label>Jira URL</label>
          <input value={jiraUrl} onChange={(e) => setJiraUrl(e.target.value)} placeholder="https://jira..." />
        </div>

        {error && <div className="error-text">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
          <button type="submit" disabled={createHeader.isPending}>
            {createHeader.isPending ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  );
}
