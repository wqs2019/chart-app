export type User = {
  _id: string;
  phone?: string;
  email?: string;
  username?: string;
  apple_user_id?: string;
  nickname?: string;
  avatar?: string;
  bio?: string;
  profile?: {
    nickname?: string;
    avatar_url?: string;
    bio?: string;
    primary_tag?: string;
  };
  createdAt?: string | number;
  updatedAt?: string | number;
  created_at?: string | number;
  updated_at?: string | number;
  last_login_at?: string | number | null;
};

export type CreateUserPayload = {
  phone: string;
  nickname?: string;
  avatar?: string;
  bio?: string;
};

export type AuthUser = {
  _id: string;
  appleUserId: string;
  email: string | null;
  fullName: string | null;
  username: string;
  profile?: User['profile'];
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

export type AppleLoginPayload = {
  userId: string;
  email?: string | null;
  fullName?: string | null;
  identityToken?: string | null;
  authorizationCode?: string | null;
};
