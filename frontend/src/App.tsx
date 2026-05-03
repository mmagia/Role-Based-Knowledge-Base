import { FormEvent, useEffect, useState } from "react";
import { getCurrentWriter, loginWriter, registerWriter, Writer } from "./api";

type AuthMode = "login" | "register";
type Page = "auth" | "next";

const TOKEN_STORAGE_KEY = "rkb_access_token";

function App() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [page, setPage] = useState<Page>(() =>
    localStorage.getItem(TOKEN_STORAGE_KEY) ? "next" : "auth",
  );
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [writer, setWriter] = useState<Writer | null>(null);
  const [registeredNickname, setRegisteredNickname] = useState("");
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    let isActive = true;

    getCurrentWriter(token)
      .then((currentWriter) => {
        if (isActive) {
          setWriter(currentWriter);
          setPage("next");
          setError("");
        }
      })
      .catch(() => {
        if (isActive) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          setToken(null);
          setWriter(null);
          setPage("auth");
          setError("Session has finished. Login again.");
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      if (mode === "register") {
        await registerWriter(nickname.trim(), password);
        setRegisteredNickname(nickname.trim());
        setPage("next");
        setPassword("");
        return;
      }

      const loginResponse = await loginWriter(nickname.trim(), password);
      localStorage.setItem(TOKEN_STORAGE_KEY, loginResponse.access_token);
      setToken(loginResponse.access_token);
      setWriter(loginResponse.writer);
      setPage("next");
      setPassword("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setWriter(null);
    setRegisteredNickname("");
    setPage("auth");
    setNickname("");
    setPassword("");
    setMessage("You have logged out.");
  }

  function handleBackToAuth(nextMode: AuthMode = "login") {
    setMode(nextMode);
    setPage("auth");
    setError("");
    setMessage("");
  }

  return (
    <main className="app-shell">
      <section className="auth-panel" aria-live="polite">
        <header className="brand-header">
          <span>Role-Based Knowledge Base</span>
          <strong>{page === "auth" ? "Authorization" : "Next page"}</strong>
        </header>

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Проверяем текущую сессию...</p>
          </div>
        ) : page === "next" ? (
          <div className="next-card">
            <div>
              <span className="eyebrow">{writer ? "You have logged in" : "Application created"}</span>
              <h1>
                {writer
                  ? `Hello, ${writer.nickname}`
                  : `${registeredNickname || nickname}, almost done`}
              </h1>
            </div>

            <div className={writer?.is_confirmed ? "status confirmed" : "status pending"}>
              {writer?.is_confirmed ? "Account approved" : "Waiting approval"}
            </div>

            <p>
              {writer
                ? "Next screen here"
                : "Account was created successfully. Waiting for admin to approve this account."}
            </p>

            <div className="button-row">
              {writer ? (
                <button className="secondary-button" type="button" onClick={handleLogout}>
                  Log out
                </button>
              ) : (
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => handleBackToAuth("login")}
                >
                  Go back to login
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="tabs">
              <button
                className={mode === "login" ? "active" : ""}
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setMessage("");
                }}
              >
                Login
              </button>
              <button
                className={mode === "register" ? "active" : ""}
                type="button"
                onClick={() => {
                  setMode("register");
                  setError("");
                  setMessage("");
                }}
              >
                Register
              </button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div>
                <span className="eyebrow">{mode === "login" ? "Welcome back" : "New writer"}</span>
                <h1>{mode === "login" ? "Login" : "Register"}</h1>
              </div>

              <label>
                Nickname
                <input
                  autoComplete="username"
                  minLength={2}
                  name="nickname"
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="for example: alice"
                  required
                  type="text"
                  value={nickname}
                />
              </label>

              <label>
                Password
                <input
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={3}
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="your password"
                  required
                  type="password"
                  value={password}
                />
              </label>

              {error ? <div className="alert error">{error}</div> : null}
              {message ? <div className="alert success">{message}</div> : null}

              <button className="primary-button" disabled={isSubmitting} type="submit">
                {isSubmitting
                  ? "Loading..."
                  : mode === "login"
                    ? "Login"
                    : "Create account"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}

export default App;
