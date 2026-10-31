// RFC 6750: the case-insensitive scheme, whitespace, then a token68 credential.
const bearerHeader = /^Bearer[ \t]+([A-Za-z0-9\-._~+/]+=*)[ \t]*$/iu;

/** The bearer credential of an Authorization header, or undefined when there is none. */
export function readBearer(header: string | undefined): string | undefined {
  return header === undefined ? undefined : bearerHeader.exec(header)?.[1];
}
