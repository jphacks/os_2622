import { Link } from "react-router-dom";

type AppHeaderProps = {
  account: string | null;
  onLogout: () => void;
};

export function AppHeader({ account, onLogout }: AppHeaderProps) {
  return (
    <header className="app-header">
      <Link className="brand" to="/" aria-label="pet.sky ホーム">
        {/* <span className="brand-mark" aria-hidden="true">✳</span> */}
        <img src="/src/assets/icon.png" alt="a" width="30px"/>
        <span>peta</span>
      </Link>
      <div className="header-account">
        {account ? (
          <>
            <Link to="/mypage" className="header-login-status">
              {/* <span>ログイン中</span> */}
              <span className="header-handle">{account}</span>
            </Link>
            <button type="button" className="text-button" onClick={onLogout}>ログアウト</button>
          </>
        ) : (
        <></>
        )}
      </div>
    </header>
  );
}
