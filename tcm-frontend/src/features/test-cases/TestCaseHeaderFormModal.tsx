import { useRef, useState, type FormEvent } from 'react';
import { useCreateHeader, useImportItems } from './useTestCases';

interface Props {
  onClose: () => void;
  onCreated: (headerId: string) => void;
}

export function TestCaseHeaderFormModal({ onClose, onCreated }: Props) {
  const createHeader = useCreateHeader();
  const importItems = useImportItems();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [namaTestCase, setNamaTestCase] = useState('');
  // const [sprint, setSprint] = useState('');
  const [sprint, setSprint] = useState('');
  const [namaMenu, setNamaMenu] = useState('');
  const [jiraUrl, setJiraUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  const isBusy = createHeader.isPending || importItems.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setImportSummary(null);
    try {
      const header = await createHeader.mutateAsync({ 
        // namaTestCase, sprint, namaMenu, jiraUrl 
        namaTestCase,
        sprint: sprint.trim() === '' ? null : Number(sprint),
        namaMenu,
        jiraUrl,
      });

      if (file) {
        try {
          const result = await importItems.mutateAsync({ headerId: header.id, file });
          if (result.skipped.length > 0) {
            const preview = result.skipped.slice(0, 3)
              .map((s) => `baris ${s.rowNumber}: ${s.message}`)
              .join('; ');
            setImportSummary(
              `${result.inserted} baris berhasil diimpor, ${result.skipped.length} baris dilewati (${preview}${result.skipped.length > 3 ? ', ...' : ''}).`,
            );
            // Header sudah terlanjur dibuat & sebagian data sudah masuk —
            // tampilkan ringkasan dulu 2 detik sebelum pindah halaman, supaya
            // pesan sempat terbaca.
            setTimeout(() => onCreated(header.id), 2500);
            return;
          }
        } catch (err) {
          const data = (err as { response?: { data?: { message?: string; missing?: string[]; unexpected?: string[] } } }).response?.data;
          if (data?.missing?.length) {
            setError(
              `Test case berhasil dibuat, tapi format Excel tidak sesuai template — kolom hilang: ${data.missing.join(', ')}. `
              + `Silakan isi manual, atau perbaiki file lalu import lagi lewat tombol "Import Excel" di halaman detail.`,
            );
          } else {
            setError('Test case berhasil dibuat, tapi import Excel gagal. Silakan isi manual atau coba import ulang dari halaman detail.');
          }
          onCreated(header.id);
          return;
        }
      }

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
          <input value="Otomatis" disabled />
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
          {/* <input value={sprint} onChange={(e) => setSprint(e.target.value)} placeholder="Sprint 12" /> */}
        <input type="number" min={1} step={1} value={sprint} onChange={(e) => setSprint(e.target.value)} placeholder="Sprint 23"/>
        </div>
        <div className="field">
          <label>Nama Menu</label>
          <input value={namaMenu} onChange={(e) => setNamaMenu(e.target.value)} required />
        </div>
        <div className="field">
          <label>Jira URL</label>
          <input value={jiraUrl} onChange={(e) => setJiraUrl(e.target.value)} placeholder="https://jira..." />
        </div>

        <div className="field">
          <label>Upload Test Case (opsional)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <span className="muted-inline" style={{ marginTop: 4 }}>
            Kolom yang diambil: Pastikan file Test case yang di upload sesuai template!
          </span>
        </div>

        {error && <div className="error-text">{error}</div>}
        {importSummary && <div className="muted-inline">{importSummary}</div>}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={isBusy}>Batal</button>
          <button type="submit" disabled={isBusy}>
            {createHeader.isPending ? 'Menyimpan...' : importItems.isPending ? 'Mengimpor Excel...' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  );
}