declare module 'passport-microsoft' {
  import { Strategy as PassportStrategy } from 'passport';

  export interface MicrosoftStrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string[];
  }

  export interface Profile {
    id: string;
    displayName: string;
    emails: Array<{ value: string }>;
  }

  export class Strategy extends PassportStrategy {
    constructor(
      options: MicrosoftStrategyOptions,
      verify: (
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: (error: any, user?: any) => void
      ) => void
    );
  }
}
