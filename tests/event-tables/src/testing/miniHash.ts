export function miniHash(s: string): number {
  const rangeSize = 1000
  let hashValue = 0
  const prime = 31 // small prime for mixing
  for (const char of s) {
    hashValue = (hashValue * prime + char.charCodeAt(0)) % rangeSize
  }
  return hashValue
}
