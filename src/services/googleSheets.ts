import { AttendeeRecord, EventConfig } from '../types';
import { getAccessToken } from './auth';

/**
 * Creates a new Google Spreadsheet specifically for Attendance Records.
 */
export async function createAttendanceSpreadsheet(event: EventConfig): Promise<{
  spreadsheetId: string;
  spreadsheetUrl: string;
}> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Anda belum masuk dengan akun Google. Silakan klik Masuk Akun Google di tab Pengaturan.');
  }

  const title = `Daftar Hadir - ${event.name} (${event.date})`;

  const payload = {
    properties: {
      title,
      defaultFormat: {
        textFormat: {
          fontFamily: 'Calibri',
          fontSize: 10,
        },
      },
    },
    sheets: [
      {
        properties: {
          title: 'Rekap Presensi',
          gridProperties: {
            frozenRowCount: 4,
          },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              // Row 1: Title
              {
                values: [
                  {
                    userEnteredValue: { stringValue: `DAFTAR HADIR: ${event.name.toUpperCase()}` },
                    userEnteredFormat: {
                      textFormat: { bold: true, fontSize: 13 },
                    },
                  },
                ],
              },
              // Row 2: Event Details
              {
                values: [
                  {
                    userEnteredValue: {
                      stringValue: `Penyelenggara: ${event.organizer} | Tanggal: ${event.date} | Waktu: ${event.startTime} - ${event.endTime} WITA | Lokasi: ${event.locationName}`,
                    },
                    userEnteredFormat: {
                      textFormat: { italic: true, fontSize: 9, foregroundColor: { red: 0.3, green: 0.3, blue: 0.3 } },
                    },
                  },
                ],
              },
              // Row 3: Blank separator
              {
                values: [],
              },
              // Row 4: Column Headers
              {
                values: [
                  { userEnteredValue: { stringValue: 'No' }, userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.12, green: 0.35, blue: 0.7 } } },
                  { userEnteredValue: { stringValue: 'Waktu Presensi' }, userEnteredFormat: { textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }, backgroundColor: { red: 0.12, green: 0.35, blue: 0.7 } } },
                  { userEnteredValue: { stringValue: 'Tanggal' }, userEnteredFormat: { textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }, backgroundColor: { red: 0.12, green: 0.35, blue: 0.7 } } },
                  { userEnteredValue: { stringValue: 'NIP Pegawai' }, userEnteredFormat: { textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }, backgroundColor: { red: 0.12, green: 0.35, blue: 0.7 } } },
                  { userEnteredValue: { stringValue: 'Nama Lengkap' }, userEnteredFormat: { textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }, backgroundColor: { red: 0.12, green: 0.35, blue: 0.7 } } },
                  { userEnteredValue: { stringValue: 'Unit Kerja / OPD' }, userEnteredFormat: { textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }, backgroundColor: { red: 0.12, green: 0.35, blue: 0.7 } } },
                  { userEnteredValue: { stringValue: 'Jabatan' }, userEnteredFormat: { textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }, backgroundColor: { red: 0.12, green: 0.35, blue: 0.7 } } },
                  { userEnteredValue: { stringValue: 'Tanda Tangan Digital' }, userEnteredFormat: { textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }, backgroundColor: { red: 0.12, green: 0.35, blue: 0.7 } } },
                  { userEnteredValue: { stringValue: 'ID Presensi' }, userEnteredFormat: { textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }, backgroundColor: { red: 0.12, green: 0.35, blue: 0.7 } } },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Gagal membuat Google Spreadsheet baru');
  }

  const result = await response.json();
  const spreadsheetId = result.spreadsheetId;
  const spreadsheetUrl = result.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Appends an attendance record to Google Sheets.
 */
export async function appendAttendeeToSheets(
  spreadsheetId: string,
  record: AttendeeRecord,
  indexNum: number
): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;

  const range = 'Rekap Presensi!A:I';
  const rowValues = [
    indexNum,
    record.timeFormatted,
    record.dateFormatted,
    `'${record.nip}`, // leading apostrophe to prevent scientific notation in Excel/Sheets
    record.nama,
    record.unitKerja,
    record.jabatan,
    'Tervalidasi Digital',
    record.id,
  ];

  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      range
    )}:append?valueInputOption=USER_ENTERED`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowValues],
      }),
    });

    return res.ok;
  } catch (e) {
    console.error('Error appending row to Google Sheets:', e);
    return false;
  }
}

/**
 * Batch append multiple attendee records to Google Sheets.
 */
export async function batchAppendAttendees(
  spreadsheetId: string,
  records: AttendeeRecord[],
  startIndex: number
): Promise<{ success: boolean; count: number }> {
  const token = await getAccessToken();
  if (!token || records.length === 0) return { success: false, count: 0 };

  const range = 'Rekap Presensi!A:I';
  const rows = records.map((record, i) => [
    startIndex + i,
    record.timeFormatted,
    record.dateFormatted,
    `'${record.nip}`,
    record.nama,
    record.unitKerja,
    record.jabatan,
    'Tervalidasi Digital',
    record.id,
  ]);

  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      range
    )}:append?valueInputOption=USER_ENTERED`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    });

    if (res.ok) {
      return { success: true, count: records.length };
    }
    return { success: false, count: 0 };
  } catch (e) {
    console.error('Error batch syncing to Sheets:', e);
    return { success: false, count: 0 };
  }
}
