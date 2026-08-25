import PDFDocument from 'pdfkit';
import { Response } from 'express';

export interface CertificatePdfData {
  certificateNumber: string;
  studentName: string;
  courseTitle: string;
  badgeLevelTitle?: string;
  issuedAt: Date;
  verificationUrl: string;
  qrCodeDataUrl: string; // data:image/png;base64,... from the qrcode package
}

/**
 * Streams a landscape, certificate-styled PDF directly to the HTTP response.
 * Kept to built-in fonts/vector shapes (no external assets) so it renders
 * identically regardless of environment, same approach as receipt.ts.
 */
export const streamCertificatePdf = (res: Response, data: CertificatePdfData): void => {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="certificate-${data.certificateNumber}.pdf"`
  );

  doc.pipe(res);

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  // Background + decorative border
  doc.rect(0, 0, pageWidth, pageHeight).fill('#0B1220');
  doc
    .rect(24, 24, pageWidth - 48, pageHeight - 48)
    .lineWidth(2)
    .stroke('#F59E0B');
  doc
    .rect(32, 32, pageWidth - 64, pageHeight - 64)
    .lineWidth(0.75)
    .stroke('#334155');

  doc
    .fontSize(11)
    .fillColor('#94A3B8')
    .text('MASTERVIEW DIGITAL INNOVATION ACADEMY', 0, 70, { align: 'center', characterSpacing: 2 });

  doc
    .fontSize(30)
    .fillColor('#F1F5F9')
    .text('Certificate of Completion', 0, 100, { align: 'center' });

  doc
    .fontSize(11)
    .fillColor('#94A3B8')
    .text('This is to certify that', 0, 155, { align: 'center' });

  doc
    .fontSize(26)
    .fillColor('#F59E0B')
    .text(data.studentName, 0, 178, { align: 'center' });

  const courseLine = data.badgeLevelTitle
    ? `has successfully completed ${data.badgeLevelTitle} of ${data.courseTitle}`
    : `has successfully completed the ${data.courseTitle} programme`;

  doc
    .fontSize(13)
    .fillColor('#CBD5E1')
    .text(courseLine, 90, 225, { align: 'center', width: pageWidth - 180 });

  doc
    .fontSize(10)
    .fillColor('#64748B')
    .text(`Issued on ${data.issuedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, 0, 265, { align: 'center' });

  // QR code + verification details, bottom-left
  try {
    const base64 = data.qrCodeDataUrl.split(',')[1];
    if (base64) {
      doc.image(Buffer.from(base64, 'base64'), 60, pageHeight - 150, { width: 80 });
    }
  } catch {
    // If the QR image fails to decode for any reason, the certificate still
    // renders correctly without it — verification is still possible via the
    // printed URL/number below.
  }

  doc
    .fontSize(8)
    .fillColor('#64748B')
    .text('Scan to verify', 60, pageHeight - 62, { width: 80, align: 'center' });

  doc
    .fontSize(9)
    .fillColor('#94A3B8')
    .text(`Certificate No: ${data.certificateNumber}`, 160, pageHeight - 130)
    .text(`Verify at: ${data.verificationUrl}`, 160, pageHeight - 114);

  // Signature line, bottom-right
  doc
    .strokeColor('#475569')
    .moveTo(pageWidth - 260, pageHeight - 100)
    .lineTo(pageWidth - 60, pageHeight - 100)
    .stroke();
  doc
    .fontSize(9)
    .fillColor('#94A3B8')
    .text('Academic Director', pageWidth - 260, pageHeight - 92, { width: 200, align: 'center' });

  doc.end();
};
