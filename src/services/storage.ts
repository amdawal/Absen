import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
  deleteDoc,
  updateDoc,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';
import { AttendeeRecord, EventConfig } from '../types';
import { appendAttendeeToSheets, batchAppendAttendees } from './googleSheets';

const EVENTS_COLLECTION = 'events';
const ATTENDEES_COLLECTION = 'attendees';
const SETTINGS_COLLECTION = 'settings';
const APP_CONFIG_DOC = 'app_config';
export const DEFAULT_EVENT_ID = 'event-smrd-01';

// Default Initial Event in Samarinda
export const DEFAULT_EVENT: EventConfig = {
  id: DEFAULT_EVENT_ID,
  name: 'Rapat Koordinasi Evaluasi Kinerja Perangkat Daerah Kota Samarinda',
  description: 'Pertemuan koordinasi dan evaluasi program prioritas pembangunan Pemerintah Kota Samarinda Tahun 2026.',
  date: new Date().toISOString().split('T')[0],
  startTime: '08:30',
  endTime: '12:00',
  locationName: 'Ruang Rapat Mangkupalas, Balaikota Samarinda, Jl. Kusuma Bangsa',
  organizer: 'Sekretariat Daerah Kota Samarinda',
  picName: 'H. Hero Mardanus Satyawan, S.T., M.T.',
  picNip: '19700315 199603 1 004',
  sheetName: 'Rekap Presensi',
  isActive: true,
  createdAt: new Date().toISOString(),
};

// Default Initial Sample Attendees
export const SAMPLE_ATTENDEES: AttendeeRecord[] = [
  {
    id: 'att-sample-01',
    eventId: DEFAULT_EVENT_ID,
    nip: '19780412 200312 1 006',
    nama: 'Dr. H. Arief Setyawan, S.Kom., M.Cs.',
    unitKerja: 'Dinas Komunikasi dan Informatika (Diskominfo)',
    jabatan: 'Kepala Dinas',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    timeFormatted: '08:15:20 WITA',
    dateFormatted: '24 Agustus 2026',
    signatureDataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60"><path d="M10 40 Q 30 10, 50 35 T 90 20 T 130 45" stroke="%231e3a8a" stroke-width="2.5" fill="none"/></svg>',
    isSyncedToSheets: true,
  },
  {
    id: 'att-sample-02',
    eventId: DEFAULT_EVENT_ID,
    nip: '19820920 200604 2 018',
    nama: 'Hj. Ratna Indrayani, S.STP., M.Si.',
    unitKerja: 'Badan Kepegawaian dan Pengembangan Sumber Daya Manusia (BKPSDM)',
    jabatan: 'Sekretaris Badan',
    timestamp: new Date(Date.now() - 2400000).toISOString(),
    timeFormatted: '08:24:45 WITA',
    dateFormatted: '24 Agustus 2026',
    signatureDataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60"><path d="M15 30 Q 40 5, 70 45 T 120 15 T 145 35" stroke="%231e3a8a" stroke-width="2.5" fill="none"/></svg>',
    isSyncedToSheets: true,
  },
  {
    id: 'att-sample-03',
    eventId: DEFAULT_EVENT_ID,
    nip: '19850118 200902 1 002',
    nama: 'Muhammad Fadli, S.Sos., M.AP.',
    unitKerja: 'Kecamatan Samarinda Kota',
    jabatan: 'Camat Samarinda Kota',
    timestamp: new Date(Date.now() - 1200000).toISOString(),
    timeFormatted: '08:32:10 WITA',
    dateFormatted: '24 Agustus 2026',
    signatureDataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60"><path d="M20 45 Q 50 15, 80 40 T 110 25 T 140 40" stroke="%231e3a8a" stroke-width="2.5" fill="none"/></svg>',
    isSyncedToSheets: true,
  },
];

/**
 * Compresses and downscales a base64 signature image aggressively (tiny thumbnail ~4-8KB)
 * to store directly in Firestore without external storage requirements.
 */
export async function compressSignatureDataUrl(dataUrl: string): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return dataUrl;
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Limit dimensions to max 180x90 for tiny size footprint (~4-8KB)
        const scale = Math.min(1, 180 / Math.max(img.width, 1), 90 / Math.max(img.height, 1));
        canvas.width = Math.max(60, Math.floor(img.width * scale));
        canvas.height = Math.max(30, Math.floor(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.5));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
}

/**
 * Get and increment atomic indexNum from Firestore counter without reading all attendee docs.
 */
export async function getNextAttendeeIndex(eventId: string): Promise<number> {
  const counterRef = doc(db, 'counters', eventId);
  try {
    const nextIndex = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(counterRef);
      const current = snap.exists() ? Number(snap.data()?.count || 0) : 0;
      const updated = current + 1;
      transaction.set(
        counterRef,
        { count: updated, lastUpdated: new Date().toISOString() },
        { merge: true }
      );
      return updated;
    });
    return nextIndex;
  } catch (err) {
    console.warn('Atomic counter transaction fallback:', err);
    return 1;
  }
}

/**
 * Get active event ID from app config doc or localStorage
 */
export async function getActiveEventId(): Promise<string> {
  try {
    const configRef = doc(db, SETTINGS_COLLECTION, APP_CONFIG_DOC);
    const snap = await getDoc(configRef);
    if (snap.exists() && snap.data()?.activeEventId) {
      return snap.data().activeEventId;
    }
  } catch (e) {
    console.warn('Could not read activeEventId from Firestore settings:', e);
  }
  return localStorage.getItem('si_presensi_active_event_id') || DEFAULT_EVENT_ID;
}

/**
 * Set active event ID in Firestore settings and localStorage, updating isActive flag across events
 */
export async function setActiveEventIdInDb(eventId: string): Promise<void> {
  await setEventActiveStatus(eventId, true);
}

/**
 * Explicitly toggle an event's active or inactive status in Firestore
 */
export async function setEventActiveStatus(eventId: string, isActive: boolean): Promise<void> {
  try {
    const configRef = doc(db, SETTINGS_COLLECTION, APP_CONFIG_DOC);
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const snap = await getDocs(eventsRef);

    if (isActive) {
      // 1. Update app_config to point to this event
      await setDoc(
        configRef,
        { activeEventId: eventId, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      localStorage.setItem('si_presensi_active_event_id', eventId);

      // 2. Set isActive: true for this event, and false for others
      const updatePromises: Promise<any>[] = [];
      snap.forEach((docSnap) => {
        const isTarget = docSnap.id === eventId;
        if (docSnap.data().isActive !== isTarget) {
          updatePromises.push(updateDoc(docSnap.ref, { isActive: isTarget }));
        }
      });
      await Promise.all(updatePromises);
    } else {
      // Deactivating this specific event
      const targetDoc = doc(db, EVENTS_COLLECTION, eventId);
      await updateDoc(targetDoc, { isActive: false });

      // Check if this was the active event in app_config
      const configSnap = await getDoc(configRef);
      if (configSnap.exists() && configSnap.data()?.activeEventId === eventId) {
        // Find if any other event is active
        let otherActiveId: string | null = null;
        snap.forEach((docSnap) => {
          if (docSnap.id !== eventId && docSnap.data().isActive === true) {
            otherActiveId = docSnap.id;
          }
        });

        await setDoc(
          configRef,
          { activeEventId: otherActiveId, updatedAt: new Date().toISOString() },
          { merge: true }
        );

        if (otherActiveId) {
          localStorage.setItem('si_presensi_active_event_id', otherActiveId);
        } else {
          localStorage.removeItem('si_presensi_active_event_id');
        }
      }
    }
  } catch (err) {
    console.warn('Error setting event active status:', err);
    throw err;
  }
}

/**
 * Subscribe in real-time to all events from Firebase Firestore.
 */
export function subscribeToAllEvents(
  onUpdate: (events: EventConfig[]) => void
) {
  const eventsRef = collection(db, EVENTS_COLLECTION);

  return onSnapshot(
    eventsRef,
    async (snapshot) => {
      if (!snapshot.empty) {
        const events: EventConfig[] = [];
        snapshot.forEach((docSnap) => {
          events.push({ id: docSnap.id, ...docSnap.data() } as EventConfig);
        });

        // Sort: active event first, then date desc
        events.sort((a, b) => {
          if (a.isActive && !b.isActive) return -1;
          if (!a.isActive && b.isActive) return 1;
          return (b.date || '').localeCompare(a.date || '');
        });

        onUpdate(events);
      } else {
        // Seed default initial event
        try {
          await setDoc(doc(db, EVENTS_COLLECTION, DEFAULT_EVENT.id), DEFAULT_EVENT);
          onUpdate([DEFAULT_EVENT]);
        } catch (err) {
          console.warn('Error seeding default event in Firestore:', err);
          onUpdate([DEFAULT_EVENT]);
        }
      }
    },
    (error) => {
      console.error('Firestore events subscription error:', error);
      onUpdate([DEFAULT_EVENT]);
    }
  );
}

/**
 * Fetch all events list directly from Firestore.
 */
export async function getAllEvents(): Promise<EventConfig[]> {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const snapshot = await getDocs(eventsRef);
    if (!snapshot.empty) {
      const list: EventConfig[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as EventConfig);
      });
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      return list;
    }
  } catch (err) {
    console.warn('Error fetching all events:', err);
  }
  return [DEFAULT_EVENT];
}

/**
 * Create a new event and store in Firestore.
 */
export async function createEvent(newEvent: EventConfig): Promise<EventConfig> {
  const eventId = newEvent.id || `event-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const shouldBeActive = newEvent.isActive ?? false;

  const eventToSave: EventConfig = {
    ...newEvent,
    id: eventId,
    createdAt: newEvent.createdAt || new Date().toISOString(),
    isActive: shouldBeActive,
  };

  const eventRef = doc(db, EVENTS_COLLECTION, eventId);
  await setDoc(eventRef, eventToSave);

  if (shouldBeActive) {
    await setActiveEventIdInDb(eventId);
  }

  return eventToSave;
}

/**
 * Delete an event from Firestore.
 */
export async function deleteEvent(eventId: string): Promise<void> {
  const eventRef = doc(db, EVENTS_COLLECTION, eventId);
  await deleteDoc(eventRef);

  // If deleted event was active, clean up config
  try {
    const configRef = doc(db, SETTINGS_COLLECTION, APP_CONFIG_DOC);
    const snap = await getDoc(configRef);
    if (snap.exists() && snap.data()?.activeEventId === eventId) {
      await setDoc(configRef, { activeEventId: null, updatedAt: new Date().toISOString() }, { merge: true });
      localStorage.removeItem('si_presensi_active_event_id');
    }
  } catch (e) {
    console.warn('Error cleaning up deleted event from config:', e);
  }
}

/**
 * Subscribe in real-time to the active event config from Firebase Firestore.
 * Automatically synchronizes with any event marked isActive: true or configured in app_config.
 */
export function subscribeToActiveEvent(
  initialEventId: string = DEFAULT_EVENT_ID,
  onUpdate: (event: EventConfig) => void
) {
  const eventsRef = collection(db, EVENTS_COLLECTION);
  const configRef = doc(db, SETTINGS_COLLECTION, APP_CONFIG_DOC);

  let activeEventId = localStorage.getItem('si_presensi_active_event_id') || initialEventId;

  // Listen to both the config doc and events collection
  const unsubscribeEvents = onSnapshot(
    eventsRef,
    async (snapshot) => {
      if (!snapshot.empty) {
        const events: EventConfig[] = [];
        snapshot.forEach((docSnap) => {
          events.push({ id: docSnap.id, ...docSnap.data() } as EventConfig);
        });

        // 1. Prefer event with isActive === true
        const activeEvent = events.find((e) => e.isActive === true);
        if (activeEvent) {
          activeEventId = activeEvent.id;
          localStorage.setItem('si_presensi_active_event_id', activeEvent.id);
          onUpdate(activeEvent);
          return;
        }

        // 2. If no event has isActive === true, look for matching activeEventId
        const matchConfig = events.find((e) => e.id === activeEventId);
        if (matchConfig) {
          onUpdate(matchConfig);
          return;
        }

        // 3. Fallback to first available event (marked with its actual isActive status)
        if (events.length > 0) {
          onUpdate(events[0]);
          return;
        }
      }

      // 4. Default fallback if empty
      onUpdate(DEFAULT_EVENT);
    },
    (error) => {
      console.error('Firestore active event subscription error:', error);
      onUpdate(DEFAULT_EVENT);
    }
  );

  const unsubscribeConfig = onSnapshot(
    configRef,
    (configSnap) => {
      if (configSnap.exists() && configSnap.data()?.activeEventId) {
        activeEventId = configSnap.data().activeEventId;
        localStorage.setItem('si_presensi_active_event_id', activeEventId);
      }
    },
    () => {}
  );

  return () => {
    unsubscribeEvents();
    unsubscribeConfig();
  };
}

/**
 * Save updated event config to Firebase Firestore.
 */
export async function updateEventConfig(event: EventConfig): Promise<void> {
  const eventRef = doc(db, EVENTS_COLLECTION, event.id || DEFAULT_EVENT_ID);
  await setDoc(eventRef, event, { merge: true });
}

/**
 * Fetch latest event configuration directly from Firestore.
 */
export async function getLatestEventConfig(
  eventId: string = DEFAULT_EVENT_ID
): Promise<EventConfig> {
  try {
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    const snapshot = await getDoc(eventRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as EventConfig;
    }
  } catch (err) {
    console.warn('Error fetching latest event config:', err);
  }
  return DEFAULT_EVENT;
}

/**
 * Fetch ALL attendee records directly from Firestore in chronological order (timestamp asc)
 * without any pagination limit, filterable by eventId and optional date, ensuring complete and up-to-date reports.
 */
export async function getAllAttendeesForReport(
  eventId?: string,
  eventDate?: string
): Promise<AttendeeRecord[]> {
  try {
    const attendeesRef = collection(db, ATTENDEES_COLLECTION);
    const q = query(attendeesRef, orderBy('timestamp', 'asc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return [];
    }

    const records: AttendeeRecord[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as AttendeeRecord;
      const matchEvent = !eventId || eventId === 'all' || data.eventId === eventId;
      
      // Check date match if provided
      let matchDate = true;
      if (eventDate && eventDate !== 'all' && eventDate !== 'Semua Tanggal') {
        const recordIsoDate = data.timestamp ? data.timestamp.split('T')[0] : '';
        const recordFormatted = data.dateFormatted || '';
        matchDate = recordIsoDate === eventDate || recordFormatted.includes(eventDate);
      }

      if (matchEvent && matchDate) {
        records.push({ id: docSnap.id, ...data });
      }
    });
    return records;
  } catch (err) {
    console.error('Error fetching all attendees for report:', err);
    return [];
  }
}

/**
 * Get distinct dates for an event's attendees
 */
export async function getDistinctAttendeeDates(eventId?: string): Promise<string[]> {
  try {
    const records = await getAllAttendeesForReport(eventId);
    const dates = new Set<string>();
    records.forEach((r) => {
      if (r.timestamp) {
        dates.add(r.timestamp.split('T')[0]);
      }
    });
    return Array.from(dates).sort().reverse();
  } catch (err) {
    return [];
  }
}

/**
 * Subscribe in real-time to the attendees list from Firebase Firestore with limit(50).
 */
export function subscribeToAttendees(
  eventId: string = DEFAULT_EVENT_ID,
  onUpdate: (attendees: AttendeeRecord[]) => void,
  limitCount: number = 50
) {
  const attendeesRef = collection(db, ATTENDEES_COLLECTION);
  const q = query(
    attendeesRef,
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(
    q,
    async (snapshot) => {
      if (!snapshot.empty) {
        const records: AttendeeRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as AttendeeRecord;
          if (!data.eventId || data.eventId === eventId) {
            records.push({ id: docSnap.id, ...data });
          }
        });
        onUpdate(records);
      } else {
        // Seed sample attendees if collection is completely empty
        try {
          for (const sample of SAMPLE_ATTENDEES) {
            await setDoc(doc(db, ATTENDEES_COLLECTION, sample.id), sample);
          }
          onUpdate(SAMPLE_ATTENDEES);
        } catch (err) {
          console.warn('Error seeding sample attendees in Firestore:', err);
          onUpdate([]);
        }
      }
    },
    (error) => {
      console.error('Firestore attendees subscription error:', error);
      onUpdate([]);
    }
  );
}

/**
 * Add a new presence record directly to Firestore with compressed signature data and atomic index counter.
 * Fast non-blocking save that returns immediately.
 */
export async function addAttendeeRecord(
  record: AttendeeRecord,
  event: EventConfig
): Promise<AttendeeRecord> {
  const updatedRecord = { ...record };

  // Compress signature aggressively (~4-8KB) directly into Firestore document
  if (updatedRecord.signatureDataUrl) {
    updatedRecord.signatureDataUrl = await compressSignatureDataUrl(updatedRecord.signatureDataUrl);
  }

  // Concurrently get next atomic index and save document to Firestore
  const indexPromise = getNextAttendeeIndex(event.id);
  const attendeeRef = doc(db, ATTENDEES_COLLECTION, record.id);
  const savePromise = setDoc(attendeeRef, updatedRecord);

  // Background Google Sheets sync (non-blocking)
  if (event.spreadsheetId && navigator.onLine) {
    indexPromise
      .then((indexNum) => {
        appendAttendeeToSheets(event.spreadsheetId!, updatedRecord, indexNum)
          .then(async (success) => {
            if (success) {
              try {
                await updateDoc(attendeeRef, {
                  isSyncedToSheets: true,
                  syncedAt: new Date().toISOString(),
                  syncError: null,
                });
              } catch (e) {
                console.warn('Updated sync status in Firestore:', e);
              }
            }
          })
          .catch((err) => {
            console.warn('Background Sheets sync error:', err);
          });
      })
      .catch((err) => {
        console.warn('Index computation error for Sheets:', err);
      });
  }

  // Wait for firestore save with timeout guarantee
  await Promise.race([
    savePromise,
    new Promise((resolve) => setTimeout(resolve, 800)),
  ]);

  return updatedRecord;
}

/**
 * Delete attendee record from Firebase Firestore.
 */
export async function deleteAttendeeRecord(id: string): Promise<void> {
  const attendeeRef = doc(db, ATTENDEES_COLLECTION, id);
  await deleteDoc(attendeeRef);
}

/**
 * Sync all unsynced records from Firestore to Google Sheets.
 */
export async function syncOfflineAttendees(
  event: EventConfig,
  currentAttendees: AttendeeRecord[]
): Promise<{ syncedCount: number; error?: string }> {
  if (!event.spreadsheetId) {
    return { syncedCount: 0, error: 'Spreadsheet ID belum ditautkan pada tab Pengaturan' };
  }

  const unsynced = currentAttendees.filter(
    (a) => a.eventId === event.id && !a.isSyncedToSheets
  );

  if (unsynced.length === 0) {
    return { syncedCount: 0 };
  }

  const syncedList = currentAttendees.filter((a) => a.eventId === event.id && a.isSyncedToSheets);
  const startIndex = syncedList.length + 1;

  const result = await batchAppendAttendees(event.spreadsheetId, unsynced, startIndex);

  if (result.success && result.count > 0) {
    // Update synced status in Firebase Firestore for all synced items
    for (const item of unsynced) {
      try {
        const attendeeRef = doc(db, ATTENDEES_COLLECTION, item.id);
        await updateDoc(attendeeRef, {
          isSyncedToSheets: true,
          syncedAt: new Date().toISOString(),
          syncError: null,
        });
      } catch (err) {
        console.warn(`Failed to update sync flag for ${item.id} in Firestore:`, err);
      }
    }

    return { syncedCount: result.count };
  }

  return {
    syncedCount: 0,
    error: 'Gagal mengirim data ke Google Sheets. Pastikan akun Google terhubung dan Spreadsheet valid.',
  };
}
