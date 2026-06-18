// Ícones de linha para EmptyState - mesmo padrão dos ícones da ProfessorSidebar/Navbar
// (viewBox 24x24, stroke currentColor). 

function Svg({ children, ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {children}
    </svg>
  );
}

export const IconBook = (p) => (
  <Svg {...p}>
    <path d="M4 5.5C4 4.67 4.67 4 5.5 4H14a3 3 0 013 3v13a2.5 2.5 0 00-2.5-2.5H5.5A1.5 1.5 0 014 16V5.5z" />
    <path d="M17 4a3 3 0 013 3v13" />
    <path d="M7 8h7M7 11h7" />
  </Svg>
);

export const IconQuiz = (p) => (
  <Svg {...p}>
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 8h6M9 12h6M9 16h3" />
  </Svg>
);

export const IconUsers = (p) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" />
    <circle cx="17" cy="9" r="2.4" />
    <path d="M16 14.2c2.6.4 4 2 4 4.8" />
  </Svg>
);

export const IconLayers = (p) => (
  <Svg {...p}>
    <path d="M12 3l8 4.5-8 4.5-8-4.5L12 3z" />
    <path d="M4 12l8 4.5 8-4.5" />
    <path d="M4 16.5l8 4.5 8-4.5" />
  </Svg>
);

export const IconBolt = (p) => <Svg {...p}><path d="M13 2 4 14h7l-1 8 10-12h-7l0-8z" /></Svg>;

export const IconTrophy = (p) => (
  <Svg {...p}>
    <path d="M7 4h10v4a5 5 0 01-10 0V4z" />
    <path d="M7 5H4v1a4 4 0 004 4M17 5h3v1a4 4 0 01-4 4" />
    <path d="M12 13v3M9 20h6M10 17h4l.5 3h-5l.5-3z" />
  </Svg>
);

export const IconBag = (p) => (
  <Svg {...p}>
    <path d="M6 8h12l1 12a2 2 0 01-2 2H7a2 2 0 01-2-2L6 8z" />
    <path d="M9 8V6a3 3 0 016 0v2" />
  </Svg>
);

export const IconFileText = (p) => (
  <Svg {...p}>
    <path d="M7 3h7l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" />
    <path d="M14 3v4h4" />
    <path d="M9 13h6M9 16h6M9 10h2" />
  </Svg>
);

export const IconLock = (p) => (
  <Svg {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 018 0v3" />
  </Svg>
);

export const IconBarChart = (p) => <Svg {...p}><path d="M4 20V10M10 20V4M16 20v-7M21 20H3" /></Svg>;

export const IconInbox = (p) => (
  <Svg {...p}>
    <path d="M4 12h4l2 3h4l2-3h4" />
    <path d="M4 12 6 5h12l2 7" />
    <path d="M4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6" />
  </Svg>
);

export const EMPTY_STATE_ICONS = {
  inbox: IconInbox,
  quiz: IconQuiz,
  users: IconUsers,
  book: IconBook,
  layers: IconLayers,
  bolt: IconBolt,
  trophy: IconTrophy,
  bag: IconBag,
  file: IconFileText,
  lock: IconLock,
  chart: IconBarChart,
};