import PDFDocument from 'pdfkit';
import { Response } from 'express';

export interface ReceiptData {
  paymentRef: string;
  transactionRef: string;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  amount: number;
  gateway: string;
  gatewayRef: string;
  paidAt: Date;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: string;
}

/**
 * Streams a one-page PDF receipt directly to the HTTP response.
 * Kept intentionally simple (no external assets/fonts) so it renders
 * identically regardless of environment.
 */
export const streamReceiptPdf = (res: Response, data: ReceiptData): void => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="receipt-${data.transactionRef}.pdf"`
  );

  doc.pipe(res);

  // Header
  doc
    .fontSize(20)
    .fillColor('#4F46E5')
    .text('Masterview Digital Innovation Academy', { align: 'left' })
    .fontSize(10)
    .fillColor('#64748B')
    .text('Payment Receipt', { align: 'left' })
    .moveDown(1.5);

  doc
    .strokeColor('#E2E8F0')
    .lineWidth(1)
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke()
    .moveDown(1);

  const row = (label: string, value: string) => {
    doc
      .fontSize(10)
      .fillColor('#64748B')
      .text(label, 50, doc.y, { continued: true, width: 200 })
      .fillColor('#0F172A')
      .text(value, { align: 'right' });
    doc.moveDown(0.6);
  };

  row('Receipt / Transaction Ref:', data.transactionRef);
  row('Payment Reference:', data.paymentRef);
  row('Date:', data.paidAt.toLocaleString('en-GB'));
  row('Student:', data.studentName);
  row('Email:', data.studentEmail);
  row('Course / Item:', data.courseTitle);
  row('Payment Method:', data.gateway.charAt(0).toUpperCase() + data.gateway.slice(1));
  row('Gateway Reference:', data.gatewayRef);

  doc.moveDown(0.5);
  doc
    .strokeColor('#E2E8F0')
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke()
    .moveDown(1);

  doc
    .fontSize(14)
    .fillColor('#0F172A')
    .text(`Amount Paid (this transaction): NGN ${data.amount.toLocaleString()}`, { align: 'left' })
    .moveDown(0.5)
    .fontSize(10)
    .fillColor('#64748B')
    .text(`Total course price: NGN ${data.totalAmount.toLocaleString()}`)
    .text(`Total paid to date: NGN ${data.amountPaid.toLocaleString()}`)
    .text(`Outstanding balance: NGN ${data.balance.toLocaleString()}`)
    .text(`Payment status: ${data.status.toUpperCase()}`)
    .moveDown(2);

  doc
    .fontSize(9)
    .fillColor('#94A3B8')
    .text(
      'This is a system-generated receipt and does not require a signature. ' +
        'For questions about this payment, contact the academy finance office.',
      { align: 'left' }
    );

  doc.end();
};
