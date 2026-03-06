let inMemoryToken: string | null = null;

export const authStore = {
  getToken() {
    if (typeof window === "undefined") return inMemoryToken;
    return inMemoryToken ?? window.localStorage.getItem("ncs_jwt");
  },
  setToken(token: string | null) {
    inMemoryToken = token;
    if (typeof window === "undefined") return;
    if (token) {
      window.localStorage.setItem("ncs_jwt", token);
    } else {
      window.localStorage.removeItem("ncs_jwt");
    }
  }
};
