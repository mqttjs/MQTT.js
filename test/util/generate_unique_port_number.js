let originalPort = 1884;

export function uniquePort() {
  return originalPort++;
}
