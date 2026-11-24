const USER_KEY = "userInfo";
const TOKEN_KEY = "token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);

// Sessions saved before login tokens existed have a user but no token. They
// count as logged out, because the backend would reject every request.
export const getUser = () => {
  if (!getToken()) return null;
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
};

export const setSession = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const updateStoredUser = (user) =>
  localStorage.setItem(USER_KEY, JSON.stringify(user));

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const homePathFor = (user) =>
  user?.userType === "admin" ? "/admin-add" : "/user-property";
