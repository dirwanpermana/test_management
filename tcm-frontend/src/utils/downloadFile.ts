export function triggerBlobDownload(data: BlobPart, filename: string): void {
  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// Windows/macOS melarang karakter ini di nama file.
export function sanitizeFilenamePart(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, '_').trim();
}

export function currentUserName(): string {
  try {
    const stored = localStorage.getItem('tcm_user');
    if (!stored) return 'user';
    const parsed = JSON.parse(stored) as { fullName?: string };
    return parsed.fullName ?? 'user';
  } catch {
    return 'user';
  }
}

export function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}