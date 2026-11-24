/**
 * Three invented documents so anyone can try the app without uploading anything.
 * Every name, number and office below is fake. Deadlines are computed from today's date
 * so a sample never shows an expired deadline.
 */

export interface SampleDocument {
  id: string;
  title: string;
  description: string;
  build: (today: Date) => string;
}

const DAY_MS = 86_400_000;

function dateAfter(today: Date, days: number): string {
  return new Date(today.getTime() + days * DAY_MS).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export const SAMPLE_DOCUMENTS: readonly SampleDocument[] = [
  {
    id: 'tax-notice',
    title: 'Income tax notice',
    description: 'Extra tax to pay',
    build: (today) => `SAMPLE DOCUMENT (FAKE)
Income Tax Department - Intimation under section 143(1)
Date: ${dateAfter(today, -3)}

To: Ravi Kumar, PAN ABCDE1234F
Mobile: 98765 43210   Email: ravi.kumar@example.com
Assessment Year: 2025-26

Dear Taxpayer,
After processing your return we found a difference between the tax you paid and the tax calculated.
Tax payable as per our calculation: Rs. 48,500
Tax already paid by you: Rs. 36,000
Balance demand: Rs. 12,500 plus interest under section 234B.

If you agree, pay the amount through the e-Pay Tax service on the income tax portal on or before ${dateAfter(today, 28)}.
If you disagree, file a response online on the same portal by the same date, with your Form 26AS and proof of payment.
If no action is taken, interest will keep increasing every month and the demand may be recovered from your refunds.
Reference number: CPC/2526/A1/554433`,
  },
  {
    id: 'bank-letter',
    title: 'Bank loan reminder',
    description: 'Missed loan payment',
    build: (today) => `SAMPLE DOCUMENT (FAKE)
Sunrise Co-operative Bank - Loan Recovery Department
Date: ${dateAfter(today, -2)}

Dear Mrs. Lakshmi Devi,
Loan account number: 123456789012345   IFSC: SUNR0000123
Your registered mobile: +91 98450 12345

Your monthly instalment (EMI) of Rs. 8,450 for the last two months is unpaid. Total overdue: Rs. 16,900, plus a late fee of Rs. 600.

Please pay the overdue amount at any branch or by UPI on or before ${dateAfter(today, 12)}.
If we do not receive payment by that date, the bank will report the delay to the credit bureau, which may lower your credit score, and may start recovery action under the loan agreement.
If you are facing difficulty, you may meet the branch manager to ask about a revised payment plan.
Helpline: 1800 123 4567`,
  },
  {
    id: 'scheme-notice',
    title: 'Scheme verification',
    description: 'Benefit may stop',
    build: (today) => `SAMPLE DOCUMENT (FAKE)
Office of the Block Development Officer, Greenfield Block
Subject: e-KYC verification for Kisan Samman benefit
Date: ${dateAfter(today, -5)}

Beneficiary: Sunita Patil
Aadhaar number: 2345 6789 0123
Application ID: KS-2024-556677

Our records show that your e-KYC is pending. Without e-KYC the next instalment of Rs. 2,000 cannot be released.

Please complete e-KYC at the nearest Common Service Centre or on the scheme mobile app on or before ${dateAfter(today, 20)}.
Carry your Aadhaar card and the mobile phone linked to your Aadhaar for the one-time password (OTP).
If e-KYC is not completed by the last date, your benefit will be put on hold until it is done.
For help, contact the Block Office, Monday to Friday, 10 am to 5 pm.`,
  },
];
