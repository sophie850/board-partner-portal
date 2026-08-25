/* The official BOARD wordmark and "B" icon mark, as inline vector so
   they recolour with `currentColor`. Path data lifted verbatim from
   the design system's component bundle — do not redraw these. */

const WORDMARK_PATHS = [
  'M471.78,4.57l-78,208.5h35.1l20.1-55.5h89.4l20.4,55.5h35.1L515.58,4.57h-43.8ZM459.18,129.97l34.2-93.9,34.8,93.9h-69Z',
  'M729.47,131.47l-3.3-6c34.2-4.2,54-26.4,54-59.1,0-38.7-27.6-61.8-71.4-61.8h-88.8v208.5h33.3v-85.2h36.9l9.6,18.6c26.7,53.7,48.9,67.5,83.1,67.5,3.6,0,6.6-.6,9.3-1.2v-30.9c-1.8.6-3.9.9-6.6.9-18,0-33.9-9.9-56.1-51.3ZM653.27,98.77V33.67h53.4c26.1,0,38.7,11.7,38.7,32.7s-12.3,32.4-38.4,32.4h-53.7Z',
  'M900.47,4.57h-78v208.5h78c55.5,0,107.1-36,107.1-104.1S955.97,4.57,900.47,4.57ZM895.67,183.07h-39.9V34.57h39.9c39.9,0,76.8,19.8,76.8,74.1s-36.9,74.4-76.8,74.4Z',
  'M117.6,103.27c19.8-4.8,34.5-21.9,34.5-44.7,0-35.1-24.3-54-70.5-54H0v208.5h33.28l.02-93.6h50.7c28.5,0,43.8,12.3,43.8,33.6s-15.6,33.3-42.9,33.3h-21.26v26.7h26.06c46.5,0,72.6-20.7,72.6-59.1,0-27.3-16.5-44.1-44.7-50.7ZM79.8,92.47h-46.5V31.27h46.5c24.9,0,38.4,10.2,38.4,29.7s-13.2,31.5-38.4,31.5Z',
  'M288.41,0c-60.01,0-108.65,48.64-108.65,108.65s48.64,108.65,108.65,108.65,108.65-48.64,108.65-108.65S348.41,0,288.41,0ZM288.41,185.03c-41.77,0-75.62-34.2-75.62-76.38s33.86-76.38,75.62-76.38,75.62,34.2,75.62,76.38-33.86,76.38-75.62,76.38Z',
];

const ICON_PATH =
  'M117.6,98.7c19.8-4.8,34.5-21.9,34.5-44.7C152.1,18.9,127.8,0,81.6,0H0v208.5h33.28l.02-93.6h50.7c28.5,0,43.8,12.3,43.8,33.6s-15.6,33.3-42.9,33.3h-21.26v26.7h26.06c46.5,0,72.6-20.7,72.6-59.1,0-27.3-16.5-44.1-44.7-50.7ZM79.8,87.9h-46.5V26.7h46.5c24.9,0,38.4,10.2,38.4,29.7s-13.2,31.5-38.4,31.5Z';

const SIZES = { sm: 20, md: 32, lg: 56, xl: 96, hero: 160 } as const;

export function Wordmark({
  size = 'md',
  variant = 'wordmark',
  className,
}: {
  size?: keyof typeof SIZES | number;
  variant?: 'wordmark' | 'icon';
  className?: string;
}) {
  const px = typeof size === 'number' ? size : SIZES[size];
  const isIcon = variant === 'icon';

  return (
    <svg
      height={px}
      viewBox={isIcon ? '0 0 162.3 208.5' : '0 0 1007.57 217.3'}
      role="img"
      aria-label="BOARD"
      className={className}
      style={{ display: 'block', width: 'auto' }}
    >
      {isIcon ? (
        <path d={ICON_PATH} fill="currentColor" />
      ) : (
        WORDMARK_PATHS.map((d, i) => <path key={i} d={d} fill="currentColor" />)
      )}
    </svg>
  );
}
