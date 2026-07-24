import { useEffect, useState } from 'react';
import { useUpdateHeader } from './useTestCases';
import type { TestCaseHeader } from '../../types/entities';

function useAutosave(value: string, original: string, delay: number, save: (v: string) => void) {
  useEffect(() => {
    if (value === original) return;
    const handle = setTimeout(() => save(value), delay);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
}

export function TestCaseHeaderEditableCard({ header, readOnly }: { header: TestCaseHeader; readOnly: boolean }) {
  const updateHeader = useUpdateHeader();
  const [namaTestCase, setNamaTestCase] = useState(header.namaTestCase);
  const [sprint, setSprint] = useState(header.sprint ?? '');
  const [namaMenu, setNamaMenu] = useState(header.namaMenu);
  const [jiraUrl, setJiraUrl] = useState(header.jiraUrl ?? '');

  useEffect(() => {
    setNamaTestCase(header.namaTestCase);
    setSprint(header.sprint ?? '');
    setNamaMenu(header.namaMenu);
    setJiraUrl(header.jiraUrl ?? '');
  }, [header.id]);

  function save(field: string, value: string) {
    updateHeader.mutate({ id: header.id, payload: { [field]: value } });
  }

  useAutosave(namaTestCase, header.namaTestCase, 600, (v) => save('namaTestCase', v));
  useAutosave(sprint, header.sprint ?? '', 600, (v) => save('sprint', v));
  useAutosave(namaMenu, header.namaMenu, 600, (v) => save('namaMenu', v));
  useAutosave(jiraUrl, header.jiraUrl ?? '', 600, (v) => save('jiraUrl', v));

  return (
    <div className="header-edit-card">
      <input
        className="header-edit-title"
        value={namaTestCase}
        disabled={readOnly}
        onChange={(e) => setNamaTestCase(e.target.value)}
        placeholder="Nama Test Case"
      />
      <div className="header-edit-grid">
        <div className="header-edit-field">
          <label>Sprint</label>
          <input value={sprint} disabled={readOnly} onChange={(e) => setSprint(e.target.value)} placeholder="Sprint 12" />
        </div>
        <div className="header-edit-field">
          <label>Nama Menu</label>
          <input value={namaMenu} disabled={readOnly} onChange={(e) => setNamaMenu(e.target.value)} />
        </div>
        <div className="header-edit-field wide">
          <label>Jira URL</label>
          <input value={jiraUrl} disabled={readOnly} onChange={(e) => setJiraUrl(e.target.value)} placeholder="https://jira..." />
        </div>
      </div>
      <span className="header-edit-status">
        {updateHeader.isPending ? 'Menyimpan…' : header.updatedAt ? 'Tersimpan otomatis' : ''}
      </span>
    </div>
  );
}