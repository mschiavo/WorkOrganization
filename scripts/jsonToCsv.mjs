import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function formatFlexibleDuration(minutes) {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

const inputJsonPath = process.argv[2] || path.resolve(__dirname, '../docs/esempi/WorkOrganization_Import_2026.json');
const outputCsvPath = process.argv[3] || inputJsonPath.replace(/\.json$/i, '.csv');

if (!fs.existsSync(inputJsonPath)) {
  console.error(`❌ Errore: file JSON non trovato: ${inputJsonPath}`);
  console.log(`Uso: node scripts/jsonToCsv.mjs <file.json> [output.csv]`);
  process.exit(1);
}

console.log(`\n⏳ Lettura file JSON: ${inputJsonPath}...`);
const payload = JSON.parse(fs.readFileSync(inputJsonPath, 'utf-8'));

const header = 'Data;Stato;Entrata1;Uscita1;Entrata2;Uscita2;Permesso;Mensa;Note';
const allDates = Array.from(new Set([...Object.keys(payload.days || {}), ...Object.keys(payload.timeEntries || {})])).sort();

const rows = allDates.map((dateStr) => {
  const day = payload.days?.[dateStr];
  const entry = payload.timeEntries?.[dateStr];

  const status = day?.status || (entry?.isSmartWork ? 'smart' : (entry?.morningIn ? 'presenza' : ''));
  const in1 = entry?.morningIn || '';
  const out1 = entry?.lunchOut || '';
  const in2 = entry?.lunchIn || '';
  const out2 = entry?.eveningOut || '';
  const perm = entry?.permissionMinutes ? formatFlexibleDuration(entry.permissionMinutes) : '';
  const mensa = entry?.canteenUsed ? 'Si' : (entry && status === 'presenza' ? 'No' : '');
  const note = day?.notes || '';

  return `${dateStr};${status};${in1};${out1};${in2};${out2};${perm};${mensa};${note}`;
});

const csvOut = [header, ...rows].join('\n');
fs.writeFileSync(outputCsvPath, csvOut, 'utf-8');

console.log(`✅ Esportate con successo ${rows.length} righe in CSV!`);
console.log(`📁 File CSV generato: ${outputCsvPath}`);
console.log(`👉 Puoi aprire e modificare questo file comodamente in Excel o con qualsiasi editor di testo.\n`);
