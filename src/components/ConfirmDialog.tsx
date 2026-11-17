import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({ title, description, cancelLabel, confirmLabel, onCancel, onConfirm }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    cancelRef.current?.focus();
    return () => {
      if (dialog.open && typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
      previousFocus?.focus();
    };
  }, []);

  return (
    <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description" onCancel={event => { event.preventDefault(); onCancel(); }}>
      <h2 id="confirm-dialog-title" className="confirm-dialog-title">{title}</h2>
      <p id="confirm-dialog-description" className="confirm-dialog-description">{description}</p>
      <div className="confirm-dialog-actions">
        <button ref={cancelRef} type="button" className="confirm-dialog-cancel" onClick={onCancel}>{cancelLabel}</button>
        <button type="button" className="confirm-dialog-confirm" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </dialog>
  );
}
