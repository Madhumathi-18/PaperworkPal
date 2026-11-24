export const PNG_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4];

let counter = 0;

/** Each test gets its own fake client IP so rate limits never leak between tests. */
export function freshIp(): string {
  counter += 1;
  return `198.51.100.${counter % 250}`;
}

export function jsonRequest(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': freshIp(), ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

export function formRequest(
  fields: Record<string, string | File>,
  headers: Record<string, string> = {},
): Request {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return new Request('http://localhost/api/analyze', {
    method: 'POST',
    headers: { 'x-forwarded-for': freshIp(), ...headers },
    body: form,
  });
}

export const pngFile = (padTo = PNG_BYTES.length): File =>
  new File(
    [new Uint8Array([...PNG_BYTES, ...new Array(padTo - PNG_BYTES.length).fill(0)])],
    'a.png',
    {
      type: 'image/png',
    },
  );
