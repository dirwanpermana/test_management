import { useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import { RoleGuard } from '../../auth/RoleGuard';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TestCaseCreateForm } from './TestCaseCreateForm';
import { TestCaseGrid } from './TestCaseGrid';
import {
  useCreateItem, useDeleteItem, useHeaders, useItems, useUpdateItem,
} from './useTestCases';
import type { TestCaseItem } from '../../types/entities';

export function TestCaseListPage() {
  const { user } = useAuth();
  const readOnly = user?.role !== 'QA';

  const { data: headers = [] } = useHeaders();
  const [selectedHeaderId, setSelectedHeaderId] = useState<string | undefined>(undefined);
  const activeHeaderId = selectedHeaderId ?? headers[0]?.id;

  const { data: items = [], isLoading } = useItems(activeHeaderId);
  const createItem = useCreateItem(activeHeaderId ?? '');
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const [pendingDelete, setPendingDelete] = useState<TestCaseItem | null>(null);

  function handleAddRow() {
    if (!activeHeaderId) return;
    createItem.mutate({
      featureName: '',
      testType: 'Positive',
      scenario: '',
      steps: '',
      expectedResult: '',
      status: 'Not Executed',
    });
  }

  return (
    <div className="page">
      <h1>Test Case</h1>

      <RoleGuard allow={['QA']}>
        <TestCaseCreateForm onCreated={(id) => setSelectedHeaderId(id)} />
      </RoleGuard>

      <div className="card">
        <div className="toolbar">
          <label>Suite / Header:</label>
          <select
            value={activeHeaderId ?? ''}
            onChange={(e) => setSelectedHeaderId(e.target.value)}
          >
            {headers.map((h) => (
              <option key={h.id} value={h.id}>
                {h.headerCode} — {h.namaTestCase} ({h.namaMenu})
              </option>
            ))}
          </select>

          <RoleGuard allow={['QA']}>
            <button onClick={handleAddRow} disabled={!activeHeaderId}>+ Tambah Baris</button>
          </RoleGuard>
        </div>

        {isLoading ? (
          <p>Memuat data...</p>
        ) : (
          <TestCaseGrid
            rows={items}
            readOnly={readOnly}
            onCellChanged={(row) => updateItem.mutate({ id: row.id, payload: row })}
            onDelete={(row) => setPendingDelete(row)}
          />
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Hapus test case ${pendingDelete?.caseNo}?`}
        description="Tindakan ini tidak bisa dibatalkan."
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete) await deleteItem.mutateAsync(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
