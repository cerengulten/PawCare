export type PetSexOption = {
  value: 'male' | 'female' | 'unknown';
  emoji: string;
  label: string;
};

export const PET_SEX: PetSexOption[] = [
  { value: 'male', emoji: '🐾', label: 'Male' },
  { value: 'female', emoji: '🐾', label: 'Female' },
  { value: 'unknown', emoji: '❓', label: 'Unknown' },
];
