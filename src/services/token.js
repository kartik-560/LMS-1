// services/token.js
let tokenCache = null;

export const setAuthToken = (token, persist = true) => {
  if (!token) {
    localStorage.removeItem("auth_token");
    sessionStorage.removeItem("auth_token");
    return;
  }
  (persist ? localStorage : sessionStorage).setItem("auth_token", token);
};

export const getToken = () => {
  return (
    sessionStorage.getItem("auth_token") ||
    localStorage.getItem("auth_token") ||
    null
  );
};

export const clearAuthToken = () => setAuthToken(null);
