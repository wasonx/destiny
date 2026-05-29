const recentErrors = [];

export function recordError(error) {
  recentErrors.unshift({
    message: error?.message || String(error),
    at: new Date().toISOString(),
  });
  recentErrors.splice(50);
}

export function listRecentErrors() {
  return recentErrors;
}
