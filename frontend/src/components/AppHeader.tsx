import { Link } from "react-router-dom";

export function AppHeader() {
  return (
    <header className="app-header">
      <Link className="brand" to="/" aria-label="pet.sky ホーム">
        {/* <span className="brand-mark" aria-hidden="true">✳</span> */}
        <img src="/src/assets/icon.png" alt="a" width="30px"/>
        <span>peta</span>
      </Link>
    </header>
  );
}
