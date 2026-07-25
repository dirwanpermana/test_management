import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {Table} from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';
import { useAuth } from '../../auth/useAuth';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useCreateNote, useDeleteNote, useNote, useNotes, useUpdateNote } from './useNotes';

const lowlight = createLowlight(common);

export function NotesPage() {
  const { user } = useAuth();

  const { data: notes = [], isLoading } = useNotes();
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const updateNote = useUpdateNote();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const isSwitchingNote = useRef(false);

  useEffect(() => {
    if (!activeId && notes.length > 0) setActiveId(notes[0].id);
  }, [notes, activeId]);

  const { data: activeNote } = useNote(activeId ?? undefined);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: '',
    onUpdate: ({ editor: ed }) => {
      if (isSwitchingNote.current) return; // isi ulang saat ganti catatan bukan edit user, jangan tandai dirty
      setContent(ed.getHTML());
      setIsDirty(true);
    },
  });

  useEffect(() => {
    if (!editor || !activeNote) return;
    isSwitchingNote.current = true;
    editor.commands.setContent(activeNote.content || '<p></p>',{ emitUpdate:false});
    setTitle(activeNote.title);
    setContent(activeNote.content);
    setIsDirty(false);
    requestAnimationFrame(() => { isSwitchingNote.current = false; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNote?.id, editor]);

  if (user?.role !== 'QA') return <Navigate to="/test-cases" replace />;

  function handleTitleChange(value: string) {
    setTitle(value);
    setIsDirty(true);
  }

  async function handleSave() {
    if (!activeId || !isDirty) return;
    await updateNote.mutateAsync({ id: activeId, payload: { title: title || 'Untitled', content } });
    setIsDirty(false);
  }

  function confirmDiscardIfDirty(): boolean {
    if (!isDirty) return true;
    return window.confirm('Ada perubahan belum disimpan. Tetap pindah dan buang perubahan?');
  }

  function handleSelectNote(id: string) {
    if (id === activeId) return;
    if (!confirmDiscardIfDirty()) return;
    setActiveId(id);
  }

  async function handleNewNote() {
    if (!confirmDiscardIfDirty()) return;
    const note = await createNote.mutateAsync();
    setActiveId(note.id);
  }

  async function handleDelete() {
    if (!confirmDeleteId) return;
    await deleteNote.mutateAsync(confirmDeleteId);
    if (activeId === confirmDeleteId) {
      setActiveId(null);
      setIsDirty(false);
    }
    setConfirmDeleteId(null);
  }

  function handleDownloadPdf() {
    window.print();
  }

  const inTable = editor?.isActive('table') ?? false;

  return (
    <div className="page">
      <div className="notes-layout">
        <div className="notes-sidebar">
          <button className="notes-new-btn" onClick={handleNewNote} disabled={createNote.isPending}>
            + Catatan Baru
          </button>
          <div className="notes-list">
            {isLoading && <p className="muted">Memuat...</p>}
            {notes.map((n) => (
              <button
                key={n.id}
                className={`notes-list-item${n.id === activeId ? ' active' : ''}`}
                onClick={() => handleSelectNote(n.id)}
              >
                <span className="notes-list-item-title">{n.title || 'Untitled'}</span>
                <span className="notes-list-item-meta">
                  {n.updatedByName ?? ''} · {new Date(n.updatedAt).toLocaleDateString('id-ID')}
                </span>
              </button>
            ))}
            {!isLoading && notes.length === 0 && (
              <p className="muted">Belum ada catatan. Klik &quot;+ Catatan Baru&quot; untuk mulai.</p>
            )}
          </div>
        </div>

        <div className="notes-editor">
          {!activeNote || !editor ? (
            <div className="notes-empty">Pilih atau buat catatan untuk mulai menulis.</div>
          ) : (
            <>
              <div className="notes-editor-header">
                <input
                  className="notes-title-input"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Untitled"
                />
                <div className="notes-editor-actions">
                  <button onClick={handleSave} disabled={!isDirty || updateNote.isPending}>
                    {updateNote.isPending ? 'Menyimpan...' : isDirty ? '💾 Simpan' : '✓ Tersimpan'}
                  </button>
                  <button className="btn-secondary" onClick={handleDownloadPdf}>📄 Download PDF</button>
                  <button className="btn-danger" onClick={() => setConfirmDeleteId(activeNote.id)}>Hapus</button>
                </div>
              </div>
              <div className="notes-editor-meta">
                Terakhir diubah oleh {activeNote.updatedByName ?? '-'} ·{' '}
                {new Date(activeNote.updatedAt).toLocaleString('id-ID')}
                {isDirty && <span className="notes-unsaved"> · Ada perubahan belum disimpan</span>}
              </div>

              <div className="notes-toolbar">
                <button
                  type="button"
                  className={`notes-toolbar-btn${editor.isActive('bold') ? ' active' : ''}`}
                  title="Bold"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                >B</button>
                <button
                  type="button"
                  className={`notes-toolbar-btn${editor.isActive('italic') ? ' active' : ''}`}
                  title="Italic"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                >I</button>
                <button
                  type="button"
                  className={`notes-toolbar-btn${editor.isActive('heading', { level: 2 }) ? ' active' : ''}`}
                  title="Heading"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                >H</button>
                <button
                  type="button"
                  className={`notes-toolbar-btn${editor.isActive('codeBlock') ? ' active' : ''}`}
                  title="Code Block"
                  onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                >{'</>'}</button>
                <button
                  type="button"
                  className={`notes-toolbar-btn${editor.isActive('taskList') ? ' active' : ''}`}
                  title="Checklist"
                  onClick={() => editor.chain().focus().toggleTaskList().run()}
                >☑</button>
                <button
                  type="button"
                  className="notes-toolbar-btn"
                  title="Sisipkan Tabel 3x3"
                  onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                >▦</button>

                {inTable && (
                  <span className="notes-table-controls">
                    <button type="button" className="notes-toolbar-btn" onClick={() => editor.chain().focus().addColumnAfter().run()}>+Kolom</button>
                    <button type="button" className="notes-toolbar-btn" onClick={() => editor.chain().focus().addRowAfter().run()}>+Baris</button>
                    <button type="button" className="notes-toolbar-btn" onClick={() => editor.chain().focus().deleteColumn().run()}>-Kolom</button>
                    <button type="button" className="notes-toolbar-btn" onClick={() => editor.chain().focus().deleteRow().run()}>-Baris</button>
                    <button type="button" className="notes-toolbar-btn" onClick={() => editor.chain().focus().deleteTable().run()}>Hapus Tabel</button>
                  </span>
                )}
              </div>

              <div className="notes-print-area">
                <h2 className="notes-print-title">{title || 'Untitled'}</h2>
                <EditorContent editor={editor} className="notes-editor-content" />
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Hapus catatan ini?"
        description="Tindakan ini tidak bisa dibatalkan."
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}