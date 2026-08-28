import { Role, RoleId } from './roles';

export interface Member {
  id: RoleId;
  role: Role;
}

export function describe(m: Member): string {
  return m.role;
}
