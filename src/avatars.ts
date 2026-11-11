// Default Professional Male & Female SVG Avatars (Data URLs)

const maleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bgMale" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <linearGradient id="suitMale" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#090d16" />
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="100" fill="url(#bgMale)" />
  <circle cx="100" cy="100" r="94" fill="none" stroke="#60a5fa" stroke-opacity="0.25" stroke-width="2" />
  <!-- Shoulders / Suit -->
  <path d="M35 195 C35 145, 65 130, 100 130 C135 130, 165 145, 165 195 Z" fill="url(#suitMale)" />
  <!-- White Shirt & Tie -->
  <polygon points="84,130 100,175 116,130" fill="#f8fafc" />
  <polygon points="96,136 104,136 106,168 100,178 94,168" fill="#f59e0b" />
  <!-- Suit Lapels -->
  <path d="M75 132 L100 175 L86 130 Z" fill="#334155" />
  <path d="M125 132 L100 175 L114 130 Z" fill="#334155" />
  <!-- Neck -->
  <rect x="88" y="108" width="24" height="26" rx="10" fill="#f1c27d" />
  <!-- Ears -->
  <circle cx="66" cy="84" r="8" fill="#e0ac69" />
  <circle cx="134" cy="84" r="8" fill="#e0ac69" />
  <!-- Head -->
  <rect x="68" y="48" width="64" height="72" rx="30" fill="#f1c27d" />
  <!-- Neat Short Male Hair -->
  <path d="M66 76 C64 46, 80 36, 100 36 C120 36, 136 46, 134 76 C132 60, 122 52, 100 52 C78 52, 68 60, 66 76 Z" fill="#1e293b" />
  <!-- Eyebrows -->
  <path d="M78 74 Q85 71 92 74" stroke="#1e293b" stroke-width="3" stroke-linecap="round" fill="none" />
  <path d="M108 74 Q115 71 122 74" stroke="#1e293b" stroke-width="3" stroke-linecap="round" fill="none" />
  <!-- Eyes -->
  <circle cx="85" cy="82" r="3.5" fill="#0f172a" />
  <circle cx="115" cy="82" r="3.5" fill="#0f172a" />
  <!-- Confident Smile -->
  <path d="M90 101 Q100 108 110 101" stroke="#9a3412" stroke-width="3" stroke-linecap="round" fill="none" />
</svg>`;

const femaleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bgFemale" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a" />
      <stop offset="100%" stop-color="#312e81" />
    </linearGradient>
    <linearGradient id="blazerFemale" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="100" fill="url(#bgFemale)" />
  <circle cx="100" cy="100" r="94" fill="none" stroke="#f59e0b" stroke-opacity="0.3" stroke-width="2" />
  <!-- Back Hair -->
  <path d="M56 78 C52 115, 58 140, 68 148 L132 148 C142 140, 148 115, 144 78 Z" fill="#1c1917" />
  <!-- Shoulders / Blazer -->
  <path d="M38 195 C38 146, 66 132, 100 132 C134 132, 162 146, 162 195 Z" fill="url(#blazerFemale)" />
  <!-- Inner Blouse & Gold Necklace Accent -->
  <polygon points="82,132 100,176 118,132" fill="#fef3c7" />
  <path d="M88 138 Q100 148 112 138" stroke="#f59e0b" stroke-width="2.5" fill="none" />
  <!-- Blazer Lapels -->
  <path d="M74 134 L100 176 L83 132 Z" fill="#334155" />
  <path d="M126 134 L100 176 L117 132 Z" fill="#334155" />
  <!-- Neck -->
  <rect x="90" y="110" width="20" height="25" rx="9" fill="#f5cfa0" />
  <!-- Head -->
  <rect x="70" y="50" width="60" height="68" rx="29" fill="#f5cfa0" />
  <!-- Styled Female Hair Sweep -->
  <path d="M64 82 C62 46, 80 36, 102 36 C124 36, 138 48, 136 82 C132 62, 118 56, 94 58 C78 60, 68 68, 64 82 Z" fill="#1c1917" />
  <!-- Eyebrows -->
  <path d="M79 74 Q85 70 91 73" stroke="#1c1917" stroke-width="2.5" stroke-linecap="round" fill="none" />
  <path d="M109 73 Q115 70 121 74" stroke="#1c1917" stroke-width="2.5" stroke-linecap="round" fill="none" />
  <!-- Eyes & Lashes -->
  <circle cx="85" cy="82" r="3.5" fill="#0f172a" />
  <circle cx="115" cy="82" r="3.5" fill="#0f172a" />
  <!-- Warm Smile -->
  <path d="M91 101 Q100 107 109 101" stroke="#be123c" stroke-width="3" stroke-linecap="round" fill="none" />
</svg>`;

export const MALE_AVATAR_URL = `data:image/svg+xml;utf8,${encodeURIComponent(maleSvg)}`;
export const FEMALE_AVATAR_URL = `data:image/svg+xml;utf8,${encodeURIComponent(femaleSvg)}`;

export function inferGenderFromName(fullName?: string): 'male' | 'female' {
  if (!fullName) return 'male';
  const lower = fullName.toLowerCase();
  const femaleKeywords = [
    'dewi', 'lestari', 'siti', 'ratna', 'maya', 'indah', 'putri', 'ayu',
    'ibu', 'ny.', 'fitri', 'ani', 'sri', 'rina', 'dina', 'nina', 'lia',
    'wulan', 'dian', 'nur', 'kartika', 'intan', 'amelia', 'nadia', 'sarah',
    'annisa', 'nabila', 'tiara', 'citra', 'bunga', 'melati', 'anggun'
  ];
  for (const kw of femaleKeywords) {
    if (lower.includes(kw)) return 'female';
  }
  return 'male';
}

export function getDefaultAvatar(gender?: 'male' | 'female', fullName?: string): string {
  const resolvedGender = gender || inferGenderFromName(fullName);
  return resolvedGender === 'female' ? FEMALE_AVATAR_URL : MALE_AVATAR_URL;
}

export function resolveAvatarUrl(avatarUrl?: string, gender?: 'male' | 'female', fullName?: string): string {
  if (!avatarUrl || avatarUrl.includes('images.unsplash.com')) {
    return getDefaultAvatar(gender, fullName);
  }
  return avatarUrl;
}
