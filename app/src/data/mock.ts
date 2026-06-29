// Mock airing data — shaped like the real DiscoveryEntity feed.
// `offsetMin` = minutes from page-load until air (so the demo countdown ticks
// realistically without a backend). Real data swaps this for absolute `airAt`.
export interface AiringEntry {
  slug: string;
  title: string;
  ep: number;
  time: string;          // local broadcast label
  offsetMin: number;     // demo: minutes-from-now until air
  providers: string[];
  cover: string;         // hotlinked from source CDN (AniList) in real build
}

export interface DayGroup {
  label: string;
  season: string | null;
  entries: AiringEntry[];
}

export const schedule: DayGroup[] = [
  {
    label: 'Today',
    season: 'Fall 2026',
    entries: [
      { slug: 'one-piece',     title: 'One Piece',            ep: 1078, time: '09:30', offsetMin: 38,  providers: ['Crunchyroll'],            cover: '' },
      { slug: 'frieren',       title: 'Frieren',              ep: 12,   time: '23:00', offsetMin: 134, providers: ['Crunchyroll', 'Netflix'], cover: '' },
      { slug: 'dandadan',      title: 'Dandadan',             ep: 9,    time: '24:00', offsetMin: 194, providers: ['Netflix'],                cover: '' },
      { slug: 'jjk',           title: 'Jujutsu Kaisen',       ep: 48,   time: '25:30', offsetMin: 284, providers: ['Crunchyroll'],            cover: '' },
    ],
  },
  {
    label: 'Tomorrow',
    season: null,
    entries: [
      { slug: 'spy-x-family',  title: 'Spy x Family',         ep: 38,   time: '17:00', offsetMin: 1380, providers: ['Crunchyroll'],           cover: '' },
      { slug: 'oshi-no-ko',    title: 'Oshi no Ko',           ep: 25,   time: '23:00', offsetMin: 1740, providers: ['HIDIVE'],                 cover: '' },
      { slug: 'blue-lock',     title: 'Blue Lock',            ep: 14,   time: '24:30', offsetMin: 1830, providers: ['Crunchyroll'],            cover: '' },
    ],
  },
];
