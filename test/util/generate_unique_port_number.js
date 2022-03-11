let originalPort = 1883;

export function uniquePort() {
  return originalPort++;
}
