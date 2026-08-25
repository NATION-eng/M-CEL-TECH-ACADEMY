import Payment from '../models/Payment.model';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/**
 * Real month-by-month revenue from actual successful transactions, for the
 * last `months` months (default 6), including months with zero revenue so
 * chart x-axes never have gaps. Used anywhere a revenue trend chart is
 * shown — previously two separate admin pages each hardcoded a fake static
 * array here instead of querying real data.
 */
export const getMonthlyRevenue = async (months = 6): Promise<{ month: string; revenue: number }[]> => {
  const start = new Date();
  start.setMonth(start.getMonth() - (months - 1));
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const raw = await Payment.aggregate([
    { $unwind: '$transactions' },
    { $match: { 'transactions.status': 'success', 'transactions.paidAt': { $gte: start } } },
    {
      $group: {
        _id: { year: { $year: '$transactions.paidAt' }, month: { $month: '$transactions.paidAt' } },
        revenue: { $sum: '$transactions.amount' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const byKey = new Map<string, number>(raw.map((m) => [`${m._id.year}-${m._id.month}`, m.revenue] as const));
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    return { month: MONTH_NAMES[d.getMonth()], revenue: byKey.get(key) ?? 0 };
  });
};
