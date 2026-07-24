import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { RoleGuard } from '../../auth/RoleGuard';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TestCaseGrid } from './TestCaseGrid';
import {
  useCreateItem, useDeleteItem, useHeaders, useItems, useUpdateItem,
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
    // "test date tidak perlu ada waktunya" — hanya tanggal (YYYY-MM-DD), tanpa jam.
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

  const { data: items = [], isLoading } = useItems(headerId);
  const createItem = useCreateItem(headerId ?? '');
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const [pendingDelete, setPendingDelete] = useState<TestCaseItem | null>(null);

  // Header baru (belum ada baris sama sekali) langsung diisi 10 baris kosong,
  // meniru template Excel siap-isi, supaya QA tidak perlu klik "+ Tambah Baris" berulang.
  const seededHeaderRef = useRef<string | null>(null);
  useEffect(() => {
    if (isLoading || !headerId || readOnly) return;
    if (items.length > 0) return;
    if (seededHeaderRef.current === headerId) return;
    seededHeaderRef.current = headerId;

    (async () => {
      for (let i = 0; i < DEFAULT_ROW_COUNT; i += 1) {
        // Sengaja sekuensial (bukan Promise.all) supaya seq_no/case_no dari trigger
        // PostgreSQL tetap berurutan, bukan race condition antar insert paralel.
        // eslint-disable-next-line no-await-in-loop
        await createItem.mutateAsync(blankRowPayload());
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerId, isLoading, items.length, readOnly]);

  function handleAddRow() {
    if (!headerId) return;
    createItem.mutate(blankRowPayload());
  }

  return (
    <div className="page">
      <button className="btn-secondary mb-3" onClick={() => navigate('/test-cases')}>
        &larr; Kembali ke List Test Case
      </button>
      <h1>{header ? `${header.headerCode} — ${header.namaTestCase}` : 'Test Case'}</h1>
      {header && (
        <p className="muted-inline">
          Menu: <strong>{header.namaMenu}</strong>
          {header.sprint && <> · Sprint: <strong>{header.sprint}</strong></>}
          {header.jiraUrl && (
            <>
              {' · '}
              <a href={header.jiraUrl} target="_blank" rel="noreferrer">Jira</a>
            </>
          )}
        </p>
      )}

      <div className="card">
        <div className="toolbar">
          <RoleGuard allow={['QA']}>
            <button onClick={handleAddRow} disabled={!headerId}>+ Tambah Baris</button>
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
