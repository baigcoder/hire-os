import Navbar from "../shared/Navbar";
import Footer from "../shared/Footer";
import "../app/app.css";
import "../app/legacy.css";

/**
 * The frame for the public information pages: the public bar, a plain title
 * in the brand's display face with one sentence under it, the content in the
 * app's type and colours, and the footer. No grid backdrop, no label.
 */
const IndustrialPageLayout = ({ children, title, subtitle }) => (
  <>
    <Navbar />
    <div className="app app-standalone">
      <main className="app-canvas" style={{ paddingTop: 72 }}>
        {(title || subtitle) && (
          <header className="info-head">
            {title && <h1 className="info-h1">{title}</h1>}
            {subtitle && <p className="info-lead">{subtitle}</p>}
          </header>
        )}
        {children}
      </main>
    </div>
    <Footer />
  </>
);

export default IndustrialPageLayout;
