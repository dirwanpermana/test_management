import { useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/useAuth';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { useHeaders, useItems } from '../test-cases/useTestCases';
import { useCreateBug, useDevUsers, useUploadAttachment } from './useBugs';
import { ALL_BUG_STATUSES } from '../../constants/bugWorkflow';
import type { BugStatus, Priority, Severity } from '../../types/entities';

export function BugCreateForm({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const { data: devUsers = [] } = useDevUsers();
  const { data: allItems = [] } = useItems();
  const { data: headers = [] } = useHeaders();
  const createBug = useCreateBug();
  const uploadAttachment = useUploadAttachment();

  // Dropdown 1: ID Test Case = pilih HEADER (header_code + nama test case).
  const headerOptions = useMemo(() => headers.map((h) => ({
    value: h.id,
    label: `${h.headerCode} — ${h.namaTestCase}`,
  })), [headers]);

  const [headerId, setHeaderId] = useState('');

  // Dropdown 2: Case ID = item di bawah header terpilih (caseNo + preview scenario).
  const caseIdOptions = useMemo(() => allItems
    .filter((item) => item.headerId === headerId)
    .map((item) => ({
      value: item.caseNo,
      label: `${item.caseNo} — ${item.scenario ? item.scenario.slice(0, 60) : '(belum diisi)'}`,
    })), [allItems, headerId]);

  const [testCaseNo, setTestCaseNo] = useState('');
  const [sprint, setSprint] = useState<number | null>(null);
  const [scenario, setScenario] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [actualResult, setActualResult] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [severity, setSeverity] = useState<Severity>('Medium');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [status, setStatus] = useState<BugStatus>('Open');
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function handleHeaderChange(value: string) {
    setHeaderId(value);
    setTestCaseNo(''); // reset Case ID setiap kali header (ID Test Case) diganti
  }

  // Trigger: setelah Case ID dipilih, auto-isi 3 field dari data test case-nya.
  // Tetap dibiarkan editable — QA bisa menyesuaikan redaksi kalau perlu.
  function handleCaseIdChange(caseNo: string) {
    setTestCaseNo(caseNo);
    const item = allItems.find((i) => i.caseNo === caseNo);
    if (item) {
      setScenario(item.scenario ?? '');
      setStepsToReproduce(item.steps ?? '');
      setExpectedResult(item.expectedResult ?? '');
      const header = headers.find((h) => h.id === item.headerId);
      setSprint(header?.sprint ?? null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setUploadError(null);

    const bug = await createBug.mutateAsync({
      testCaseNo: testCaseNo || undefined,
      scenario,
      stepsToReproduce,
      expectedResult,
      actualResult,
      assignedTo: assignedTo || undefined,
      severity,
      priority,
      status,
    });

    if (file) {
      try {
        await uploadAttachment.mutateAsync({ bugId: bug.id, file });
      } catch {
        setUploadError('Bug berhasil dibuat, tapi upload dokumen gagal. Coba upload ulang dari halaman detail bug.');
      }
    }

    setHeaderId(''); setTestCaseNo(''); setScenario(''); setStepsToReproduce('');
    setExpectedResult(''); setActualResult(''); setAssignedTo('');
    setSeverity('Medium'); setPriority('Medium'); setStatus('Open'); setFile(null); setSprint(null);
    onCreated();
  }

  return (
    <form className="card form-grid" onSubmit={handleSubmit}>
      <div className="field">
        <label>Nomor Bug</label>
        <input value="Otomatis (BUG-YYMMDD-NN)" disabled />
      </div>
      <div className="field">
        <label>ID Test Case</label>
        <SearchableSelect
          options={headerOptions}
          value={headerId}
          onChange={handleHeaderChange}
          placeholder="Cari ID atau nama test case..."
        />
      </div>
      <div className="field">
        <label>Case ID</label>
        <SearchableSelect
          options={caseIdOptions}
          value={testCaseNo}
          onChange={handleCaseIdChange}
          placeholder={headerId ? 'Cari Case ID / scenario...' : 'Pilih ID Test Case dulu'}
        />
      </div>
      <div className="field">
        <label>Sprint</label>
        <input value={sprint ?? '-'} disabled />
      </div>
      <div className="field">
        <label>Nama Pembuat</label>
        <input value={user?.fullName ?? ''} disabled />
      </div>
      <div className="field">
        <label>Assign to (Developer)</label>
        <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} required>
          <option value="">-- Pilih Developer --</option>
          {devUsers.map((d: { id: string; fullName: string }) => (
            <option key={d.id} value={d.id}>{d.fullName}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Severity</label>
        <select value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
          <option value="Critical">Critical</option>
          <option value="Major">Major</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>
      <div className="field">
        <label>Priority</label>
        <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>
      <div className="field">
        <label>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as BugStatus)}>
          {ALL_BUG_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="field field-full">
        <label>Scenario</label>
        <textarea value={scenario} onChange={(e) => setScenario(e.target.value)} required />
      </div>
      <div className="field field-full">
        <label>Step Reproduce</label>
        <textarea value={stepsToReproduce} onChange={(e) => setStepsToReproduce(e.target.value)} required />
      </div>
      <div className="field field-full">
        <label>Expected Result</label>
        <textarea value={expectedResult} onChange={(e) => setExpectedResult(e.target.value)} required />
      </div>
      <div className="field field-full">
        <label>Actual Result</label>
        <textarea value={actualResult} onChange={(e) => setActualResult(e.target.value)} required />
      </div>
      <div className="field">
        <label>Upload Dokumen</label>
        <input
          type="file"
          accept=".png,.jpg,.jpeg,.pdf,.docx,.xlsx,.txt"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {uploadError && <div className="error-text field-full">{uploadError}</div>}

      <button type="submit" disabled={createBug.isPending || uploadAttachment.isPending}>
        {createBug.isPending
          ? 'Mengirim...'
          : uploadAttachment.isPending
            ? 'Mengunggah dokumen...'
            : 'Submit'}
      </button>
    </form>
  );
}