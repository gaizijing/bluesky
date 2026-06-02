/** 可进入 /setting 后台管理的角色 */
const SETTING_ADMIN_ROLES = new Set(['SUPER_ADMIN', 'REGION_ADMIN', 'admin']);

export function normalizeRoles(userInfo) {
  if (!userInfo) return [];
  if (Array.isArray(userInfo.roles) && userInfo.roles.length) {
    return userInfo.roles.map(String);
  }
  if (userInfo.role) {
    return [String(userInfo.role)];
  }
  return [];
}

export function getPrimaryRole(userInfo) {
  const roles = normalizeRoles(userInfo);
  return roles[0] || 'READ_ONLY';
}

export function canAccessSetting(userInfoOrRole) {
  if (typeof userInfoOrRole === 'string') {
    return SETTING_ADMIN_ROLES.has(userInfoOrRole);
  }
  return normalizeRoles(userInfoOrRole).some((role) => SETTING_ADMIN_ROLES.has(role));
}

export function persistUserSession(userInfo) {
  const roles = normalizeRoles(userInfo);
  const primaryRole = roles[0] || 'READ_ONLY';
  localStorage.setItem('userRole', primaryRole);
  localStorage.setItem('userRoles', JSON.stringify(roles));
  if (Array.isArray(userInfo?.regionIds)) {
    localStorage.setItem('userRegionIds', JSON.stringify(userInfo.regionIds));
    if (userInfo.regionIds.length) {
      localStorage.setItem('currentRegionId', userInfo.regionIds[0]);
    }
  }
}

export function readStoredRoles() {
  try {
    const raw = localStorage.getItem('userRoles');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map(String);
      }
    }
  } catch {
    // ignore
  }
  const legacy = localStorage.getItem('userRole');
  return legacy ? [legacy] : ['READ_ONLY'];
}

export function canAccessSettingFromStorage() {
  return readStoredRoles().some((role) => SETTING_ADMIN_ROLES.has(role));
}
