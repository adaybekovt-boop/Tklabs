function hashString(input: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

export function seededUnit(seed: string | number) {
  const hashed = typeof seed === "number" ? seed >>> 0 : hashString(seed);
  let value = hashed + 0x6d2b79f5;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
}

function smoothstep(value: number) {
  return value * value * (3 - 2 * value);
}

export function valueNoise(id: string, timeSeconds: number, interval = 37) {
  const position = timeSeconds / interval;
  const left = Math.floor(position);
  const fraction = smoothstep(position - left);
  const a = seededUnit(`${id}:${left}`);
  const b = seededUnit(`${id}:${left + 1}`);
  return a + (b - a) * fraction;
}
