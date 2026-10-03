const paths = {
  subjects: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  calculator: 'M5 2h14v20H5z M8 6h8 M8 11h1 M15 11h1 M8 15h1 M15 15h1 M8 19h1 M15 19h1',
  history: 'M3 3v6h6 M3.6 9a9 9 0 1 1 .4 7 M12 7v5l3 2',
  help: 'M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5 M12 17h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  check: 'M5 12l4 4L19 6', close: 'M6 6l12 12 M18 6 6 18',
  plus: 'M12 5v14 M5 12h14', minus: 'M5 12h14',
  target: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M18 12a6 6 0 1 1-12 0 6 6 0 0 1 12 0 M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
  calendar: 'M4 5h16v16H4z M4 9h16 M8 3v4 M16 3v4 M8 13h3 M13 13h3 M8 17h3',
  download: 'M12 3v12 M7 10l5 5 5-5 M4 15v6h16v-6',
  upload: 'M12 16V4 M7 9l5-5 5 5 M4 15v6h16v-6',
  storage: 'M5 4h14l3 12H2z M2 16v5h20v-5 M8 16v2h8v-2',
  share: 'M8 10l8-5 M8 14l8 5 M8 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M22 4a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M22 20a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  link: 'M10 13a5 5 0 0 0 7 0l4-4a5 5 0 0 0-7-7l-2 2 M14 11a5 5 0 0 0-7 0l-4 4a5 5 0 0 0 7 7l2-2',
  arrow: 'M5 12h14 M13 6l6 6-6 6', undo: 'M4 5v6h6 M4 11c2-7 15-7 15 2 0 5-6 7-10 5',
};
export default function Icon({ name, size = 20 }: { name: keyof typeof paths; size?: number }) {
  return <svg class="ui-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name]} /></svg>;
}
