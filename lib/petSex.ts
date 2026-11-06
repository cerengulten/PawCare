export type PetSexOption = {
  value: 'male' | 'female';
  emoji: string;
  /** i18n key under `petForm.sexOpt` for display */
  labelKey: string;
};

export const PET_SEX: PetSexOption[] = [
  { value: 'male', emoji: '♂️', labelKey: 'petForm.sexOpt.male' },
  { value: 'female', emoji: '♀️', labelKey: 'petForm.sexOpt.female' },
];
