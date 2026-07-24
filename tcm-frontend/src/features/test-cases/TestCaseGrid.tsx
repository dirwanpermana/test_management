import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  ModuleRegistry, AllCommunityModule, themeQuartz,
  type ColDef, type CellValueChangedEvent, type ICellEditorParams,
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

function DeleteButtonCell({ data, onDelete }: { data: TestCaseItem; onDelete: (row: TestCaseItem) => void }) {
  return (
    <button type="button" className="grid-delete-btn" onClick={() => onDelete(data)}>
      Hapus
    </button>
  );
}

function CaptureCell({
  data, onUpload,
}: { data: TestCaseItem; onUpload: (row: TestCaseItem, file: File) => void }) {
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

// Custom cell editor: auto-grow (maks ~70 karakter per baris) + Enter menambah baris baru.
// Shift+Enter tetap bisa dipakai untuk baris baru DI DALAM sel yang sama.
interface AutoGrowParams extends ICellEditorParams {
  onEnterNewRow?: () => void;
}

const AutoGrowTextEditor = forwardRef((props: AutoGrowParams, ref) => {
  const valueRef = useRef<string>(props.value ?? '');
  const taRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    getValue: () => valueRef.current,
    isCancelBeforeStart: () => false,
    isCancelAfterEnd: () => false,
  }));

  return (
    <textarea
      ref={taRef}
      className="grid-autogrow-textarea"
      autoFocus
      defaultValue={valueRef.current}
      rows={1}
      onChange={(e) => { valueRef.current = e.target.value; }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          props.api.stopEditing();
          props.onEnterNewRow?.();
        }
      }}
    />
  );
});

interface TestCaseGridProps {
  rows: TestCaseItem[];
  readOnly: boolean;
  qaUsers: UserOption[];
  onRowDirty: (row: TestCaseItem) => void;   // diganti dari onCellChanged
  onDelete: (row: TestCaseItem) => void;
  onCaptureUpload: (row: TestCaseItem, file: File) => void;
  onAddRow: () => void;
}

export function TestCaseGrid({
  rows, readOnly, qaUsers, onRowDirty, onDelete, onCaptureUpload, onAddRow,
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
        cellClass: 'monospace-cell', // buat referensi teknis (mis. Postman/Bug linking)
      },
      { field: 'featureName', headerName: 'Feature Name', editable: !readOnly, width: 150 },
      {
        field: 'testType', headerName: 'Test Type', editable: !readOnly, width: 120,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: ['Positive', 'Negative'] },
        cellRenderer: TestTypeCell,
      },
      {
        field: 'scenario', headerName: 'Scenario', editable: !readOnly, flex: 2, minWidth: 200,
        wrapText: true, autoHeight: true,
        cellEditor: AutoGrowTextEditor,
        cellEditorPopup: true,
        cellEditorParams: { onEnterNewRow: onAddRow },
      },
      { field: 'steps', headerName: 'Steps', editable: !readOnly, flex: 2, minWidth: 200, wrapText: true, autoHeight: true },
      { field: 'testData', headerName: 'Data Test', editable: !readOnly, width: 160 },
      { field: 'expectedResult', headerName: 'Expected Result', editable: !readOnly, flex: 2, minWidth: 200, wrapText: true, autoHeight: true },
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
          // Catatan: verifikasi nama param ini terhadap ag-grid v36 docs kalau
          // dropdown tampil raw UUID — API agSelectCellEditor sempat berubah antar major.
          formatValue: (id: string) => qaNameById.get(id) ?? id,
        },
        valueFormatter: (p) => qaNameById.get(p.value as string) ?? p.data?.picQaName ?? '',
      },
      { field: 'testDate', headerName: 'Test Date', editable: !readOnly, width: 130 },
      { field: 'note', headerName: 'Note', editable: !readOnly, width: 160 },
      {
        field: 'devArea', headerName: 'PIC Dev', editable: !readOnly, width: 130,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: ['Backend', 'Frontend'] },
      },
      {
        headerName: 'Capture', editable: false, width: 160,
        cellRenderer: (p: { data: TestCaseItem }) => (
          <CaptureCell data={p.data} onUpload={onCaptureUpload} />
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
  }, [readOnly, onDelete, qaUsers, qaNameById, onCaptureUpload, onAddRow]);

  function handleCellValueChanged(e: CellValueChangedEvent<TestCaseItem>) {
    // if (e.data) onCellChanged(e.data);
    if (e.data) onRowDirty(e.data);
  }

  return (
    <div className="test-case-grid-wrapper">
      <AgGridReact<TestCaseItem>
        theme={gridTheme}
        rowData={rows}
        columnDefs={columnDefs}
        onCellValueChanged={handleCellValueChanged}
        stopEditingWhenCellsLoseFocus
        singleClickEdit
      />
    </div>
  );
}