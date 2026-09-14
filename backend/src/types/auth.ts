export type MembershipRole = 'owner' | 'admin' | 'member'
export type TreeAccessRole = 'visitor' | 'contributor'

export type UserJwtPayload = {
  kind: 'user'
  sub: string
  jti: string
  userId: string
  email: string
}

export type TreeAccessJwtPayload = {
  kind: 'tree_access'
  sub: string
  treeId: string
  role: TreeAccessRole
  accessVersion: number
}

export type AnyJwtPayload = UserJwtPayload | TreeAccessJwtPayload

export type UserActor = {
  kind: 'user'
  userId: string
  email: string
}

export type TreeAccessActor = {
  kind: 'tree_access'
  treeId: string
  role: TreeAccessRole
}

export type Actor = UserActor | TreeAccessActor | null
