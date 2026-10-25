export interface AuthUser {
  username: string
  name: string
}

export interface LoginResponse {
  token: string
  user: AuthUser
}

export interface MeResponse {
  user: AuthUser
}
