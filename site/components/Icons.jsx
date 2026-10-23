// SVG sprite used across the page. Rendered once in the layout.
export function Sprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <symbol id="logo" viewBox="236 232 268 250">
        <path
          fill="currentColor"
          d="M364 243C302 244 252 287 248 347C246 391 262 425 291 446L255 471L316 459C346 470 386 474 420 466C468 453 494 414 491 366C489 326 469 296 447 278L472 256C452 263 428 266 404 261L392 262C408 271 420 284 424 300L356 363C384 350 412 338 438 333C448 368 438 409 398 425C352 442 306 414 298 366C291 318 316 268 364 243Z"
        />
      </symbol>
      <symbol id="arrow" viewBox="0 0 24 24">
        <path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </symbol>
    </svg>
  );
}

export function Logo({ size, className }) {
  return (
    <svg width={size} height={size} className={className} aria-hidden="true">
      <use href="#logo" />
    </svg>
  );
}

export function Arrow({ size = 14 }) {
  return (
    <svg width={size} height={size} aria-hidden="true">
      <use href="#arrow" />
    </svg>
  );
}

// Stroke icons (24×24 grid).
const paths = {
  terminal: <path d="m5 8 5 4-5 4M13 17h6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.5-4.5" />
    </>
  ),
  branch: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M6 8.5v7M18 15.5V10a3 3 0 0 0-3-3h-4" />
    </>
  ),
  pair: (
    <>
      <circle cx="9" cy="12" r="5" />
      <circle cx="15" cy="12" r="5" />
    </>
  ),
  tokens: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M8 9h8M8 13h5" />
    </>
  ),
  file: <path d="M14 3v5h5M6 3h8l5 5v13H6z" />,
  check: <path d="M5 12l4 4L19 6" />,
  db: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v12c0 1.7 3 3 7 3s7-1.3 7-3V6" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
};

export function Icon({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
