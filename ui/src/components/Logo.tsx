const Logo = () => (
  <div className="logo-container">
    <a href="https://agoric.com/develop" target="_blank">
      <img
        src={`${import.meta.env.BASE_URL}agoric.svg`}
        className="agoric-logo"
        alt="Agoric logo"
      />
    </a>
  </div>
);

export default Logo;
