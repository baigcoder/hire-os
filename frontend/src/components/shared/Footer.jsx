import { Link } from "react-router-dom";
import "./navbar.css";

const LINKS = [
  ["/jobs", "Jobs"],
  ["/company/pricing", "Pricing"],
  ["/about", "About"],
  ["/careers", "Careers"],
  ["/contact", "Contact"],
  ["/help", "Help"],
  ["/privacy", "Privacy"],
  ["/terms", "Terms"],
];

/** The public footer: the wordmark, the pages, and the year. Contact details live on /contact. */
const Footer = () => (
  <footer className="pub-foot">
    <Link to="/" className="pub-nav-mark" aria-label="HIRE.OS home">
      <span className="pub-nav-square" aria-hidden="true" />
      HIRE.OS
    </Link>
    <nav aria-label="Footer" className="pub-foot-links">
      {LINKS.map(([to, label]) => (
        <Link key={to} to={to} className="pub-nav-link">
          {label}
        </Link>
      ))}
    </nav>
    <span className="pub-foot-copy">© {new Date().getFullYear()} HIRE.OS</span>
  </footer>
);

export default Footer;
