import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        AI Code Review
      </Link>
      {user && (
        <div className="navbar-links">
          <Link to="/">New Review</Link>
          <Link to="/history">History</Link>
          <span className="navbar-user">
            {user.avatarUrl && <img src={user.avatarUrl} alt={user.username} className="avatar" />}
            {user.username}
          </span>
          <button onClick={() => logout()}>Log out</button>
        </div>
      )}
    </nav>
  );
}
