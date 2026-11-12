import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  RotateCcw,
  Sliders,
  DollarSign,
  Cloud,
  Palmtree,
} from 'lucide-react';
import { useWorkOrganizer } from '../../context/WorkOrganizerContext';
import { DEFAULT_SETTINGS, localCache } from '../../services/storage/localCache';
import { createBackupJson, parseAndValidateBackup } from '../../services/export/backupService';
import { downloadMonthExcel } from '../../services/export/excelExporter';
import styles from './Settings.module.css';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    currentYear,
    currentMonth,
    days,
    timeEntries,
    settings,
    updateSettings,
    refreshData,
  } = useWorkOrganizer();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [maxSmartDaysMonth, setMaxSmartDaysMonth] = useState(settings.maxSmartDaysMonth);
  const [minPresenceDaysWeek, setMinPresenceDaysWeek] = useState(settings.minPresenceDaysWeek);
  const [maxSmartDaysWeek, setMaxSmartDaysWeek] = useState(settings.maxSmartDaysWeek);
  const [minLunchBreakMinutes, setMinLunchBreakMinutes] = useState(settings.minLunchBreakMinutes);
  const [canteenVoucherCost, setCanteenVoucherCost] = useState(settings.canteenVoucherCost);
  const [smartVoucherValue, setSmartVoucherValue] = useState(settings.smartVoucherValue);

  const [yearlyFerieHours, setYearlyFerieHours] = useState(settings.yearlyFerieHours);
  const [prevYearFerieResidualHours, setPrevYearFerieResidualHours] = useState(settings.prevYearFerieResidualHours);
  const [yearlyParHours, setYearlyParHours] = useState(settings.yearlyParHours);
  const [prevYearParResidualHours, setPrevYearParResidualHours] = useState(settings.prevYearParResidualHours);

  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMaxSmartDaysMonth(settings.maxSmartDaysMonth);
      setMinPresenceDaysWeek(settings.minPresenceDaysWeek);
      setMaxSmartDaysWeek(settings.maxSmartDaysWeek);
      setMinLunchBreakMinutes(settings.minLunchBreakMinutes);
      setCanteenVoucherCost(settings.canteenVoucherCost);
      setSmartVoucherValue(settings.smartVoucherValue);
      setYearlyFerieHours(settings.yearlyFerieHours);
      setPrevYearFerieResidualHours(settings.prevYearFerieResidualHours);
      setYearlyParHours(settings.yearlyParHours);
      setPrevYearParResidualHours(settings.prevYearParResidualHours);

      const conf = localCache.getSupabaseConfig();
      if (conf) {
        setSupabaseUrl(conf.url);
        setSupabaseKey(conf.anonKey);
      } else {
        setSupabaseUrl(import.meta.env.VITE_SUPABASE_URL || '');
        setSupabaseKey(import.meta.env.VITE_SUPABASE_ANON_KEY || '');
      }
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (supabaseUrl.trim() && supabaseKey.trim()) {
      localCache.saveSupabaseConfig({
        url: supabaseUrl.trim(),
        anonKey: supabaseKey.trim(),
      });
    }

    await updateSettings({
      maxSmartDaysMonth: Number(maxSmartDaysMonth),
      minPresenceDaysWeek: Number(minPresenceDaysWeek),
      maxSmartDaysWeek: Number(maxSmartDaysWeek),
      minLunchBreakMinutes: Number(minLunchBreakMinutes),
      canteenVoucherCost: Number(canteenVoucherCost),
      smartVoucherValue: Number(smartVoucherValue),
      yearlyFerieHours: Number(yearlyFerieHours),
      prevYearFerieResidualHours: Number(prevYearFerieResidualHours),
      yearlyParHours: Number(yearlyParHours),
      prevYearParResidualHours: Number(prevYearParResidualHours),
    });

    onClose();
  };

  const handleResetDefaults = () => {
    setMaxSmartDaysMonth(DEFAULT_SETTINGS.maxSmartDaysMonth);
    setMinPresenceDaysWeek(DEFAULT_SETTINGS.minPresenceDaysWeek);
    setMaxSmartDaysWeek(DEFAULT_SETTINGS.maxSmartDaysWeek);
    setMinLunchBreakMinutes(DEFAULT_SETTINGS.minLunchBreakMinutes);
    setCanteenVoucherCost(DEFAULT_SETTINGS.canteenVoucherCost);
    setSmartVoucherValue(DEFAULT_SETTINGS.smartVoucherValue);
    setYearlyFerieHours(DEFAULT_SETTINGS.yearlyFerieHours);
    setPrevYearFerieResidualHours(DEFAULT_SETTINGS.prevYearFerieResidualHours);
    setYearlyParHours(DEFAULT_SETTINGS.yearlyParHours);
    setPrevYearParResidualHours(DEFAULT_SETTINGS.prevYearParResidualHours);
  };

  const handleExportExcel = () => {
    downloadMonthExcel(currentYear, currentMonth, days, timeEntries, settings);
  };

  const handleExportJson = () => {
    const jsonStr = createBackupJson(settings, days, timeEntries);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WorkOrganizer_Backup_${currentYear}_${String(currentMonth).padStart(2, '0')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backup = parseAndValidateBackup(text);

      localCache.saveSettings(backup.settings);
      localCache.saveCalendarDays(backup.days);
      localCache.saveTimeEntries(backup.timeEntries);

      await refreshData();
      alert('Backup ripristinato con successo!');
      onClose();
    } catch (err: any) {
      alert(`Errore nel ripristino del backup: ${err.message}`);
    }
  };

  return (
    <div
      className={styles.modalBackdrop}
      onClick={onClose}
      data-testid="settings-modal"
    >
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle} id="settings-title">
            Impostazioni & Accordatura Parametri
          </h2>
          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={onClose}
            data-testid="modal-close-btn"
            aria-label="Chiudi impostazioni"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Section: Policy e Orari */}
          <div className={styles.settingsSection}>
            <h3 className={styles.sectionTitle}>
              <Sliders size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />
              Regole Smart Working & Orari
            </h3>
            <div className={styles.grid2Col}>
              <div className={styles.inputFieldGroup}>
                <label htmlFor="setting-max-smart" className={styles.fieldLabel}>
                  Target Smart Mensile (giorni)
                </label>
                <input
                  id="setting-max-smart"
                  type="number"
                  className={styles.textInput}
                  data-testid="setting-max-smart"
                  value={maxSmartDaysMonth}
                  onChange={(e) => setMaxSmartDaysMonth(Number(e.target.value))}
                  min={1}
                  max={31}
                />
                <span className={styles.fieldHint}>Obiettivo mensile aziendale (default 10)</span>
              </div>

              <div className={styles.inputFieldGroup}>
                <label htmlFor="setting-min-presence" className={styles.fieldLabel}>
                  Presenze Minime / Settimana
                </label>
                <input
                  id="setting-min-presence"
                  type="number"
                  className={styles.textInput}
                  data-testid="setting-min-presence"
                  value={minPresenceDaysWeek}
                  onChange={(e) => setMinPresenceDaysWeek(Number(e.target.value))}
                  min={0}
                  max={7}
                />
                <span className={styles.fieldHint}>Almeno 1 giorno in sede (Lun-Dom)</span>
              </div>

              <div className={styles.inputFieldGroup}>
                <label htmlFor="setting-max-smart-week" className={styles.fieldLabel}>
                  Massimo Smart / Settimana
                </label>
                <input
                  id="setting-max-smart-week"
                  type="number"
                  className={styles.textInput}
                  data-testid="setting-max-smart-week"
                  value={maxSmartDaysWeek}
                  onChange={(e) => setMaxSmartDaysWeek(Number(e.target.value))}
                  min={1}
                  max={7}
                />
                <span className={styles.fieldHint}>Limite massimo (default 4)</span>
              </div>

              <div className={styles.inputFieldGroup}>
                <label htmlFor="setting-min-lunch" className={styles.fieldLabel}>
                  Pausa Pranzo Minima (minuti)
                </label>
                <input
                  id="setting-min-lunch"
                  type="number"
                  className={styles.textInput}
                  data-testid="setting-min-lunch"
                  value={minLunchBreakMinutes}
                  onChange={(e) => setMinLunchBreakMinutes(Number(e.target.value))}
                  min={0}
                  max={120}
                />
                <span className={styles.fieldHint}>Detrazione minima se &lt;30m (default 30)</span>
              </div>
            </div>
          </div>

          {/* Section: Buoni Pasto & Economico */}
          <div className={styles.settingsSection}>
            <h3 className={styles.sectionTitle}>
              <DollarSign size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />
              Buoni Pasto & Modulo Economico
            </h3>
            <div className={styles.grid2Col}>
              <div className={styles.inputFieldGroup}>
                <label htmlFor="setting-canteen-cost" className={styles.fieldLabel}>
                  Costo Buono Mensa (€)
                </label>
                <input
                  id="setting-canteen-cost"
                  type="number"
                  step="0.10"
                  className={styles.textInput}
                  data-testid="setting-canteen-cost"
                  value={canteenVoucherCost}
                  onChange={(e) => setCanteenVoucherCost(Number(e.target.value))}
                />
                <span className={styles.fieldHint}>Spesa a carico dipendente (default 1.50 €)</span>
              </div>

              <div className={styles.inputFieldGroup}>
                <label htmlFor="setting-smart-value" className={styles.fieldLabel}>
                  Valore Buono Smart (€)
                </label>
                <input
                  id="setting-smart-value"
                  type="number"
                  step="0.10"
                  className={styles.textInput}
                  data-testid="setting-smart-value"
                  value={smartVoucherValue}
                  onChange={(e) => setSmartVoucherValue(Number(e.target.value))}
                />
                <span className={styles.fieldHint}>Valore accreditato al dipendente (default 8.00 €)</span>
              </div>
            </div>
          </div>

          {/* Section: Ferie e PAR Annuali */}
          <div className={styles.settingsSection}>
            <h3 className={styles.sectionTitle}>
              <Palmtree size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />
              Spettanze Annuali Ferie & Permessi (PAR)
            </h3>
            <div className={styles.grid2Col}>
              <div className={styles.inputFieldGroup}>
                <label htmlFor="setting-yearly-ferie" className={styles.fieldLabel}>
                  Ferie Spettanti Anno (ore)
                </label>
                <input
                  id="setting-yearly-ferie"
                  type="number"
                  className={styles.textInput}
                  data-testid="setting-yearly-ferie"
                  value={yearlyFerieHours}
                  onChange={(e) => setYearlyFerieHours(Number(e.target.value))}
                  min={0}
                />
                <span className={styles.fieldHint}>Es. 160 ore (20 giorni da 8h)</span>
              </div>

              <div className={styles.inputFieldGroup}>
                <label htmlFor="setting-prev-ferie" className={styles.fieldLabel}>
                  Residuo Ferie Anno Precedente (ore)
                </label>
                <input
                  id="setting-prev-ferie"
                  type="number"
                  className={styles.textInput}
                  data-testid="setting-prev-ferie"
                  value={prevYearFerieResidualHours}
                  onChange={(e) => setPrevYearFerieResidualHours(Number(e.target.value))}
                  min={0}
                />
                <span className={styles.fieldHint}>Ore residue riportate dall'anno scorso</span>
              </div>

              <div className={styles.inputFieldGroup}>
                <label htmlFor="setting-yearly-par" className={styles.fieldLabel}>
                  PAR / Permessi Spettanti Anno (ore)
                </label>
                <input
                  id="setting-yearly-par"
                  type="number"
                  className={styles.textInput}
                  data-testid="setting-yearly-par"
                  value={yearlyParHours}
                  onChange={(e) => setYearlyParHours(Number(e.target.value))}
                  min={0}
                />
                <span className={styles.fieldHint}>Spettanza annuale da contratto (es. 88h o 104h)</span>
              </div>

              <div className={styles.inputFieldGroup}>
                <label htmlFor="setting-prev-par" className={styles.fieldLabel}>
                  Residuo PAR Anno Precedente (ore)
                </label>
                <input
                  id="setting-prev-par"
                  type="number"
                  className={styles.textInput}
                  data-testid="setting-prev-par"
                  value={prevYearParResidualHours}
                  onChange={(e) => setPrevYearParResidualHours(Number(e.target.value))}
                  min={0}
                />
                <span className={styles.fieldHint}>Ore di permessi residue riportate</span>
              </div>
            </div>
          </div>

          {/* Section: Cloud & Supabase Config */}
          <div className={styles.settingsSection}>
            <h3 className={styles.sectionTitle}>
              <Cloud size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />
              Connessione Cloud (Supabase)
            </h3>
            <div className={styles.inputFieldGroup}>
              <label htmlFor="setting-supabase-url" className={styles.fieldLabel}>
                Project URL
              </label>
              <input
                id="setting-supabase-url"
                type="text"
                className={styles.textInput}
                data-testid="setting-supabase-url"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
              />
            </div>

            <div className={styles.inputFieldGroup}>
              <label htmlFor="setting-supabase-key" className={styles.fieldLabel}>
                Anon / Public API Key
              </label>
              <input
                id="setting-supabase-key"
                type="password"
                className={styles.textInput}
                data-testid="setting-supabase-key"
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="eyJhbGciOi..."
              />
            </div>
          </div>

          {/* Section: Backup, Export & Reset */}
          <div className={styles.settingsSection}>
            <h3 className={styles.sectionTitle}>Esportazione Dati & Backup</h3>
            <div className={styles.actionButtonsRow}>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.exportBtn}`}
                data-testid="btn-export-excel"
                onClick={handleExportExcel}
              >
                <FileSpreadsheet size={16} />
                <span>Esporta Mese (.xlsx)</span>
              </button>

              <button
                type="button"
                className={styles.actionBtn}
                data-testid="btn-export-json"
                onClick={handleExportJson}
              >
                <Download size={16} />
                <span>Scarica Backup (JSON)</span>
              </button>

              <button
                type="button"
                className={styles.actionBtn}
                data-testid="btn-import-json"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} />
                <span>Ripristina Backup</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                data-testid="input-import-file"
                onChange={handleImportFileChange}
              />

              <button
                type="button"
                className={`${styles.actionBtn} ${styles.resetBtn}`}
                data-testid="btn-reset-defaults"
                onClick={handleResetDefaults}
              >
                <RotateCcw size={16} />
                <span>Reset Predefiniti</span>
              </button>
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            data-testid="btn-cancel-settings"
          >
            Annulla
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSave}
            data-testid="btn-save-settings"
          >
            Salva Impostazioni
          </button>
        </div>
      </div>
    </div>
  );
};
