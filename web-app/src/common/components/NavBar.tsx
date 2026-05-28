import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

function NavBar() {
  return (
    <nav className="navigation-bar">
      <div className="nav-links">
        <a href="/">Pets</a>
        <a href="/appointments">Appointments</a>
      </div>
      <WalletMultiButton />
    </nav>
  );
}

export default NavBar;
