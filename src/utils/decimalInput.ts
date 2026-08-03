export function parseDecimalInput(value: string): number {
  return /^-?\d*(?:\.\d*)?$/.test(value) ? Number(value || 0) : Number.NaN;
}
