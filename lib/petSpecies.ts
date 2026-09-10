export type PetSpeciesOption = {
  /** stored verbatim in dogs.species; also matched by lib/cycleLogic mapping */
  value: string;
  emoji: string;
  /** i18n key under `species` for display */
  labelKey: string;
};

export const PET_SPECIES: PetSpeciesOption[] = [
  { value: 'Dog', emoji: '🐶', labelKey: 'species.dog' },
  { value: 'Cat', emoji: '🐱', labelKey: 'species.cat' },
  { value: 'Rabbit', emoji: '🐰', labelKey: 'species.rabbit' },
  { value: 'Bird', emoji: '🐦', labelKey: 'species.bird' },
  { value: 'Guinea Pig', emoji: '🐹', labelKey: 'species.guineaPig' },
  { value: 'Cow', emoji: '🐄', labelKey: 'species.cow' },
];
