import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseFlexibleDuration(input) {
  if (!input) return 0;
  const str = String(input).trim();
  const colonMatch = str.match(/^(\d{1,2}):(\d{1,2})$/);
  if (colonMatch) return parseInt(colonMatch[1], 10) * 60 + parseInt(colonMatch[2], 10);
  const combinedMatch = str.match(/^(\d+)\s*h\s*(\d+)\s*m?$/i);
  if (combinedMatch) return parseInt(combinedMatch[1], 10) * 60 + parseInt(combinedMatch[2], 10);
  const minutesMatch = str.match(/^(\d+)\s*m$/i);
  if (minutesMatch) return parseInt(minutesMatch[1], 10);
  const hoursMatch = str.match(/^(\d+)\s*h$/i);
  if (hoursMatch) return parseInt(hoursMatch[1], 10) * 60;
  const plainIntMatch = str.match(/^(\d+)$/);
  if (plainIntMatch) return parseInt(plainIntMatch[1], 10) * 60;
  return 0;
}

function normalizeDateStr(raw) {
  if (!raw) return null;
  const str = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const itMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (itMatch) {
    const d = itMatch[1].padStart(2, '0');
    const m = itMatch[2].padStart(2, '0');
    const y = itMatch[3];
    return `${y}-${m}-${d}`;
  }
  return null;
}

function normalizeTimeStr(raw) {
  if (!raw) return undefined;
  const str = String(raw).trim();
  const match = str.match(/^(\d{1,2}):(\d{2})$/);
  if (match) return `${match[1].padStart(2, '0')}:${match[2]}`;
  return undefined;
}

const inputCsvPath = process.argv[2] || path.resolve(__dirname, '../docs/esempi/storico_timbrature_2026.csv');
const outputJsonPath = process.argv[3] || inputCsvPath.replace(/\.csv$/i, '.json');

if (!fs.existsSync(inputCsvPath)) {
  console.error(`❌ Errore: file CSV non trovato: ${inputCsvPath}`);
  console.log(`Uso: node scripts/csvToJson.mjs <file.csv> [output.json]`);
  process.exit(1);
}

console.log(`\n⏳ Lettura file CSV: ${inputCsvPath}...`);
const content = fs.readFileSync(inputCsvPath, 'utf-8');
const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

const firstLine = lines[0];
const delimiter = firstLine.includes(';') ? ';' : ',';
const hasHeader = /data|giorno|date/i.test(firstLine);
const dataLines = hasHeader ? lines.slice(1) : lines;

const days = {};
const timeEntries = {};
let count = 0;

for (const line of dataLines) {
  const parts = line.split(delimiter).map((p) => p.trim());
  const dateStr = normalizeDateStr(parts[0]);
  if (!dateStr) continue;

  count++;
  const rawStatus = (parts[1] || '').toLowerCase();
  const in1 = normalizeTimeStr(parts[2]);
  const out1 = normalizeTimeStr(parts[3]);
  const in2 = normalizeTimeStr(parts[4]);
  const out2 = normalizeTimeStr(parts[5]);
  const rawPerm = parts[6] || '';
  const permMinutes = rawPerm ? parseFlexibleDuration(rawPerm) : 0;
  const rawMensa = (parts[7] || '').toLowerCase();
  const canteenUsed = ['si', 'sì', 'yes', 'true', '1'].includes(rawMensa);
  const note = parts[8] || undefined;

  let effectiveStatus = 'presenza';
  let isSmartWork = false;

  if (rawStatus) {
    effectiveStatus = rawStatus;
    if (rawStatus === 'smart') isSmartWork = true;
  } else if (in1 || out2) {
    effectiveStatus = 'presenza';
  } else {
    effectiveStatus = 'non_lavorativo';
  }

  days[dateStr] = {
    date: dateStr,
    status: effectiveStatus,
    isConfirmed: effectiveStatus !== 'non_lavorativo',
    notes: note,
  };

  if (effectiveStatus === 'smart' || in1 || out1 || in2 || out2 || permMinutes > 0 || canteenUsed) {
    timeEntries[dateStr] = {
      date: dateStr,
      morningIn: in1,
      lunchOut: out1,
      lunchIn: in2,
      eveningOut: out2,
      permissionMinutes: permMinutes > 0 ? permMinutes : undefined,
      canteenUsed,
      isSmartWork: isSmartWork || effectiveStatus === 'smart',
    };
  }
}

const payload = {
  version: '1.0.0',
  exportedAt: new Date().toISOString(),
  settings: {
    maxSmartDaysMonth: 10,
    minPresenceDaysWeek: 1,
    maxSmartDaysWeek: 4,
    ferieCompensatesPresence: false,
    standardDayHours: 8,
    reducedDayHours: 7,
    minLunchBreakMinutes: 30,
    maxDailyBankRecoveryMinutes: 60,
    canteenVoucherCost: 1.5,
    smartVoucherValue: 8.0,
    yearlyFerieHours: 160,
    prevYearFerieResidualHours: 0,
    yearlyParHours: 88,
    prevYearParResidualHours: 0,
    preferredLayout: 'split',
    preferredTheme: 'dark',
  },
  days,
  timeEntries,
};

fs.writeFileSync(outputJsonPath, JSON.stringify(payload, null, 2), 'utf-8');

console.log(`✅ Convertite con successo ${count} righe dal CSV!`);
console.log(`📁 File JSON generato: ${outputJsonPath}`);
console.log(`👉 Ora puoi caricarlo direttamente nell'app da Impostazioni > "Ripristina da File JSON".\n`);
