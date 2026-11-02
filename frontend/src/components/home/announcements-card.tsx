import Link from 'next/link';
import { ANNOUNCEMENTS } from '@/content/announcements';

/** "News" card beside the hero: latest real platform announcements. */
export function AnnouncementsCard() {
  return (
    <section aria-label="Announcements" className="rounded-2xl border border-rule bg-vault/80 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold">Announcements</h2>
        <Link href="/announcements" className="text-[12px] text-mist hover:text-foreground">View all →</Link>
      </div>
      <ul className="mt-3 space-y-3">
        {ANNOUNCEMENTS.slice(0, 4).map((a) => (
          <li key={a.title}>
            <Link href="/announcements" className="block text-[13.5px] leading-snug text-foreground/90 hover:text-brass">{a.title}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
