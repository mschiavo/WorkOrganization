import React, { useState, useEffect } from 'react';
import { DayStatus } from '../../core/domain/policyValidator';
import styles from './Calendar.module.css';

export interface StatusSelectorModalProps {
  isOpen: boolean;
  date: string; // "YYYY-MM-DD"
  currentStatus?: DayStatus;
  currentNotes?: string;
  onClose: () => void;
  onSave: (date: string, status: DayStatus, notes?: string) => Promise<void> | void;
}

const CAUSALI: { status: DayStatus; label: string; testId: string }[] = [
  { status: 'presenza', label: 'Presenza', testId: 'status-btn-presenza' },
  { status: 'smart', label: 'Smart', testId: 'status-btn-smart' },
  { status: 'idea_smart', label: 'Idea Smart', testId: 'status-btn-idea_smart' },
  { status: 'ferie', label: 'Ferie', testId: 'status-btn-ferie' },
  { status: 'chiusura', label: 'Chiusura', testId: 'status-btn-chiusura' },
  { status: 'non_lavorativo', label: 'Non Lavorativo', testId: 'status-btn-non_lavorativo' },
];

export const StatusSelectorModal: React.FC<StatusSelectorModalProps> = ({
  isOpen,
  date,
  currentStatus = 'presenza',
  currentNotes = '',
  onClose,
  onSave,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<DayStatus>(currentStatus);
  const [notes, setNotes] = useState<string>(currentNotes);

  useEffect(() => {
    setSelectedStatus(currentStatus);
    setNotes(currentNotes);
  }, [date, currentStatus, currentNotes]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleStatusClick = (status: DayStatus) => {
    setSelectedStatus(status);
    onSave(date, status, notes);
    onClose();
  };

  const handleSave = () => {
    onSave(date, selectedStatus, notes);
    onClose();
  };

  return (
    <div
      className={styles.modalBackdrop}
      onClick={onClose}
      data-testid="status-selector-modal"
    >
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-date-title"
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle} id="modal-date-title">
            Pianifica Giornata: {date}
          </h3>
          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={onClose}
            data-testid="modal-close-btn"
            aria-label="Chiudi"
          >
            ✕
          </button>
        </div>

        <div className={styles.statusButtonGroup}>
          {CAUSALI.map((item) => {
            const isSelected = selectedStatus === item.status;
            return (
              <button
                key={item.status}
                type="button"
                className={styles.statusOptionBtn}
                data-testid={item.testId}
                data-selected={isSelected ? 'true' : 'false'}
                aria-pressed={isSelected}
                onClick={() => handleStatusClick(item.status)}
              >
                <span className={styles.statusDot} data-status={item.status} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.notesFieldGroup}>
          <label htmlFor="modal-notes" className={styles.notesLabel}>
            Note o giustificativo
          </label>
          <textarea
            id="modal-notes"
            className={styles.notesTextarea}
            data-testid="modal-notes-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Aggiungi una nota (es. permessi, sede trasferta...)"
          />
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            data-testid="modal-cancel-btn"
          >
            Annulla
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSave}
            data-testid="modal-save-btn"
          >
            Salva
          </button>
        </div>
      </div>
    </div>
  );
};
