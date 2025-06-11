import { LucideIcon } from "lucide-react";
import { StaffPermissions, StaffRole, UserRole } from "./staff";

export interface NavItem {
  href?: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[]; // Now includes specific StaffRole types
  staffRoles?: StaffRole[]; // Which specific staff roles can see this? (More restrictive)
  staffPermissionKey?: keyof StaffPermissions;
  hint?: string;
  target?: string;
  rel?: string;
  children?: NavItem[];
  isHeader?: boolean;
  badgeCount?: number;
  isGroup?: boolean; 
  isTopLevel?: boolean; 
}