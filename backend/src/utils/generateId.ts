import { v4 as uuidv4 } from 'uuid';

export const generateStudentId = (): string => {
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `MV${year}${random}`;
};

export const generateInstructorId = (): string => {
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `MVI${year}${random}`;
};

export const generateCertificateNumber = (): string => {
  const year = new Date().getFullYear();
  const random = uuidv4().replace(/-/g, '').slice(0, 8).toUpperCase();
  return `MVAC-${year}-${random}`;
};

export const generatePaymentRef = (): string => {
  return `MV-PAY-${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
};

export const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};
