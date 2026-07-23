interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, description, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h3>{title}</h3>
        {description && <p>{description}</p>}
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel}>Batal</button>
          <button className="btn-danger" onClick={onConfirm}>Hapus</button>
        </div>
      </div>
    </div>
  );
}
