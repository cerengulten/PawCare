export function computeAge(birthDate: string | null): string {
  if (!birthDate) return '';
  const dob = new Date(birthDate);
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();
  if (now.getDate() < dob.getDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  if (years <= 0) return `${Math.max(months, 0)}m`;
  return months > 0 ? `${years}y ${months}m` : `${years}y`;
}
