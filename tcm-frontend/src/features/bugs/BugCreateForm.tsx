import { useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useCreateBug, useDevUsers } from './useBugs';

export function BugCreateForm({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const { data: devUsers = [] } = useDevUsers();
  const createBug = useCreateBug();

  const [testCaseNo, setTestCaseNo] = useState('');
  const [scenario, setScenario] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [actualResult, setActualResult] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await createBug.mutateAsync({
      testCaseNo, scenario, stepsToReproduce, expectedResult, actualResult, assignedTo: assignedTo || undefined,
    });
    setTestCaseNo(''); setScenario(''); setStepsToReproduce('');
    setExpectedResult(''); setActualResult(''); setAssignedTo('');
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
        <input
          value={testCaseNo}
          onChange={(e) => setTestCaseNo(e.target.value)}
          placeholder="260722-01"
          required
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
        <input type="file" disabled title="Mock: koneksi storage belum di-wire" />
      </div>
      <div className="field">
        <label>Status</label>
        <input value="Open (default)" disabled />
      </div>
      <button type="submit" disabled={createBug.isPending}>
        {createBug.isPending ? 'Mengirim...' : 'Submit'}
      </button>
    </form>
  );
}
