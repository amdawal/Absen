import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AttendeeRecord, EventConfig, PDFExportOptions } from '../types';

export function generateAttendancePDF(
  attendees: AttendeeRecord[],
  event: EventConfig,
  options: PDFExportOptions
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Official Kop Surat Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20, 35, 75);
  doc.text(options.institutionName.toUpperCase(), pageWidth / 2, 16, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(options.subHeader.toUpperCase(), pageWidth / 2, 21, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(options.addressHeader, pageWidth / 2, 26, { align: 'center' });

  // Double Line Separator
  doc.setDrawColor(20, 35, 75);
  doc.setLineWidth(0.8);
  doc.line(14, 29, pageWidth - 14, 29);
  doc.setLineWidth(0.2);
  doc.line(14, 30, pageWidth - 14, 30);

  // 2. Report Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('DAFTAR HADIR PESERTA KEGIATAN', pageWidth / 2, 38, { align: 'center' });

  // 3. Event Information Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 42, pageWidth - 28, 22, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  doc.setFont('helvetica', 'bold');
  doc.text('Kegiatan', 18, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${options.eventName}`, 46, 48);

  doc.setFont('helvetica', 'bold');
  doc.text('Hari / Tanggal', 18, 53);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${options.eventDate} | Pukul: ${event.startTime} - ${event.endTime} WITA`, 46, 53);

  doc.setFont('helvetica', 'bold');
  doc.text('Tempat', 18, 58);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${options.eventLocation}`, 46, 58);

  // 4. Attendees Table with Embedded Signatures
  const tableData = attendees.map((att, index) => [
    index + 1,
    att.nip,
    att.nama,
    att.unitKerja,
    att.jabatan,
    att.timeFormatted,
    '', // Placeholder for signature rendering
  ]);

  autoTable(doc, {
    startY: 68,
    margin: { left: 14, right: 14 },
    head: [
      [
        'No',
        'NIP Pegawai',
        'Nama Lengkap',
        'Unit Kerja / OPD',
        'Jabatan',
        'Waktu',
        'Tanda Tangan',
      ],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138], // Dark Blue
      textColor: 255,
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      valign: 'middle',
      minCellHeight: 14,
    },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: 32, font: 'courier', fontSize: 7.5 },
      2: { cellWidth: 42, fontStyle: 'bold' },
      3: { cellWidth: 40 },
      4: { cellWidth: 26 },
      5: { cellWidth: 16, halign: 'center', fontSize: 7 },
      6: { cellWidth: 17, halign: 'center' },
    },
    didDrawCell: (data) => {
      // Draw signature image if in column 6 and it's a body cell
      if (data.section === 'body' && data.column.index === 6) {
        const attendee = attendees[data.row.index];
        if (attendee && attendee.signatureDataUrl && attendee.signatureDataUrl.startsWith('data:image')) {
          try {
            const imgWidth = 14;
            const imgHeight = 9;
            const posX = data.cell.x + (data.cell.width - imgWidth) / 2;
            const posY = data.cell.y + (data.cell.height - imgHeight) / 2;
            doc.addImage(attendee.signatureDataUrl, 'PNG', posX, posY, imgWidth, imgHeight);
          } catch (e) {
            // fallback if SVG or unsupported format
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text('Tervalidasi', data.cell.x + 2, data.cell.y + 7);
          }
        }
      }
    },
  });

  // 5. Summary & Sign-off footer
  const finalY = (doc as any).lastAutoTable?.finalY || 180;
  const signatureY = finalY + 10;

  // If near bottom of page, add new page
  if (signatureY + 45 > doc.internal.pageSize.getHeight()) {
    doc.addPage();
  }

  const currentY = signatureY + 45 > doc.internal.pageSize.getHeight() ? 20 : signatureY;

  // Total summary badge
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Total Kehadiran: ${attendees.length} Orang Peserta`, 14, currentY + 4);

  // Sign-off Official
  const signBlockX = pageWidth - 75;
  doc.setFont('helvetica', 'normal');
  doc.text(`Samarinda, ${options.eventDate}`, signBlockX, currentY);
  doc.setFont('helvetica', 'bold');
  doc.text(options.picTitle, signBlockX, currentY + 5);

  // Blank space for manual sign/stamp
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(options.picName, signBlockX, currentY + 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`NIP. ${options.picNip}`, signBlockX, currentY + 32);

  // Save PDF
  const cleanFileName = `Daftar_Hadir_${event.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${event.date}.pdf`;
  doc.save(cleanFileName);
}
