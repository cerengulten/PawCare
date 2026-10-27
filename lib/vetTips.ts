export type VetTip = {
  id: string;
  category: 'nutrition' | 'hydration' | 'dental' | 'digestion' | 'wellness';
  badge: string;
  emoji: string;
  title: string;
  body: string;
  actionPrompt: string;
};

export const VET_TIPS: VetTip[] = [
  {
    id: 'tip-hydration-bone-broth',
    category: 'hydration',
    badge: 'Hydration Vitality',
    emoji: '💧',
    title: 'Warm Bone Broth Hydration',
    body: 'Adding a splash of warm low-sodium bone broth (onion & garlic free) to kibble encourages reluctant drinkers and delivers natural collagen for kidney & joint health.',
    actionPrompt: 'How much bone broth is safe to add to my pet’s daily food?',
  },
  {
    id: 'tip-gradual-transition',
    category: 'nutrition',
    badge: 'Digestive Balance',
    emoji: '🥣',
    title: 'The 7-Day Food Transition Rule',
    body: 'Switching diets too fast disrupts gut microbiome. Aim for 25% new food on Days 1-2, 50% on Days 3-4, 75% on Days 5-6, and 100% on Day 7 to prevent vomiting or loose stools.',
    actionPrompt: 'What should I do if my pet gets loose stools while switching kibble?',
  },
  {
    id: 'tip-dental-enzymatic',
    category: 'dental',
    badge: 'Dental Hygiene',
    emoji: '🦷',
    title: 'Daily Mechanical & Enzymatic Cleaning',
    body: 'Periodontal bacteria can enter the bloodstream and strain heart valves. Just 2 minutes of daily dental chew action or poultry-flavored enzymatic paste lowers tartar by up to 40%.',
    actionPrompt: 'What are the most effective ways to brush my pet’s teeth without stress?',
  },
  {
    id: 'tip-omega-mobility',
    category: 'wellness',
    badge: 'Joint & Coat',
    emoji: '🐟',
    title: 'Omega-3 EPA & DHA Anti-Inflammation',
    body: 'Marine omega-3 fatty acids soothe itchy skin, reduce allergic flaring, and protect synovial joint fluid. Look for wild Alaskan salmon or anchovy oils with certified purity.',
    actionPrompt: 'What dosage of Omega-3 EPA/DHA is recommended for my dog’s weight?',
  },
  {
    id: 'tip-pumpkin-fiber',
    category: 'digestion',
    badge: 'GI Soother',
    emoji: '🎃',
    title: 'Pure Pumpkin Soluble Fiber',
    body: '1 to 2 tablespoons of 100% pure canned pumpkin (not pie mix) acts as a natural prebiotic. Its soluble fiber absorbs excess moisture during diarrhea and softens stool during constipation.',
    actionPrompt: 'Can pumpkin puree help soothe my pet’s sensitive stomach?',
  },
  {
    id: 'tip-skin-turgor',
    category: 'hydration',
    badge: 'Quick Health Check',
    emoji: '🩺',
    title: 'The 1-Second Skin Turgor Test',
    body: 'Gently pinch the loose skin at the scruff between your pet’s shoulder blades. In a well-hydrated animal, it snaps back immediately. If it tent or lowers slowly, offer fresh water.',
    actionPrompt: 'How can I tell if my pet is mildly dehydrated at home?',
  },
  {
    id: 'tip-slow-feeder',
    category: 'nutrition',
    badge: 'Feeding Habit',
    emoji: '🧩',
    title: 'Slow Feeders & Bloat Prevention',
    body: 'Gulping food introduces excess air into the stomach, increasing the risk of painful bloating. Lick mats and maze bowls turn mealtime into a calming 10-minute mental exercise.',
    actionPrompt: 'Are slow feeder bowls and lick mats beneficial for active breeds?',
  },
  {
    id: 'tip-protein-rotation',
    category: 'nutrition',
    badge: 'Allergy Prevention',
    emoji: '🥩',
    title: 'Single-Protein Rotation Strategy',
    body: 'Feeding the identical protein for years can sensitize the immune system. Alternating high-quality novel sources (like duck, lamb, or venison) every 4–6 months maintains gut resilience.',
    actionPrompt: 'Should I rotate protein sources in my dog’s food to prevent allergies?',
  },
];

/**
 * Returns a daily tip based on the current day of the year,
 * allowing manual offsets when browsing tips.
 */
export function getDailyVetTip(offset: number = 0): VetTip {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  const index = Math.abs((dayOfYear + offset) % VET_TIPS.length);
  return VET_TIPS[index];
}
