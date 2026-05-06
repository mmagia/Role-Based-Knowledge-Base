import { FormEvent, useEffect, useState } from "react";
import {
  confirmWriter,
  createPost,
  deletePost,
  deletePostsByWriter,
  getAllPosts,
  getCurrentWriter,
  getPost,
  getPostCount,
  getPosts,
  getPostsByDateRange,
  getPostsByWriter,
  getRecentPosts,
  getWriter,
  getWriters,
  loginWriter,
  Post,
  registerWriter,
  searchPosts,
  Writer,
} from "./api";

type AuthMode = "login" | "register" | "admin";
type Page = "auth" | "app";
type AppView = "feed" | "profile" | "admin";
type FeedFilter = "all" | "search" | "writer" | "recent" | "dateRange";

const TOKEN_STORAGE_KEY = "rkb_access_token";
const ADMIN_STORAGE_KEY = "rkb_admin_session";
const PAGE_SIZE = 8;
const ADMIN_LOGIN = import.meta.env.VITE_ADMIN_LOGIN ?? "admin";
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? "admin123";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function App() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem(ADMIN_STORAGE_KEY) === "true");
  const [page, setPage] = useState<Page>(() =>
    localStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(ADMIN_STORAGE_KEY) === "true"
      ? "app"
      : "auth",
  );
  const [view, setView] = useState<AppView>(() =>
    localStorage.getItem(ADMIN_STORAGE_KEY) === "true" ? "admin" : "feed",
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

  const [posts, setPosts] = useState<Post[]>([]);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("all");
  const [filterValue, setFilterValue] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState("");
  const [postText, setPostText] = useState("");
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const [profileWriter, setProfileWriter] = useState<Writer | null>(null);
  const [profilePostCount, setProfilePostCount] = useState<number | null>(null);
  const [profileError, setProfileError] = useState("");

  const [writers, setWriters] = useState<Writer[]>([]);
  const [adminPosts, setAdminPosts] = useState<Post[]>([]);
  const [adminError, setAdminError] = useState("");
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      setIsLoading(false);
      return;
    }

    if (!token) {
      setIsLoading(false);
      return;
    }

    let isActive = true;

    getCurrentWriter(token)
      .then((currentWriter) => {
        if (isActive) {
          setWriter(currentWriter);
          setPage("app");
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
  }, [isAdmin, token]);

  useEffect(() => {
    if (page !== "app" || view !== "feed") {
      return;
    }

    void loadFeed();
  }, [page, view, pageNumber]);

  useEffect(() => {
    if (view !== "profile" || !writer) {
      return;
    }

    let isActive = true;
    setProfileError("");

    Promise.all([getWriter(writer.nickname), getPostCount(writer.nickname)])
      .then(([writerDetails, count]) => {
        if (isActive) {
          setProfileWriter(writerDetails);
          setProfilePostCount(count.post_count);
        }
      })
      .catch((profileLoadError) => {
        if (isActive) {
          setProfileError(
            profileLoadError instanceof Error
              ? profileLoadError.message
              : "Could not load profile",
          );
        }
      });

    return () => {
      isActive = false;
    };
  }, [view, writer]);

  useEffect(() => {
    if (view !== "admin" || !isAdmin) {
      return;
    }

    void loadAdminData();
  }, [view, isAdmin]);

  async function loadFeed(nextFilter = feedFilter, nextValue = filterValue) {
    setIsFeedLoading(true);
    setFeedError("");

    try {
      if (nextFilter === "search" && nextValue.trim()) {
        setPosts(await searchPosts(nextValue.trim()));
        setTotalPages(1);
        return;
      }

      if (nextFilter === "writer" && nextValue.trim()) {
        setPosts(await getPostsByWriter(nextValue.trim()));
        setTotalPages(1);
        return;
      }

      if (nextFilter === "recent") {
        setPosts(await getRecentPosts(Number(nextValue) || 24));
        setTotalPages(1);
        return;
      }

      if (nextFilter === "dateRange" && dateStart && dateEnd) {
        setPosts(await getPostsByDateRange(dateStart, dateEnd));
        setTotalPages(1);
        return;
      }

      const response = await getPosts(pageNumber, PAGE_SIZE);
      setPosts(response.posts);
      setTotalPages(Math.max(response.total_pages, 1));
    } catch (feedLoadError) {
      setFeedError(feedLoadError instanceof Error ? feedLoadError.message : "Could not load posts");
    } finally {
      setIsFeedLoading(false);
    }
  }

  async function loadAdminData() {
    setIsAdminLoading(true);
    setAdminError("");

    try {
      const [writersResponse, postsResponse] = await Promise.all([
        getWriters(0, 100),
        getAllPosts(0, 100),
      ]);
      setWriters(writersResponse);
      setAdminPosts(postsResponse);
    } catch (adminLoadError) {
      setAdminError(adminLoadError instanceof Error ? adminLoadError.message : "Could not load admin data");
    } finally {
      setIsAdminLoading(false);
    }
  }

  function applyFilter(nextFilter: FeedFilter, nextValue = filterValue) {
    setFeedFilter(nextFilter);
    setFilterValue(nextValue);
    setSelectedPost(null);
    setPageNumber(1);
    void loadFeed(nextFilter, nextValue);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      if (mode === "admin") {
        if (nickname.trim() !== ADMIN_LOGIN || password !== ADMIN_PASSWORD) {
          throw new Error("Incorrect admin credentials");
        }

        localStorage.setItem(ADMIN_STORAGE_KEY, "true");
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setIsAdmin(true);
        setWriter(null);
        setToken(null);
        setView("admin");
        setPage("app");
        setPassword("");
        return;
      }

      if (mode === "register") {
        await registerWriter(nickname.trim(), password);
        setRegisteredNickname(nickname.trim());
        setWriter(null);
        setPage("app");
        setPassword("");
        return;
      }

      const loginResponse = await loginWriter(nickname.trim(), password);
      localStorage.setItem(TOKEN_STORAGE_KEY, loginResponse.access_token);
      localStorage.removeItem(ADMIN_STORAGE_KEY);
      setIsAdmin(false);
      setToken(loginResponse.access_token);
      setWriter(loginResponse.writer);
      setView("feed");
      setPage("app");
      setPassword("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    setToken(null);
    setIsAdmin(false);
    setWriter(null);
    setRegisteredNickname("");
    setPage("auth");
    setView("feed");
    setPosts([]);
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

  async function handleCreatePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!writer || !postText.trim()) {
      return;
    }

    setIsCreatingPost(true);
    setFeedError("");

    try {
      const createdPost = await createPost(writer.nickname, postText.trim());
      setPostText("");
      setPosts((currentPosts) => [createdPost, ...currentPosts]);
      setFeedFilter("all");
      setPageNumber(1);
    } catch (postCreateError) {
      setFeedError(
        postCreateError instanceof Error ? postCreateError.message : "Could not create post",
      );
    } finally {
      setIsCreatingPost(false);
    }
  }

  async function handleDeletePost(postId: string) {
    setFeedError("");

    try {
      await deletePost(postId);
      setPosts((currentPosts) => currentPosts.filter((post) => post.post_id !== postId));
      setAdminPosts((currentPosts) => currentPosts.filter((post) => post.post_id !== postId));
      if (selectedPost?.post_id === postId) {
        setSelectedPost(null);
      }
    } catch (postDeleteError) {
      const nextError =
        postDeleteError instanceof Error ? postDeleteError.message : "Could not delete post";
      setFeedError(nextError);
      setAdminError(nextError);
    }
  }

  async function handleOpenPost(postId: string) {
    setFeedError("");

    try {
      setSelectedPost(await getPost(postId));
    } catch (postLoadError) {
      setFeedError(postLoadError instanceof Error ? postLoadError.message : "Could not load post");
    }
  }

  async function handleConfirmWriter(nicknameToConfirm: string) {
    setAdminError("");

    try {
      const confirmed = await confirmWriter(nicknameToConfirm);
      setWriters((currentWriters) =>
        currentWriters.map((currentWriter) =>
          currentWriter.nickname === confirmed.nickname ? confirmed : currentWriter,
        ),
      );
    } catch (confirmError) {
      setAdminError(confirmError instanceof Error ? confirmError.message : "Could not confirm writer");
    }
  }

  async function handleDeleteWriterPosts(nicknameToDelete: string) {
    setAdminError("");

    try {
      await deletePostsByWriter(nicknameToDelete);
      setAdminPosts((currentPosts) =>
        currentPosts.filter((post) => post.writer_nickname !== nicknameToDelete),
      );
      setPosts((currentPosts) =>
        currentPosts.filter((post) => post.writer_nickname !== nicknameToDelete),
      );
    } catch (deleteError) {
      setAdminError(deleteError instanceof Error ? deleteError.message : "Could not delete posts");
    }
  }

  const canCreatePost = Boolean(writer?.is_confirmed);
  const workspaceTitle = isAdmin ? "Admin" : writer?.nickname;

  return (
    <main className="app-shell">
      <section className={page === "app" ? "workspace-panel" : "auth-panel"} aria-live="polite">
        <header className="brand-header">
          <span>Role-Based Knowledge Base</span>
          <strong>{page === "auth" ? "Authorization" : workspaceTitle}</strong>
        </header>

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Checking session...</p>
          </div>
        ) : page === "app" ? (
          writer || isAdmin ? (
            <div className="workspace">
              <aside className="sidebar">
                <div>
                  <span className="eyebrow">{isAdmin ? "Admin account" : "Writer"}</span>
                  <h1>{isAdmin ? "Control room" : writer?.nickname}</h1>
                  <div className={writer?.is_confirmed || isAdmin ? "status confirmed" : "status pending"}>
                    {isAdmin ? "Local admin mode" : writer?.is_confirmed ? "Account approved" : "Waiting approval"}
                  </div>
                </div>

                <nav className="side-nav">
                  <button className={view === "feed" ? "active" : ""} type="button" onClick={() => setView("feed")}>
                    Feed
                  </button>
                  {!isAdmin ? (
                    <button
                      className={view === "profile" ? "active" : ""}
                      type="button"
                      onClick={() => setView("profile")}
                    >
                      Profile
                    </button>
                  ) : null}
                  {isAdmin ? (
                    <button
                      className={view === "admin" ? "active" : ""}
                      type="button"
                      onClick={() => setView("admin")}
                    >
                      Admin
                    </button>
                  ) : null}
                </nav>

                <button className="secondary-button" type="button" onClick={handleLogout}>
                  Log out
                </button>
              </aside>

              <section className="content-panel">
                {view === "feed" ? (
                  <>
                    <div className="section-heading">
                      <div>
                        <span className="eyebrow">Knowledge feed</span>
                        <h2>Posts</h2>
                      </div>
                      <button className="secondary-button compact" type="button" onClick={() => void loadFeed()}>
                        Refresh
                      </button>
                    </div>

                    {!isAdmin ? (
                      <form className="composer" onSubmit={handleCreatePost}>
                        <label>
                          Create post
                          <textarea
                            disabled={!canCreatePost}
                            onChange={(event) => setPostText(event.target.value)}
                            placeholder={
                              canCreatePost
                                ? "Write a short knowledge note..."
                                : "Your writer account must be approved before posting."
                            }
                            value={postText}
                          />
                        </label>
                        <button
                          className="primary-button"
                          disabled={!canCreatePost || isCreatingPost || !postText.trim()}
                          type="submit"
                        >
                          {isCreatingPost ? "Publishing..." : "Publish"}
                        </button>
                      </form>
                    ) : null}

                    <div className="filters">
                      <button className={feedFilter === "all" ? "active" : ""} type="button" onClick={() => applyFilter("all")}>
                        All
                      </button>
                      <button className={feedFilter === "search" ? "active" : ""} type="button" onClick={() => applyFilter("search")}>
                        Search
                      </button>
                      <button className={feedFilter === "writer" ? "active" : ""} type="button" onClick={() => applyFilter("writer")}>
                        Writer
                      </button>
                      <button
                        className={feedFilter === "recent" ? "active" : ""}
                        type="button"
                        onClick={() => applyFilter("recent", filterValue || "24")}
                      >
                        Recent
                      </button>
                      <button
                        className={feedFilter === "dateRange" ? "active" : ""}
                        type="button"
                        onClick={() => applyFilter("dateRange")}
                      >
                        Dates
                      </button>
                    </div>

                    {feedFilter !== "all" ? (
                      <form
                        className={feedFilter === "dateRange" ? "filter-form date-filter" : "filter-form"}
                        onSubmit={(event) => {
                          event.preventDefault();
                          void loadFeed(feedFilter, filterValue);
                        }}
                      >
                        {feedFilter === "dateRange" ? (
                          <>
                            <input type="datetime-local" value={dateStart} onChange={(event) => setDateStart(event.target.value)} />
                            <input type="datetime-local" value={dateEnd} onChange={(event) => setDateEnd(event.target.value)} />
                          </>
                        ) : (
                          <input
                            onChange={(event) => setFilterValue(event.target.value)}
                            placeholder={
                              feedFilter === "search"
                                ? "Search text"
                                : feedFilter === "writer"
                                  ? "Writer nickname"
                                  : "Hours, for example 24"
                            }
                            type={feedFilter === "recent" ? "number" : "text"}
                            value={filterValue}
                          />
                        )}
                        <button className="secondary-button compact" type="submit">
                          Apply
                        </button>
                      </form>
                    ) : null}

                    {feedError ? <div className="alert error">{feedError}</div> : null}
                    <div className="post-list">
                      {isFeedLoading ? (
                        <div className="empty-card">Loading posts...</div>
                      ) : posts.length ? (
                        posts.map((post) => (
                          <article className="post-card" key={post.post_id}>
                            <div className="post-meta">
                              <button type="button" onClick={() => applyFilter("writer", post.writer_nickname)}>
                                @{post.writer_nickname}
                              </button>
                              <span>{formatDate(post.created_at)}</span>
                            </div>
                            <p>{post.post_text}</p>
                            <div className="post-actions">
                              <span>{post.post_id.slice(0, 8)}</span>
                              <div className="inline-actions">
                                <button type="button" onClick={() => void handleOpenPost(post.post_id)}>
                                  Open
                                </button>
                                <button type="button" onClick={() => void handleDeletePost(post.post_id)}>
                                  Delete
                                </button>
                              </div>
                            </div>
                          </article>
                        ))
                      ) : (
                        <div className="empty-card">No posts yet. The board is unusually quiet.</div>
                      )}
                    </div>

                    {feedFilter === "all" ? (
                      <div className="pagination">
                        <button
                          className="secondary-button compact"
                          disabled={pageNumber <= 1}
                          type="button"
                          onClick={() => setPageNumber((current) => Math.max(current - 1, 1))}
                        >
                          Previous
                        </button>
                        <span>
                          Page {pageNumber} / {totalPages}
                        </span>
                        <button
                          className="secondary-button compact"
                          disabled={pageNumber >= totalPages}
                          type="button"
                          onClick={() => setPageNumber((current) => current + 1)}
                        >
                          Next
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : null}

                {view === "profile" && writer ? (
                  <div className="profile-view">
                    <div>
                      <span className="eyebrow">Profile</span>
                      <h2>{writer.nickname}</h2>
                    </div>

                    {profileError ? <div className="alert error">{profileError}</div> : null}

                    <div className="profile-grid">
                      <div className="metric-card">
                        <span>Status</span>
                        <strong>{profileWriter?.is_confirmed ? "Approved" : "Waiting approval"}</strong>
                      </div>
                      <div className="metric-card">
                        <span>Posts</span>
                        <strong>{profilePostCount ?? "..."}</strong>
                      </div>
                      <div className="metric-card">
                        <span>Nickname</span>
                        <strong>{profileWriter?.nickname ?? writer.nickname}</strong>
                      </div>
                    </div>

                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => {
                        setView("feed");
                        applyFilter("writer", writer.nickname);
                      }}
                    >
                      Show my posts
                    </button>
                  </div>
                ) : null}

                {view === "admin" ? (
                  <div className="admin-view">
                    <div className="section-heading">
                      <div>
                        <span className="eyebrow">Moderation</span>
                        <h2>Admin</h2>
                      </div>
                      <button className="secondary-button compact" type="button" onClick={() => void loadAdminData()}>
                        Reload
                      </button>
                    </div>

                    {!isAdmin ? (
                      <div className="alert error">
                        This tab is visible because backend admin endpoints are public. Use Admin login for moderation workflow.
                      </div>
                    ) : null}
                    {adminError ? <div className="alert error">{adminError}</div> : null}

                    <div className="admin-grid">
                      <section className="admin-card">
                        <h3>Writers</h3>
                        {isAdminLoading ? <div className="empty-card">Loading writers...</div> : null}
                        {writers.map((currentWriter) => (
                          <div className="admin-row" key={currentWriter.nickname}>
                            <div>
                              <strong>{currentWriter.nickname}</strong>
                              <span>{currentWriter.is_confirmed ? "Approved" : "Waiting approval"}</span>
                            </div>
                            <div className="inline-actions">
                              <button
                                className="secondary-button compact"
                                disabled={currentWriter.is_confirmed}
                                type="button"
                                onClick={() => void handleConfirmWriter(currentWriter.nickname)}
                              >
                                {currentWriter.is_confirmed ? "Confirmed" : "Confirm"}
                              </button>
                              <button
                                className="secondary-button compact danger"
                                type="button"
                                onClick={() => void handleDeleteWriterPosts(currentWriter.nickname)}
                              >
                                Delete posts
                              </button>
                            </div>
                          </div>
                        ))}
                      </section>

                      <section className="admin-card">
                        <h3>Recent loaded posts</h3>
                        {adminPosts.map((post) => (
                          <div className="admin-row" key={post.post_id}>
                            <div>
                              <strong>@{post.writer_nickname}</strong>
                              <span>{post.post_text.slice(0, 90)}</span>
                            </div>
                            <button
                              className="secondary-button compact danger"
                              type="button"
                              onClick={() => void handleDeletePost(post.post_id)}
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                        {!adminPosts.length && !isAdminLoading ? (
                          <div className="empty-card">No posts loaded.</div>
                        ) : null}
                      </section>
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          ) : (
            <div className="next-card">
              <span className="eyebrow">Application created</span>
              <h1>{registeredNickname || nickname}, almost done</h1>
              <div className="status pending">Waiting approval</div>
              <p>Account was created successfully. Waiting for admin to approve this account.</p>
              <button className="primary-button" type="button" onClick={() => handleBackToAuth("login")}>
                Go back to login
              </button>
            </div>
          )
        ) : (
          <>
            <div className="tabs auth-tabs">
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
              <button
                className={mode === "admin" ? "active" : ""}
                type="button"
                onClick={() => {
                  setMode("admin");
                  setError("");
                  setMessage("");
                }}
              >
                Admin
              </button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div>
                <span className="eyebrow">
                  {mode === "login" ? "Welcome back" : mode === "register" ? "New writer" : "Local admin"}
                </span>
                <h1>{mode === "login" ? "Login" : mode === "register" ? "Register" : "Admin"}</h1>
              </div>

              <label>
                {mode === "admin" ? "Admin login" : "Nickname"}
                <input
                  autoComplete="username"
                  minLength={2}
                  name="nickname"
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder={mode === "admin" ? "admin" : "for example: alice"}
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
                  placeholder={mode === "admin" ? "admin123" : "your password"}
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
                    : mode === "register"
                      ? "Create account"
                      : "Enter admin"}
              </button>
            </form>
          </>
        )}
      </section>
      {selectedPost ? (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedPost(null)}
          role="presentation"
        >
          <article
            aria-labelledby="opened-post-title"
            aria-modal="true"
            className="post-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">Opened post</span>
                <h2 id="opened-post-title">@{selectedPost.writer_nickname}</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setSelectedPost(null)}>
                Close
              </button>
            </div>

            <p>{selectedPost.post_text}</p>

            <div className="modal-footer">
              <span>{formatDate(selectedPost.created_at)}</span>
              <div className="inline-actions">
                <span>{selectedPost.post_id.slice(0, 8)}</span>
                <button
                  className="secondary-button compact danger"
                  type="button"
                  onClick={() => void handleDeletePost(selectedPost.post_id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </article>
        </div>
      ) : null}
    </main>
  );
}

export default App;
