const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/** Short random id with a readable prefix, e.g. `itm_k3j9x0q2`. */
export function uid(prefix: string, rand: () => number = Math.random) {
  let out = "";
  for (let i = 0; i < 10; i++) out += ALPHABET[Math.floor(rand() * ALPHABET.length)];
  return `${prefix}_${out}`;
}

/** Document number with a zero-padded sequence, e.g. `INV-0007`. */
export function docNumber(prefix: string, seq: number) {
  return `${prefix}-${String(seq).padStart(4, "0")}`;
}
