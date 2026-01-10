// src/types/user.ts
export interface SignupRequest {
  email: string;
  password_hash: string;
  name?: string;
}
