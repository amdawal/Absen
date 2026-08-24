export interface AttendeeRecord {
  id: string;
  eventId: string;
  nip: string;
  nama: string;
  unitKerja: string;
  jabatan: string;
  timestamp: string; // ISO string
  timeFormatted: string; // e.g. "08:15:30 WITA"
  dateFormatted: string; // e.g. "24 Agustus 2026"
  signatureDataUrl: string; // Base64 PNG
  isSyncedToSheets: boolean;
  syncedAt?: string;
  syncError?: string;
}

export interface EventConfig {
  id: string;
  name: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  locationName: string;
  organizer: string;
  picName: string;
  picNip: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  sheetName?: string;
}

export interface PDFExportOptions {
  institutionName: string;
  subHeader: string;
  addressHeader: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  picName: string;
  picNip: string;
  picTitle: string;
  filterUnitKerja?: string;
}
