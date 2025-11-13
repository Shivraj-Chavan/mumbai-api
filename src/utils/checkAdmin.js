export function isAdminOrSubadmin(user) {
    return user?.role === 'admin' || user?.role === 'sub-admin';
  }