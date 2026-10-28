export type VetTip = {
  id: string;
  category: 'nutrition' | 'hydration' | 'dental' | 'digestion' | 'wellness';
  badge: string;
  emoji: string;
  title: string;
  body: string;
  actionPrompt: string;
};

type LocalizedTipContent = {
  badge: string;
  title: string;
  body: string;
  actionPrompt: string;
};

const TR_TIPS: Record<string, LocalizedTipContent> = {
  'tip-hydration-bone-broth': {
    badge: 'Hidrasyon Canlılığı',
    title: 'Ilık Kemik Suyu Hidrasyonu',
    body: 'Kuru mamaya az miktarda ılık, tuzsuz ve soğansız/sarımsaksız kemik suyu eklemek, su içmekte isteksiz evcil hayvanları teşvik eder ve böbrek ve eklem sağlığı için doğal kolajen sağlar.',
    actionPrompt: 'Evcil hayvanımın mamasına ne kadar kemik suyu eklemek güvenlidir?',
  },
  'tip-gradual-transition': {
    badge: 'Sindirim Dengesi',
    title: '7 Günlük Mama Geçiş Kuralı',
    body: 'Mamayı çok hızlı değiştirmek bağırsak mikrobiyotasını bozar. Kusma veya ishali önlemek için 1-2. günlerde %25, 3-4. günlerde %50, 5-6. günlerde %75 ve 7. günde %100 yeni mama verin.',
    actionPrompt: 'Mama değiştirirken köpeğimin dışkısı yumuşarsa ne yapmalıyım?',
  },
  'tip-dental-enzymatic': {
    badge: 'Ağız ve Diş Sağlığı',
    title: 'Günlük Mekanik ve Enzimatik Temizlik',
    body: 'Diş eti bakterileri kan dolaşımına karışarak kalp kapakçıklarını yorabilir. Günde sadece 2 dakikalık diş çiğneme ödülü veya enzimatik diş macunu tartarı %40\'a kadar azaltır.',
    actionPrompt: 'Köpeğimin dişlerini strese sokmadan temizlemenin en iyi yolları nelerdir?',
  },
  'tip-omega-mobility': {
    badge: 'Eklem & Tüy Sağlığı',
    title: 'Omega-3 EPA & DHA Anti-Enflamatuar',
    body: 'Deniz kaynaklı omega-3 yağ asitleri kaşıntılı cildi yatıştırır, alerjik reaksiyonları azaltır ve eklem sıvısını korur. Yabani Alaska somonu veya hamsi yağı tercih edin.',
    actionPrompt: 'Köpeğimin kilosuna göre ne kadar Omega-3 EPA/DHA vermeliyim?',
  },
  'tip-pumpkin-fiber': {
    badge: 'Mide-Bağırsak Yatıştırıcı',
    title: 'Saf Balkabağı Lif Desteği',
    body: '1-2 yemek kaşığı saf konserve veya haşlanmış balkabağı doğal bir prebiyotik görevi görür. Çözünür lifi ishal durumunda fazla nemi emer, kabızlıkta ise dışkıyı yumuşatır.',
    actionPrompt: 'Balkabağı püresi evcil hayvanımın hassas midesini rahatlatır mı?',
  },
  'tip-skin-turgor': {
    badge: 'Hızlı Sağlık Kontrolü',
    title: '1 Saniyelik Deri Elastikiyet Testi',
    body: 'Köpeğinizin kürek kemikleri arasındaki deriyi hafifçe kaldırıp bırakın. Yeterince su içmiş bir hayvanda deri hemen eski haline döner. Yavaş iniyorsa taze su verin.',
    actionPrompt: 'Evcil hayvanımın susuz kaldığını evde nasıl anlarım?',
  },
  'tip-slow-feeder': {
    badge: 'Beslenme Alışkanlığı',
    title: 'Labirent Mama Kapları & Şişkinlik',
    body: 'Mamayı çok hızlı yutmak mideye hava dolmasına ve gaz sancısına yol açabilir. Labirent kaplar ve yalama matları yemek vaktini 10 dakikalık sakinleştirici bir zihinsel egzersize dönüştürür.',
    actionPrompt: 'Labirent mama kapları ve yalama matları gerçekten faydalı mı?',
  },
  'tip-protein-rotation': {
    badge: 'Alerji Önleme',
    title: 'Tekil Protein Rotasyon Stratejisi',
    body: 'Yıllarca aynı proteini tüketmek bağışıklık sistemini duyarlılaştırabilir. Her 4-6 ayda bir kaliteli alternatif kaynaklara (ör. ördek, kuzu veya geyik) geçmek bağırsak direncini korur.',
    actionPrompt: 'Alerjileri önlemek için köpeğimin mamasındaki protein kaynağını değiştirmeli miyim?',
  },
};

const IT_TIPS: Record<string, LocalizedTipContent> = {
  'tip-hydration-bone-broth': {
    badge: 'Idratazione e Vitalità',
    title: 'Brodo d\'Ossa Tiepido per l\'Idratazione',
    body: 'Aggiungere un goccio di brodo d\'ossa tiepido e senza sale alle crocchette incoraggia a bere e fornisce collagene naturale per reni e articolazioni.',
    actionPrompt: 'Quanto brodo d\'ossa posso aggiungere al cibo quotidiano?',
  },
  'tip-gradual-transition': {
    badge: 'Equilibrio Digestivo',
    title: 'La Regola dei 7 Giorni per il Cambio Cibo',
    body: 'Cambiare dieta troppo in fretta altera la flora intestinale. Introduci il 25% di nuovo cibo nei giorni 1-2, 50% nei giorni 3-4, 75% nei giorni 5-6 e 100% al giorno 7.',
    actionPrompt: 'Cosa fare se il mio cane ha problemi durante il cambio cibo?',
  },
  'tip-dental-enzymatic': {
    badge: 'Igiene Dentale',
    title: 'Pulizia Meccanica ed Enzimatica Quotidiana',
    body: 'I batteri parodontali possono raggiungere il flusso sanguigno. Solo 2 minuti al giorno con snack dentali o pasta enzimatica riducono il tartaro fino al 40%.',
    actionPrompt: 'Quali sono i modi più efficaci per spazzolare i denti del mio cane?',
  },
  'tip-omega-mobility': {
    badge: 'Articolazioni e Pelo',
    title: 'Omega-3 EPA e DHA Antinfiammatorio',
    body: 'Gli acidi grassi omega-3 marini leniscono il prurito, riducono le infiammazioni e proteggono il liquido sinoviale articolare.',
    actionPrompt: 'Qual è il dosaggio consigliato di Omega-3 per il peso del mio cane?',
  },
  'tip-pumpkin-fiber': {
    badge: 'Sollievo Intestinale',
    title: 'Fibra Solubile di Zucca Pura',
    body: '1-2 cucchiai di purea di zucca pura al 100% agiscono come prebiotico naturale. La sua fibra solubile riequilibra sia la diarrea che la stitichezza.',
    actionPrompt: 'La purea di zucca può aiutare lo stomaco sensibile del mio animale?',
  },
  'tip-skin-turgor': {
    badge: 'Controllo Salute Rapido',
    title: 'Il Test di Elasticità Cutanea da 1 Secondo',
    body: 'Solleva delicatamente la pelle tra le scapole del cane. Se è ben idratato, torna subito in posizione. Se scende lentamente, offri acqua fresca.',
    actionPrompt: 'Come posso capire se il mio animale è disidratato?',
  },
  'tip-slow-feeder': {
    badge: 'Abitudine Alimentare',
    title: 'Ciotole Anti-Ingozzamento e Prevenzione Torsione',
    body: 'Mangiare troppo in fretta fa ingerire aria nello stomaco. Le ciotole labirinto e i tappetini olfattivi trasformano il pasto in un esercizio rilassante di 10 minuti.',
    actionPrompt: 'Le ciotole anti-ingozzamento sono utili per razze attive?',
  },
  'tip-protein-rotation': {
    badge: 'Prevenzione Allergie',
    title: 'Strategia di Rotazione delle Proteine',
    body: 'Mangiare la stessa proteina per anni può sensibilizzare il sistema immunitario. Alternare fonti proteiche di qualità ogni 4-6 mesi mantiene l\'intestino sano.',
    actionPrompt: 'Dovrei alternare le fonti proteiche del cibo per prevenire allergie?',
  },
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
 * Returns a daily tip based on the current day of the year and active language,
 * allowing manual offsets when browsing tips.
 */
export function getDailyVetTip(offset: number = 0, lang: string = 'en'): VetTip {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  const index = Math.abs((dayOfYear + offset) % VET_TIPS.length);
  const base = VET_TIPS[index];

  if (lang === 'tr' && TR_TIPS[base.id]) {
    const loc = TR_TIPS[base.id];
    return {
      ...base,
      badge: loc.badge,
      title: loc.title,
      body: loc.body,
      actionPrompt: loc.actionPrompt,
    };
  }

  if (lang === 'it' && IT_TIPS[base.id]) {
    const loc = IT_TIPS[base.id];
    return {
      ...base,
      badge: loc.badge,
      title: loc.title,
      body: loc.body,
      actionPrompt: loc.actionPrompt,
    };
  }

  return base;
}
