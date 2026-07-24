import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  ModuleRegistry, AllCommunityModule, themeQuartz, type ColDef, type CellValueChangedEvent,
} from 'ag-grid-community';
import type { TestCaseItem } from '../../types/entities';

ModuleRegistry.registerModules([AllCommunityModule]);

// Tema Excel-like: garis pembatas antar kolom & baris ditampilkan eksplisit.
const gridTheme = themeQuartz.withParams({
  columnBorder: true,
  rowBorder: true,
  wrapperBorder: true,
});

interface TestCaseGridProps {
  rows: TestCaseItem[];
  readOnly: boolean;
  onCellChanged: (row: TestCaseItem) => void;
  onDelete: (row: TestCaseItem) => void;
}

export function TestCaseGrid({ rows, readOnly, onCellChanged, onDelete }: TestCaseGridProps) {
  const columnDefs = useMemo<ColDef<TestCaseItem>[]>(() => {
    const base: ColDef<TestCaseItem>[] = [
      { field: 'caseNo', headerName: 'No', editable: false, pinned: 'left', width: 120 },
      { field: 'featureName', headerName: 'Feature Name', editable: !readOnly, width: 150 },
      {
        field: 'testType',
        headerName: 'Test Type',
        editable: !readOnly,
        width: 120,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: ['Positive', 'Negative'] },
        // PENTING: cellRenderer harus mengembalikan DOM element, bukan string HTML —
        // ag-Grid menganggap string sebagai teks polos (di-escape), jadi tag <span>
        // yang dikembalikan sebagai string akan tampil literal, bukan ter-render.
        cellRenderer: (params: { value?: string }) => {
          const span = document.createElement('span');
          if (params.value) {
            span.textContent = params.value;
            span.style.color = params.value === 'Negative' ? '#dc2626' : '#16a34a';
            span.style.fontWeight = '600';
          }
          return span;
        },
      },
      { field: 'scenario', headerName: 'Scenario', editable: !readOnly, flex: 2, minWidth: 200 },
      { field: 'steps', headerName: 'Steps', editable: !readOnly, flex: 2, minWidth: 200 },
      { field: 'testData', headerName: 'Data Test', editable: !readOnly, width: 160 },
      { field: 'expectedResult', headerName: 'Expected Result', editable: !readOnly, flex: 2, minWidth: 200 },
      {
        field: 'status',
        headerName: 'Status',
        editable: !readOnly,
        width: 140,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: ['Not Executed', 'Pass', 'Fail', 'Blocked', 'On Hold'] },
      },
      { field: 'picQaName', headerName: 'PIC QA', editable: false, width: 130 },
      { field: 'testDate', headerName: 'Test Date', editable: !readOnly, width: 130 },
      { field: 'note', headerName: 'Note', editable: !readOnly, width: 160 },
      { field: 'picDevName', headerName: 'PIC Dev', editable: false, width: 130 },
      { field: 'devArea', headerName: 'Area', editable: !readOnly, width: 90 },
    ];
    if (!readOnly) {
      base.push({
        headerName: '',
        width: 100,
        cellRenderer: () => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'grid-delete-btn';
          button.textContent = 'Hapus';
          return button;
        },
        onCellClicked: (event) => onDelete(event.data as TestCaseItem),
      });
    }
    return base;
  }, [readOnly, onDelete]);

  function handleCellValueChanged(e: CellValueChangedEvent<TestCaseItem>) {
    if (e.data) onCellChanged(e.data);
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
