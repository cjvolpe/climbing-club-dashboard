export default function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    trips: 'M5 5h14v15H5z M8 3v4 M16 3v4 M5 10h14',
    profile: 'M4 21v-3a8 8 0 0 1 16 0v3 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    storage: 'M4 6c0-4 16-4 16 0s-16 4-16 0v12c0 4 16 4 16 0V6 M4 12c0 4 16 4 16 0',
    plus: 'M12 4v16 M4 12h16',
    minus: 'M4 12h16',
    trash: 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
    pdf: 'M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6 M9 16h6',
    mountain: 'M2 20 9 6l4 7 3-5 6 12H2 M6 12l3 2 3-2',
    close: 'M5 5l14 14 M19 5 5 19',
    back: 'M15 5l-7 7 7 7',
    check: 'M5 12l4 4L19 6'
  }
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.trips} />
    </svg>
  )
}
