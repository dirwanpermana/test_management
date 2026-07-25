import { useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  ModuleRegistry, AllCommunityModule, themeQuartz,
  type ColDef, type CellValueChangedEvent, type GetRowIdParams,
} from 'ag-grid-community';
import type { TestCaseItem } from '../../types/entities';
import type { UserOption } from '../../api/userApi';

ModuleRegistry.registerModules([AllCommunityModule]);

const gridTheme = themeQuartz.withParams({
  columnBorder: true,
  rowBorder: true,
  wrapperBorder: true,
});

const STATUS_BG: Record<string, string> = {
  'Not Executed': '#f3f4f6',
  Pass: '#dcfce7',
  Fail: '#fee2e2',
  Blocked: '#ffedd5',
  'On Hold': '#e0e7ff',
};

function TestTypeCell({ value }: { value?: string }) {
  if (!value) return null;
  return (
    <span style={{ color: value === 'Negative' ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
      {value}
    </span>
  );
}

function CaseIdCell({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard API butuh secure context (HTTPS/localhost) — di dev lokal
      // aman. Kalau gagal (mis. permission diblokir), diamkan saja; teks
      // tetap bisa di-select manual seperti biasa.
    }
  }

  return (
    <span
      className={`case-id-cell${copied ? ' copied' : ''}`}
      onClick={handleCopy}
      title="Klik untuk salin"
    >
      <strong>{value}</strong>
      <span className="case-id-copy-icon">{copied ? '✓ Tersalin' : '⧉'}</span>
    </span>
  );
}

function DeleteButtonCell({ data, onDelete }: { data: TestCaseItem; onDelete: (row: TestCaseItem) => void }) {
  return (
    <button type="button" className="grid-delete-btn" onClick={() => onDelete(data)}>
      Hapus
    </button>
  );
}

function CaptureCell({
  data, onUpload, readOnly,
 }: { data: TestCaseItem; onUpload: (row: TestCaseItem, file: File) => void; readOnly: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isImage = /\.(png|jpe?g|gif|webp)$/i.test(data.captureFileName ?? '');

  function pick() {
    inputRef.current?.click();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onUpload(data, file);
    e.target.value = '';
  }

  // Dev cuma boleh melihat capture yang sudah ada, tidak boleh
  // upload/ganti — dia hanya punya akses view.
   if (readOnly) {
     return data.captureUrl ? (
       <a href={data.captureUrl} target="_blank" rel="noreferrer" title={data.captureFileName}>
         {isImage ? <img src={data.captureUrl} alt="" className="capture-thumb" /> : '📄 Lihat'}
       </a>
     ) : (
       <span className="muted">-</span>
     );
   }

  return (
    <div className="capture-cell">
      {data.captureUrl ? (
        <>
          <a href={data.captureUrl} target="_blank" rel="noreferrer" title={data.captureFileName}>
            {isImage ? <img src={data.captureUrl} alt="" className="capture-thumb" /> : '📄 Lihat'}
          </a>
          <button type="button" className="btn-link" onClick={pick}>Ganti</button>
        </>
      ) : (
        <button type="button" className="btn-secondary" onClick={pick}>Upload</button>
      )}
      <input ref={inputRef} type="file" hidden accept=".pdf,.doc,.docx,image/*" onChange={handleChange} />
    </div>
  );
}

// GANTI TOTAL: dari custom forwardRef editor -> editor BAWAAN ag-Grid
// (agLargeTextCellEditor), dibuat resmi oleh tim ag-Grid persis untuk kasus
// "textarea multi-baris di popup, tanpa batas karakter praktis". Enter =
// newline (bawaan, tidak perlu suppressKeyboardEvent lagi), Tab/klik-keluar
// = commit, Escape = batal — semua sudah ditangani internal, tidak lagi
// bergantung pada getValue() custom yang berkali-kali bermasalah.
const MULTILINE_EDITOR: Pick<ColDef, 'cellEditor' | 'cellEditorPopup' | 'cellEditorParams' | 'wrapText' | 'autoHeight'> = {
  cellEditor: 'agLargeTextCellEditor',
  cellEditorPopup: true,
  cellEditorParams: {
    maxLength: 100000, // "tanpa validasi maksimal" secara praktis — angka besar, bukan batas nyata
    rows: 8,
    cols: 60,
  },
  wrapText: true,
  autoHeight: true,
};

interface TestCaseGridProps {
  rows: TestCaseItem[];
  readOnly: boolean;
  qaUsers: UserOption[];
  onRowDirty: (row: TestCaseItem) => void;
  onDelete: (row: TestCaseItem) => void;
  onCaptureUpload: (row: TestCaseItem, file: File) => void;
}

export function TestCaseGrid({
  rows, readOnly, qaUsers, onRowDirty, onDelete, onCaptureUpload,
}: TestCaseGridProps) {
  const qaNameById = useMemo(
    () => new Map(qaUsers.map((u) => [u.id, u.fullName])),
    [qaUsers],
  );

  const columnDefs = useMemo<ColDef<TestCaseItem>[]>(() => {
    const base: ColDef<TestCaseItem>[] = [
      {
        headerName: 'No', editable: false, pinned: 'left', width: 70,
        valueGetter: (p) => p.data?.displayNo,
      },
      {
        field: 'caseNo', headerName: 'Case ID', editable: false, width: 150,
        cellClass: 'monospace-cell',
        cellRenderer: (p: { value: string }) => <CaseIdCell value={p.value} />,
      },
      {
        field: 'featureName', headerName: 'Feature Name', editable: !readOnly, flex: 1, minWidth: 160,
        ...MULTILINE_EDITOR,
      },
      {
        field: 'testType', headerName: 'Test Type', editable: !readOnly, width: 120,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: ['Positive', 'Negative'] },
        cellRenderer: TestTypeCell,
      },
      {
        field: 'scenario', headerName: 'Scenario', editable: !readOnly, flex: 2, minWidth: 200,
        ...MULTILINE_EDITOR,
      },
      {
        field: 'steps', headerName: 'Steps', editable: !readOnly, flex: 2, minWidth: 200,
        ...MULTILINE_EDITOR,
      },
      {
        field: 'testData', headerName: 'Data Test', editable: !readOnly, width: 180,
        ...MULTILINE_EDITOR,
      },
      {
        field: 'expectedResult', headerName: 'Expected Result', editable: !readOnly, flex: 2, minWidth: 200,
        ...MULTILINE_EDITOR,
      },
      {
        field: 'status', headerName: 'Status', editable: !readOnly, width: 140,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: ['Not Executed', 'Pass', 'Fail', 'Blocked', 'On Hold'] },
        cellStyle: (p) => ({ background: STATUS_BG[p.value as string] ?? 'transparent', fontWeight: 600 }),
      },
      {
        field: 'picQa', headerName: 'PIC QA', editable: !readOnly, width: 160,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: qaUsers.map((u) => u.id),
          formatValue: (id: string) => qaNameById.get(id) ?? id,
        },
        valueFormatter: (p) => qaNameById.get(p.value as string) ?? p.data?.picQaName ?? '',
      },
      { field: 'testDate', headerName: 'Test Date', editable: !readOnly, width: 130 },
      {
        field: 'note', headerName: 'Note', editable: !readOnly, width: 180,
        ...MULTILINE_EDITOR,
      },
      {
        field: 'devArea', headerName: 'PIC Dev', editable: !readOnly, width: 130,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: ['Backend', 'Frontend'] },
      },
      {
        headerName: 'Capture', editable: false, width: 160,
        cellRenderer: (p: { data: TestCaseItem }) => (
          <CaptureCell data={p.data} onUpload={onCaptureUpload} readOnly={readOnly} />
        ),
      },
    ];
    if (!readOnly) {
      base.push({
        headerName: '', width: 100,
        cellRenderer: (p: { data: TestCaseItem }) => (
          <DeleteButtonCell data={p.data} onDelete={onDelete} />
        ),
      });
    }
    return base;
  }, [readOnly, onDelete, qaUsers, qaNameById, onCaptureUpload]);

  function handleCellValueChanged(e: CellValueChangedEvent<TestCaseItem>) {
    if (e.data) onRowDirty(e.data);
  }

  return (
    <div className="test-case-grid-wrapper">
      <AgGridReact<TestCaseItem>
        theme={gridTheme}
        rowData={rows}
        getRowId={(p: GetRowIdParams<TestCaseItem>) => p.data.id}
        columnDefs={columnDefs}
        onCellValueChanged={handleCellValueChanged}
        stopEditingWhenCellsLoseFocus
        singleClickEdit
      />
    </div>
  );
}