// Google API の型定義（新しいGoogle Identity Services対応）
declare global {
  interface Window {
    gapi: {
      load: (apis: string, options: { callback: () => void; onerror: () => void }) => void;
      client: {
        init: (options: {
          apiKey: string;
          discoveryDocs: string[];
        }) => Promise<void>;
        setToken: (token: { access_token: string }) => void;
        getToken: () => { access_token?: string } | null;
        calendar: {
          events: {
            list: (options: {
              calendarId: string;
              timeMin: string;
              timeMax: string;
              singleEvents: boolean;
              orderBy: string;
            }) => Promise<{
              result: {
                items: GoogleCalendarEvent[];
              };
            }>;
            insert: (options: {
              calendarId: string;
              resource: GoogleCalendarEventInput;
            }) => Promise<{
              result: GoogleCalendarEvent;
            }>;
          };
          calendarList: {
            list: () => Promise<any>;
          };
        };
      };
    };
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (options: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

interface GoogleAuthInstance {
  isSignedIn: {
    get: () => boolean;
  };
  currentUser: {
    get: () => GoogleUser;
  };
  signIn: () => Promise<GoogleUser>;
  signOut: () => Promise<void>;
}

interface GoogleUser {
  getBasicProfile: () => GoogleProfile;
}

interface GoogleProfile {
  getEmail: () => string;
  getName: () => string;
}

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    date?: string; // 終日イベント
    dateTime?: string; // 時間指定イベント
  };
  end: {
    date?: string;
    dateTime?: string;
  };
  location?: string;
}

interface GoogleCalendarEventInput {
  summary: string;
  description?: string;
  start: {
    date?: string;
    dateTime?: string;
  };
  end: {
    date?: string;
    dateTime?: string;
  };
  location?: string;
}

export {};