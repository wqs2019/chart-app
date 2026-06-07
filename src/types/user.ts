export type User = {
  _id: string;
  phone: string;
  nickname?: string;
  avatar?: string;
  bio?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
};

export type CreateUserPayload = {
  phone: string;
  nickname?: string;
  avatar?: string;
  bio?: string;
};
