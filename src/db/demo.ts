import { addDaysISO, addMonthsISO, addYearsISO, startOfMonthISO, type ISODate } from '../logic/dates';
import { withDeadlines } from '../logic/deadlines';
import { clearAll, db as defaultDb, newId, type VeyaDB } from './schema';
import type { Bill, Category, Expense, PlanEvent, Purchase, Subscription, SubscriptionPayment } from './types';

export const DEMO_RECEIPT_TEXT = `ELGIGANTEN
Frederiksberg Centeret
Falkoner Allé 21, 2000 Frederiksberg
CVR 27 97 58 74
{DATE} 14:32
Kassebon 3493829
AirPods Pro (2nd gen)
1 x 1.899,00
TOTAL 1.899,00
Heraf moms 379,80
Betalt med Visa **** 4251
Tak for dit køb!
30 dages åbent køb`;

/** AirPods bought 28 days ago with 30 days' return → the deadline is in 2 days. */
export const DEMO_AIRPODS_DAYS_AGO = 28;

interface SeedOptions {
  database?: VeyaDB;
  receiptImage?: { blob: Blob; thumb: Blob };
  name?: string;
}

/**
 * Fills the app with realistic example data relative to `today`, so the demo
 * always looks current: a return deadline in 2 days, Netflix renewing tomorrow
 * with an announced price increase, a warranty about to expire, and 6 months
 * of spending history for the charts.
 */
export async function seedDemoData(today: ISODate, { database = defaultDb, receiptImage, name }: SeedOptions = {}) {
  const now = new Date().toISOString();
  const T = (days: number) => addDaysISO(today, days);

  const purchase = (p: Omit<Purchase, 'id' | 'createdAt' | 'returnDeadline' | 'complaintUntil' | 'complaintYears' | 'status'> &
    Partial<Pick<Purchase, 'status' | 'complaintYears'>>): Purchase =>
    withDeadlines({ id: newId(), createdAt: now, status: 'active', complaintYears: 2, ...p });

  const airpodsDate = T(-DEMO_AIRPODS_DAYS_AGO);
  const receiptImageId = receiptImage ? newId() : undefined;

  const purchases: Purchase[] = [
    purchase({
      product: 'AirPods Pro 2',
      store: 'Elgiganten',
      storeLocation: 'Frederiksberg Centeret',
      price: 1899,
      date: airpodsDate,
      category: 'elektronik',
      boughtOnline: false,
      returnDays: 30, // 30 dages åbent køb → deadline in 2 days
      receiptImageId,
      receiptNumber: '3493829',
      paymentMethod: 'Visa •••• 4251',
      receiptText: DEMO_RECEIPT_TEXT.replace('{DATE}', airpodsDate.split('-').reverse().join('-')),
    }),
    purchase({
      product: 'New Balance 530',
      store: 'Zalando',
      price: 899,
      date: T(-9),
      category: 'toej',
      boughtOnline: true,
      returnDays: 100,
      paymentMethod: 'MobilePay',
    }),
    purchase({
      product: 'Niacinamide serum',
      store: 'Matas',
      price: 119,
      date: T(-12),
      category: 'skoenhed',
      boughtOnline: false,
      returnDays: 30,
    }),
    purchase({
      product: 'Dagligvarer',
      store: 'Føtex',
      price: 463,
      date: T(-14),
      category: 'mad',
      boughtOnline: false,
      returnDays: null,
    }),
    purchase({
      product: 'Nintendo Switch OLED',
      store: 'Power',
      price: 2499,
      // Bought just under 2 years ago, so reklamationsretten ends in 20 days.
      date: addDaysISO(addYearsISO(today, -2), 20),
      category: 'elektronik',
      boughtOnline: false,
      returnDays: 30,
      status: 'kept',
      paymentMethod: 'Visa •••• 4251',
    }),
  ];

  // Earlier months: a few purchases so lists and charts have history.
  const history: [number, string, string, number, Category, number | null, boolean][] = [
    [-1, 'Vinterjakke', 'H&M', 599, 'toej', 30, false],
    [-1, 'Indkøb', 'Netto', 1240, 'mad', null, false],
    [-2, 'Bordlampe', 'IKEA', 249, 'bolig', 365, false],
    [-2, 'Indkøb', 'Rema 1000', 1385, 'mad', null, false],
    [-3, 'Løbesko', 'Sport 24', 799, 'fritid', 30, false],
    [-3, 'Indkøb', 'Netto', 1120, 'mad', null, false],
    [-4, 'Powerbank', 'Proshop', 299, 'elektronik', 14, true],
    [-4, 'Indkøb', 'Føtex', 1460, 'mad', null, false],
    [-5, 'Festkjole', 'Zalando', 449, 'toej', 100, true],
    [-5, 'Indkøb', 'Lidl', 1210, 'mad', null, false],
  ];
  history.forEach(([monthsBack, product, store, price, category, returnDays, online], i) => {
    const date = addDaysISO(startOfMonthISO(addMonthsISO(today, monthsBack)), 4 + i);
    purchases.push(purchase({ product, store, price, date, category, boughtOnline: online, returnDays, status: 'kept' }));
  });

  const expenses: Expense[] = [{ id: newId(), label: 'Joe & The Juice', amount: 78, date: today, category: 'mad' }];
  const cafe = [212, 186, 240, 165, 198, 230];
  for (let m = 0; m <= 5; m++) {
    const monthStart = startOfMonthISO(addMonthsISO(today, -m));
    const transportDate = addDaysISO(monthStart, 2);
    if (transportDate <= today) {
      expenses.push({ id: newId(), label: 'Rejsekort', amount: 300, date: transportDate, category: 'transport' });
    }
    const cafeDate = addDaysISO(monthStart, 10);
    if (m > 0 || cafeDate < today) {
      expenses.push({ id: newId(), label: 'Café og frokost', amount: cafe[m], date: cafeDate, category: 'mad' });
    }
  }

  const sub = (s: Omit<Subscription, 'id' | 'createdAt' | 'active' | 'priceHistory'> & { since: ISODate }): Subscription => {
    const { since, ...rest } = s;
    return {
      id: newId(),
      createdAt: now,
      active: true,
      priceHistory: [{ price: s.price, from: since }],
      lastUsedCheck: T(-10),
      ...rest,
    };
  };

  const netflixNext = T(1);
  const subscriptions: Subscription[] = [
    {
      ...sub({ name: 'Netflix', plan: 'Standard', price: 149, cycle: 'monthly', nextPayment: netflixNext, category: 'fritid', since: T(-400) }),
      upcomingPrice: { price: 159, from: addMonthsISO(netflixNext, 1) },
    },
    sub({ name: 'Spotify', plan: 'Premium Student', price: 69, cycle: 'monthly', nextPayment: T(3), category: 'fritid', since: T(-700) }),
    sub({ name: 'Telmore', plan: 'Mobilabonnement', price: 129, cycle: 'monthly', nextPayment: T(6), category: 'andet', since: T(-500) }),
    sub({ name: 'Fitness World', plan: 'Basis', price: 149, cycle: 'monthly', nextPayment: T(9), category: 'fritid', since: T(-300) }),
    sub({ name: 'iCloud+', plan: '50 GB', price: 29, cycle: 'monthly', nextPayment: T(12), category: 'elektronik', since: T(-600) }),
    {
      ...sub({ name: 'Viaplay', plan: 'Film & Serier (årligt)', price: 864, cycle: 'yearly', nextPayment: T(120), category: 'fritid', since: T(-245) }),
      lastUsedCheck: T(-75), // triggers "Bruger du stadig Viaplay?"
    },
  ];

  // Payment history for the monthly subscriptions (last 6 months).
  const subPayments: SubscriptionPayment[] = [];
  for (const s of subscriptions) {
    if (s.cycle !== 'monthly') continue;
    for (let k = 1; k <= 6; k++) {
      const date = addMonthsISO(s.nextPayment, -k);
      if (date >= today) continue;
      subPayments.push({ id: newId(), subscriptionId: s.id, name: s.name, amount: s.price, date, category: s.category });
    }
  }
  const viaplay = subscriptions[5];
  subPayments.push({
    id: newId(),
    subscriptionId: viaplay.id,
    name: viaplay.name,
    amount: viaplay.price,
    date: addYearsISO(viaplay.nextPayment, -1),
    category: viaplay.category,
  });

  const bills: Bill[] = [];
  const rentDue = startOfMonthISO(today);
  for (let m = 0; m <= 5; m++) {
    const due = addMonthsISO(rentDue, -m);
    bills.push({ id: newId(), name: 'Husleje', amount: 4200, dueDate: due, recurring: 'monthly', category: 'bolig', paid: true, paidAt: due });
  }
  bills.push({ id: newId(), name: 'Husleje', amount: 4200, dueDate: addMonthsISO(rentDue, 1), recurring: 'monthly', category: 'bolig', paid: false });
  bills.push({ id: newId(), name: 'El (kvartal)', amount: 645, dueDate: T(3), recurring: 'quarterly', category: 'bolig', paid: false });

  const events: PlanEvent[] = [
    { id: newId(), title: 'Studiegruppe', date: T(2), time: '15.00', place: 'CBS Bibliotek' },
    { id: newId(), title: 'Tandlæge', date: T(12), time: '10.30', place: 'Tandlægerne på Nørrebro' },
  ];

  await clearAll(database);
  await database.transaction(
    'rw',
    [database.profile, database.purchases, database.receiptImages, database.subscriptions, database.subPayments, database.bills, database.expenses, database.events],
    async () => {
      await database.profile.put({
        id: 'me',
        name: name || 'Sofie',
        monthlyBudget: 9600,
        noticeDaysBefore: 3,
        defaultReturnDays: 30,
        createdAt: now,
      });
      await database.purchases.bulkPut(purchases);
      if (receiptImage && receiptImageId) {
        await database.receiptImages.put({ id: receiptImageId, ...receiptImage });
      }
      await database.subscriptions.bulkPut(subscriptions);
      await database.subPayments.bulkPut(subPayments);
      await database.bills.bulkPut(bills);
      await database.expenses.bulkPut(expenses);
      await database.events.bulkPut(events);
    },
  );
}
