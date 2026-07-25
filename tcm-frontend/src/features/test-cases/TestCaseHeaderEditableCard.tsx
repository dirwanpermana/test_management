import { useEffect, useState } from 'react';
import { useUpdateHeader } from './useTestCases';
import type { TestCaseHeader } from '../../types/entities';

function useAutosave<T>(value: T, original: T, delay: number, save: (v: T) => void) {
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
  // Sprint tetap dipegang sebagai string di komponen (biar field kosong bisa
  // diketik ulang tanpa "0" nyangkut), dikonversi ke number/null cuma saat
  // dikirim ke backend.
  const [sprint, setSprint] = useState(header.sprint != null ? String(header.sprint) : '');
  const [namaMenu, setNamaMenu] = useState(header.namaMenu);
  const [jiraUrl, setJiraUrl] = useState(header.jiraUrl ?? '');

  useEffect(() => {
    setNamaTestCase(header.namaTestCase);
    setSprint(header.sprint != null ? String(header.sprint) : '');
    setNamaMenu(header.namaMenu);
    setJiraUrl(header.jiraUrl ?? '');
  }, [header.id]);

  function save(field: string, value: unknown) {
    updateHeader.mutate({ id: header.id, payload: { [field]: value } });
  }

  useAutosave(namaTestCase, header.namaTestCase, 600, (v) => save('namaTestCase', v));
  useAutosave(sprint, header.sprint != null ? String(header.sprint) : '', 600, (v) => {
    save('sprint', v.trim() === '' ? null : Number(v));
  });
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
          <input
            type="number"
            min={1}
            step={1}
            value={sprint}
            disabled={readOnly}
            onChange={(e) => setSprint(e.target.value)}
            placeholder="Contoh: 23"
          />
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