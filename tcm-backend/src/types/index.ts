export type Role = 'QA' | 'DEV';

export interface JwtPayload {
  sub: string;   // user id
  role: Role;
  username: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: JwtPayload;
    }
  }
}

export {};
