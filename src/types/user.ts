export type User = {
  _id: string;
  phone?: string;
  email?: string;
  username?: string;
  full_name?: string;
  apple_user_id?: string;
  nickname?: string;
  avatar?: string;
  bio?: string;
  profile?: {
    nickname?: string;
    avatar_url?: string;
    avatar_file_id?: string;
    bio?: string;
    primary_tag?: string;
    gender?: 'male' | 'female' | 'other' | 'unspecified';
    age?: number | null;
  };
  createdAt?: string | number;
  updatedAt?: string | number;
  created_at?: string | number;
  updated_at?: string | number;
  last_login_at?: string | number | null;
  push_token?: string;
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
  pushToken?: string;
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

export type UpdateUserPayload = {
  _id: string;
  full_name?: string;
  username?: string;
  push_token?: string;
  profile?: User['profile'];
};
