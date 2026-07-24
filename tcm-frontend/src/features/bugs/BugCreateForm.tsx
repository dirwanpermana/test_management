import { useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/useAuth';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { useHeaders, useItems } from '../test-cases/useTestCases';
import { useCreateBug, useDevUsers, useUploadAttachment } from './useBugs';
import type { Priority, Severity } from '../../types/entities';

export function BugCreateForm({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const { data: devUsers = [] } = useDevUsers();
  const { data: allItems = [] } = useItems();
  const { data: headers = [] } = useHeaders();
  const createBug = useCreateBug();
  const uploadAttachment = useUploadAttachment();

  const testCaseOptions = useMemo(() => allItems.map((item) => {
    const header = headers.find((h) => h.id === item.headerId);
    const namaFitur = item.featureName || '(belum diisi)';
    return {
      value: item.caseNo,
      label: `${item.caseNo} — ${namaFitur}${header ? ` · ${header.namaTestCase}` : ''}`,
    };
  }), [allItems, headers]);

  const [testCaseNo, setTestCaseNo] = useState('');
  const [scenario, setScenario] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [actualResult, setActualResult] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [severity, setSeverity] = useState<Severity>('Medium');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setUploadError(null);

    const bug = await createBug.mutateAsync({
      testCaseNo,
      scenario,
      stepsToReproduce,
      expectedResult,
      actualResult,
      assignedTo: assignedTo || undefined,
      severity,
      priority,
    });

    if (file) {
      try {
        await uploadAttachment.mutateAsync({ bugId: bug.id, file });
      } catch {
        setUploadError('Bug berhasil dibuat, tapi upload dokumen gagal. Coba upload ulang dari halaman detail bug.');
      }
    }

    setTestCaseNo(''); setScenario(''); setStepsToReproduce('');
    setExpectedResult(''); setActualResult(''); setAssignedTo('');
    setSeverity('Medium'); setPriority('Medium'); setFile(null);
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
          options={testCaseOptions}
          value={testCaseNo}
          onChange={setTestCaseNo}
          placeholder="Cari ID atau nama test case..."
        />
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
      <div className="field">
        <label>Status</label>
        <input value="Open (default)" disabled />
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
