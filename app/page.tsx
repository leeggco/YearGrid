import YearGrid from '@/components/YearGrid';
import { getSolarDateFromLunar, getSolarTerms } from 'chinese-days';

export const revalidate = 3600;

function getHolidaysForYear(year: number) {
  const holidays: Record<string, string> = {
    [`${year}-01-01`]: '元旦',
    [`${year}-10-01`]: '国庆'
  };

  const springFestival = getSolarDateFromLunar(`${year}-01-01`)?.date;
  if (springFestival) holidays[springFestival] = '春节';

  const dragonBoat = getSolarDateFromLunar(`${year}-05-05`)?.date;
  if (dragonBoat) holidays[dragonBoat] = '端午';

  const midAutumn = getSolarDateFromLunar(`${year}-08-15`)?.date;
  if (midAutumn) holidays[midAutumn] = '中秋';

  const qingming = getSolarTerms(`${year}-01-01`, `${year}-12-31`).find(
    (term) => term.name === '清明'
  )?.date;
  if (qingming) holidays[qingming] = '清明';

  return holidays;
}

function getHolidaysAroundYear(baseYear: number) {
  return {
    ...getHolidaysForYear(baseYear - 1),
    ...getHolidaysForYear(baseYear),
    ...getHolidaysForYear(baseYear + 1)
  };
}

export default function HomePage() {
  const initialNow = new Date();
  const initialNowISO = initialNow.toISOString();
  const holidays = getHolidaysAroundYear(initialNow.getFullYear());

  return (
    <main className="app-container py-8">
      <YearGrid holidays={holidays} initialNowISO={initialNowISO} />
    </main>
  );
}
