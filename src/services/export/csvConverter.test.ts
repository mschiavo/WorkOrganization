import { describe, it, expect } from 'vitest';
import { parseCsvToBackupPayload, convertBackupPayloadToCsv } from './csvConverter';

describe('csvConverter Service', () => {
  const sampleCsvSemicolon = `Data;Stato;Entrata1;Uscita1;Entrata2;Uscita2;Permesso;Mensa;Note
2026-10-01;presenza;08:01;12:06;12:35;17:36;;Si;
2026-10-02;smart;;;;;;No;Lavoro da casa
2026-10-05;ferie;;;;;;;Giorno di ferie
2026-10-06;presenza;08:30;12:30;13:00;17:00;1h;Si;Visita medica
2026-10-07;par;;;;;;;Riposo PAR`;

  it('parses CSV with semicolon delimiters into valid BackupPayload', () => {
    const payload = parseCsvToBackupPayload(sampleCsvSemicolon);

    expect(payload.version).toBe('1.0.0');
    expect(Object.keys(payload.days).length).toBe(5);

    // Day 1: Presenza con mensa
    const d1 = payload.days['2026-10-01'];
    expect(d1?.status).toBe('presenza');
    expect(d1?.isConfirmed).toBe(true);

    const t1 = payload.timeEntries['2026-10-01'];
    expect(t1?.morningIn).toBe('08:01');
    expect(t1?.lunchOut).toBe('12:06');
    expect(t1?.lunchIn).toBe('12:35');
    expect(t1?.eveningOut).toBe('17:36');
    expect(t1?.canteenUsed).toBe(true);

    // Day 2: Smart
    const d2 = payload.days['2026-10-02'];
    expect(d2?.status).toBe('smart');
    expect(payload.timeEntries['2026-10-02']?.isSmartWork).toBe(true);

    // Day 3: Ferie
    const d3 = payload.days['2026-10-05'];
    expect(d3?.status).toBe('ferie');

    // Day 4: Presenza con 1h permesso
    const t4 = payload.timeEntries['2026-10-06'];
    expect(t4?.permissionMinutes).toBe(60);

    // Day 5: PAR
    const d5 = payload.days['2026-10-07'];
    expect(d5?.status).toBe('par');
  });

  it('supports Italian date format DD/MM/YYYY and comma delimiters', () => {
    const commaCsv = `Data,Stato,Entrata1,Uscita1,Entrata2,Uscita2,Permesso,Mensa,Note
01/10/2026,presenza,08:00,12:00,12:30,16:30,30m,si,Note di test`;

    const payload = parseCsvToBackupPayload(commaCsv);
    expect(payload.days['2026-10-01']?.status).toBe('presenza');
    expect(payload.timeEntries['2026-10-01']?.morningIn).toBe('08:00');
    expect(payload.timeEntries['2026-10-01']?.permissionMinutes).toBe(30);
    expect(payload.timeEntries['2026-10-01']?.canteenUsed).toBe(true);
  });

  it('converts BackupPayload to cleanly formatted CSV and roundtrips without data loss', () => {
    const payload = parseCsvToBackupPayload(sampleCsvSemicolon);
    const csvOut = convertBackupPayloadToCsv(payload);

    expect(csvOut).toContain('Data;Stato;Entrata1;Uscita1;Entrata2;Uscita2;Permesso;Mensa;Note');
    expect(csvOut).toContain('2026-10-01;presenza;08:01;12:06;12:35;17:36;;Si;');
    expect(csvOut).toContain('2026-10-02;smart;;;;;;No;Lavoro da casa');

    // Roundtrip test
    const roundtrip = parseCsvToBackupPayload(csvOut);
    expect(roundtrip.days['2026-10-01']?.status).toBe('presenza');
    expect(roundtrip.timeEntries['2026-10-01']?.canteenUsed).toBe(true);
  });
});
