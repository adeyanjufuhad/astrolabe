// Documentation structure, shared by the sidebar and the previous/next links.
export const DOCS = [
  {
    group: "Getting started",
    pages: [
      { href: "/docs", title: "Introduction" },
      { href: "/docs/install", title: "Installation" },
      { href: "/docs/quick-start", title: "Quick start" },
    ],
  },
  {
    group: "Using Astrolabe",
    pages: [
      { href: "/docs/tokens", title: "Design tokens" },
      { href: "/docs/matching", title: "How matching works" },
      { href: "/docs/reports", title: "Reports" },
      { href: "/docs/cli", title: "CLI reference" },
    ],
  },
  {
    group: "Automation",
    pages: [
      { href: "/docs/pull-requests", title: "Pull requests and baselines" },
      { href: "/docs/github-action", title: "GitHub Action" },
      { href: "/docs/ci", title: "Other CI systems" },
    ],
  },
  {
    group: "More",
    pages: [
      { href: "/docs/history-server", title: "History server" },
      { href: "/docs/troubleshooting", title: "Troubleshooting and FAQ" },
      { href: "/docs/license", title: "License" },
    ],
  },
];

export const DOC_PAGES = DOCS.flatMap((g) => g.pages);

// The current release. Bump these together when a new version ships.
export const VERSION = "0.2.0";
export const TAG = `v${VERSION}`;
const DOWNLOADS = `https://github.com/adeyanjufuhad/astrolabe/releases/download/${TAG}`;
export const ASSETS = [
  { os: "macOS", arch: "Apple silicon (arm64)", file: `astrolabe_${VERSION}_darwin_arm64.tar.gz` },
  { os: "macOS", arch: "Intel (amd64)", file: `astrolabe_${VERSION}_darwin_amd64.tar.gz` },
  { os: "Linux", arch: "x86-64 (amd64)", file: `astrolabe_${VERSION}_linux_amd64.tar.gz` },
  { os: "Linux", arch: "ARM64", file: `astrolabe_${VERSION}_linux_arm64.tar.gz` },
  { os: "Windows", arch: "x86-64 (amd64)", file: `astrolabe_${VERSION}_windows_amd64.zip` },
  { os: "Windows", arch: "ARM64", file: `astrolabe_${VERSION}_windows_arm64.zip` },
].map((a) => ({ ...a, url: `${DOWNLOADS}/${a.file}` }));
export const CHECKSUMS_URL = `${DOWNLOADS}/checksums.txt`;
export const downloadUrl = (file) => `${DOWNLOADS}/${file}`;
