export async function computeTextPHash(text: string): Promise<string> {
  const cleaned = text.replace(/\s+/g, '').toLowerCase();
  const sampleSize = Math.min(cleaned.length, 10000);
  const sample = cleaned.substring(0, sampleSize);

  const hashSize = 32;
  const blockSize = Math.ceil(sample.length / (hashSize * hashSize));
  const pixels: number[] = [];

  for (let i = 0; i < hashSize * hashSize; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, sample.length);
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += sample.charCodeAt(j);
    }
    pixels.push(sum / Math.max(end - start, 1));
  }

  const avg = pixels.reduce((a, b) => a + b, 0) / pixels.length;
  const bits = pixels.map((p) => (p >= avg ? 1 : 0));

  let hash = '';
  for (let i = 0; i < bits.length; i += 4) {
    const nibble = bits[i] * 8 + bits[i + 1] * 4 + bits[i + 2] * 2 + bits[i + 3];
    hash += nibble.toString(16);
  }

  return hash;
}

export function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    return Math.abs(hash1.length - hash2.length) * 4;
  }

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const n1 = parseInt(hash1[i], 16);
    const n2 = parseInt(hash2[i], 16);
    let xor = n1 ^ n2;
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

export function isDuplicate(hash1: string, hash2: string, threshold: number = 10): boolean {
  return hammingDistance(hash1, hash2) <= threshold;
}
