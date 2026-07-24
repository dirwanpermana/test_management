import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { RoleGuard } from '../../auth/RoleGuard';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TestCaseGrid } from './TestCaseGrid';
import { TestCaseHeaderEditableCard } from './TestCaseHeaderEditableCard';
import {
  useCreateItem, useDeleteItem, useHeaders, useItems,
  useQaUsers, useUploadCapture, useBulkUpdateItems,
} from './useTestCases';
import type { TestCaseItem } from '../../types/entities';

const DEFAULT_ROW_COUNT = 10;

function blankRowPayload() {
  return {
    featureName: '',
    testType: 'Positive' as const,
    scenario: '',
    steps: '',
    expectedResult: '',
    status: 'Not Executed' as const,
    testDate: new Date().toISOString().slice(0, 10),
  };
}

export function TestCaseItemsPage() {
  const { headerId } = useParams<{ headerId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const readOnly = user?.role !== 'QA';

  const { data: headers = [] } = useHeaders();
  const header = headers.find((h) => h.id === headerId);

  const { data: items = [], isLoading, isError, error } = useItems(headerId);
  const { data: qaUsers = [] } = useQaUsers();
  const createItem = useCreateItem(headerId ?? '');
  const deleteItem = useDeleteItem();
  const uploadCapture = useUploadCapture();
  const bulkUpdate = useBulkUpdateItems();
  const [pendingDelete, setPendingDelete] = useState<TestCaseItem | null>(null);

  const dirtyRef = useRef<Map<string, TestCaseItem>>(new Map());
  const [dirtyCount, setDirtyCount] = useState(0);

  const seededHeaderRef = useRef<string | null>(null);
  useEffect(() => {
    if (isLoading || !headerId || readOnly) return;
    if (items.length > 0) return;
    if (seededHeaderRef.current === headerId) return;
    seededHeaderRef.current = headerId;

    (async () => {
      try {
        for (let i = 0; i < DEFAULT_ROW_COUNT; i += 1) {
          // eslint-disable-next-line no-await-in-loop
          await createItem.mutateAsync(blankRowPayload());
        }
      } catch (err) {
        console.error('Auto-seed gagal:', err);
        seededHeaderRef.current = null;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerId, isLoading, items.length, readOnly]);

  function handleAddRow() {
    if (!headerId) return;
    createItem.mutate(blankRowPayload());
  }

  function handleRowDirty(row: TestCaseItem) {
    dirtyRef.current.set(row.id, row);
    setDirtyCount(dirtyRef.current.size);
  }

  async function handleSave() {
    const payload = Array.from(dirtyRef.current.values()).map((row) => ({ id: row.id, payload: row }));
    if (payload.length === 0) return;
    await bulkUpdate.mutateAsync(payload);
    dirtyRef.current.clear();
    setDirtyCount(0);
  }

  function handleBack() {
    if (dirtyCount > 0 && !window.confirm(`Ada ${dirtyCount} baris belum disimpan. Tetap keluar?`)) return;
    navigate('/test-cases');
  }

  return (
    <div className="page">
      {header && <TestCaseHeaderEditableCard header={header} readOnly={readOnly} />}

      <button className="btn-secondary mb-3" onClick={handleBack}>
        &larr; Kembali ke List Test Case
      </button>

      <div className="card">
        <div className="toolbar">
          <RoleGuard allow={['QA']}>
            <button onClick={handleAddRow} disabled={!headerId}>+ Tambah Baris</button>
            <button onClick={handleSave} disabled={dirtyCount === 0 || bulkUpdate.isPending}>
              {bulkUpdate.isPending ? 'Menyimpan...' : `💾 Simpan${dirtyCount > 0 ? ` (${dirtyCount})` : ''}`}
            </button>
          </RoleGuard>
        </div>

        {isError ? (
          <p className="error-text">Gagal memuat data: {(error as Error).message}</p>
        ) : isLoading ? (
          <p>Memuat data...</p>
        ) : (
          <TestCaseGrid
            rows={items}
            readOnly={readOnly}
            qaUsers={qaUsers}
            onRowDirty={handleRowDirty}
            onDelete={(row) => setPendingDelete(row)}
            onCaptureUpload={(row, file) => uploadCapture.mutate({ itemId: row.id, file })}
            onAddRow={handleAddRow}
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