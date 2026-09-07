import { ThemeFamily } from './themes';

// Keyword lists derived from each palette's THEME_DESCRIPTIONS tagline plus ~60 common
// breed names, each assigned to its most iconic/common coat-color palette. Kept
// non-overlapping as bare words (e.g. only quiet_tide claims "merle"/"blue merle" rather
// than a bare "blue", so it doesn't collide with cool_ash's "grey"/"silver") — a longer,
// more specific phrase in one family CAN legitimately override a shorter generic word in
// another (e.g. "giant schnauzer" -> midnight overrides bare "schnauzer" -> cool_ash)
// because matching is done longest-keyword-first, see suggestThemeFamily() below.
// sage_clay has no keywords: it's the neutral default, not breed-specific.
//
// A few breeds span many coat colors (Poodle, Chihuahua, Pug, French Bulldog) and are
// still mapped here to their most iconic/common variant per product decision — it's a
// suggestion the user can freely override by tapping a different swatch, not a binding
// classification. Border Collie is deliberately left unmapped: it's genuinely ~50/50
// black-and-white with no fair "most common" default (only an explicit "merle" mention
// resolves to quiet_tide).
const KEYWORDS: Partial<Record<ThemeFamily, string[]>> = {
  warm_honey: [
    'golden retriever', 'golden', 'labrador', 'lab', 'apricot', 'poodle', 'cockapoo',
    'cocker spaniel', 'cocker', 'pomeranian', 'chihuahua', 'vizsla', 'shiba inu', 'shiba',
    'akita', 'corgi', 'pembroke welsh corgi', 'beagle', 'basenji', 'rhodesian ridgeback',
    'nova scotia duck tolling retriever', 'toller', 'pug', 'cavalier king charles spaniel',
    'cavalier',
  ],
  cool_ash: [
    'weimaraner', 'blue heeler', 'australian cattle dog', 'schnauzer', 'russian blue',
    'italian greyhound', 'silver lab', 'yorkshire terrier', 'yorkie', 'grey', 'gray', 'silver',
  ],
  deep_cocoa: [
    'chocolate', 'brown', 'cocoa', 'rottweiler', 'dachshund', 'doberman', 'dobermann',
    'chesapeake bay retriever', 'chessie', 'bloodhound', 'brittany',
    'german shorthaired pointer', 'irish setter', 'setter', 'german shepherd', 'gsd',
  ],
  cream_chalk: [
    'white', 'cream', 'westie', 'west highland', 'maltese', 'bichon frise', 'bichon',
    'samoyed', 'great pyrenees', 'pyrenees', 'american eskimo', 'havanese',
    'coton de tulear', 'dalmatian', 'shih tzu',
  ],
  midnight: [
    'black', 'newfoundland', 'scottish terrier', 'scottie', 'flat-coated retriever',
    'flat coat', 'black lab', 'black labrador', 'giant schnauzer', 'portuguese water dog',
    'schipperke', 'affenpinscher', 'boston terrier',
  ],
  dusty_bloom: [
    'mixed', 'mix', 'tabby', 'brindle', 'mutt', 'french bulldog', 'frenchie', 'boxer',
    'calico', 'tortoiseshell',
  ],
  quiet_tide: [
    'husky', 'siberian husky', 'malamute', 'alaskan malamute', 'merle', 'blue merle',
    'australian shepherd', 'aussie', 'catahoula',
  ],
};

// Flattened and sorted longest-keyword-first so a more specific phrase (e.g. "chocolate")
// is always checked before a shorter generic one (e.g. "lab") regardless of which family's
// list it lives in — this is what makes "Chocolate Lab" resolve to deep_cocoa, not
// warm_honey, and "Giant Schnauzer" resolve to midnight, not cool_ash's bare "schnauzer".
const ALL_KEYWORDS: { keyword: string; family: ThemeFamily }[] = Object.entries(KEYWORDS)
  .flatMap(([family, keywords]) =>
    (keywords ?? []).map(keyword => ({ keyword, family: family as ThemeFamily }))
  )
  .sort((a, b) => b.keyword.length - a.keyword.length);

export function suggestThemeFamily(breed: string): ThemeFamily | null {
  const trimmed = breed.trim().toLowerCase();
  if (!trimmed) return null;

  const match = ALL_KEYWORDS.find(({ keyword }) => trimmed.includes(keyword));
  return match?.family ?? null;
}
