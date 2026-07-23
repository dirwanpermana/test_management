import { useState, type FormEvent } from 'react';
import { useCreateHeader } from './useTestCases';

export function TestCaseCreateForm({ onCreated }: { onCreated: (headerId: string) => void }) {
  const createHeader = useCreateHeader();
  const [namaTestCase, setNamaTestCase] = useState('');
  const [jiraUrl, setJiraUrl] = useState('');
  const [namaMenu, setNamaMenu] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const header = await createHeader.mutateAsync({ namaTestCase, jiraUrl, namaMenu });
    setNamaTestCase('');
    setJiraUrl('');
    setNamaMenu('');
    onCreated(header.id);
  }

  return (
    <form className="card form-inline" onSubmit={handleSubmit}>
      <div className="field">
        <label>ID Test Case</label>
        <input value="Otomatis (YYMMDD)" disabled />
      </div>
      <div className="field">
        <label>Nama Test Case</label>
        <input value={namaTestCase} onChange={(e) => setNamaTestCase(e.target.value)} required />
      </div>
      <div className="field">
        <label>Jira URL</label>
        <input value={jiraUrl} onChange={(e) => setJiraUrl(e.target.value)} placeholder="https://jira..." />
      </div>
      <div className="field">
        <label>Nama Menu</label>
        <input value={namaMenu} onChange={(e) => setNamaMenu(e.target.value)} required />
      </div>
      <button type="submit" disabled={createHeader.isPending}>
        {createHeader.isPending ? 'Menyimpan...' : 'Simpan'}
      </button>
    </form>
  );
}
