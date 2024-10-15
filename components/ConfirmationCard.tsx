// src/app/components/ConfirmationCard.tsx

import React from 'react';
import { Check, X } from 'lucide-react';
import styles from './ConfirmationCard.module.scss';

interface ConfirmationCardProps {
  messageContent: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationCard: React.FC<ConfirmationCardProps> = ({ messageContent, onConfirm, onCancel }) => {
  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <h3 className={styles.title}>Confirm Note</h3>
        <p className={styles.message}>{messageContent}</p>
        <div className={styles.buttons}>
          <button className={styles.confirmButton} onClick={onConfirm}>
            <Check className={styles.icon} /> Confirm
          </button>
          <button className={styles.cancelButton} onClick={onCancel}>
            <X className={styles.icon} /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationCard;
