import {
  TRUSTCAPTCHA_TEST_SECRET,
  TRUSTCAPTCHA_TEST_SITE_KEY_FAIL,
  TRUSTCAPTCHA_TEST_SITE_KEY_PASS,
} from "@trustcaptcha/shared";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "TrustCaptcha Developer Documentation",
  description:
    "Integrate TrustCaptcha with HTML, JavaScript, Node.js and deterministic test keys.",
  alternates: { canonical: "/docs" },
};

export const dynamic = "force-dynamic";

const javascriptSnippet = `const widget = TrustCaptcha.render({
  element: "#captcha",
  siteKey: "YOUR_SITE_KEY",
  action: "signup",
  mode: "managed",
  language: "auto",
  callback(token) {
    // Send token to your own backend with the protected request.
  },
});

await widget.reset();`;

const nodeSnippet = `import { TrustCaptchaServer } from "@trustcaptcha/server";

const trustcaptcha = new TrustCaptchaServer({
  secretKey: process.env.TRUSTCAPTCHA_SECRET_KEY,
});

const result = await trustcaptcha.verify({
  action: "signup",
  token: request.body["trustcaptcha-response"],
});

if (!result.success) {
  return response.status(403).json({ error: "Human verification failed" });
}

// Execute the protected business action only after success.`;

export default function DeveloperDocsPage() {
  const apiBaseUrl = (
    process.env.PUBLIC_API_URL ?? "http://localhost:4302"
  ).replace(/\/$/, "");
  const dashboardUrl = (
    process.env.PUBLIC_DASHBOARD_URL ?? "http://localhost:4301"
  ).replace(/\/$/, "");
  const htmlSnippet = `<script src="${apiBaseUrl}/v1/api.js" async defer></script>

<form method="post" action="/signup">
  <input name="email" type="email" required>
  <div
    class="trust-captcha"
    data-sitekey="YOUR_SITE_KEY"
    data-action="signup">
  </div>
  <button type="submit">Create account</button>
</form>`;

  return (
    <main className="docs-page">
      <header className="docs-header">
        <Link className="docs-brand" href="/en">
          <span>TC</span> TrustCaptcha
        </Link>
        <nav aria-label="Documentation navigation">
          <a href="#quickstart">Quickstart</a>
          <a href="#server">Server verify</a>
          <a href="#testing">Testing</a>
          <a href="#reference">Reference</a>
        </nav>
        <a className="header-cta" href={`${dashboardUrl}/register`}>
          Get a Site Key
        </a>
      </header>

      <section className="docs-hero">
        <p className="eyebrow">
          <span aria-hidden="true" />
          Developer documentation
        </p>
        <h1>Protect an action in minutes.</h1>
        <p>
          Add the browser widget, send its one-time token with your form, and
          verify that token from your server before executing the action.
        </p>
      </section>

      <div className="docs-layout">
        <aside>
          <strong>Get started</strong>
          <a href="#quickstart">Declarative HTML</a>
          <a href="#javascript">JavaScript API</a>
          <a href="#server">Server verification</a>
          <strong>Build safely</strong>
          <a href="#testing">Test keys</a>
          <a href="#security">Security rules</a>
        </aside>

        <article className="docs-content">
          <section id="quickstart">
            <p className="docs-kicker">01 · Browser</p>
            <h2>Declarative HTML</h2>
            <p>
              The script automatically renders every <code>.trust-captcha</code>
              element and adds a hidden <code>trustcaptcha-response</code> field
              to the surrounding form.
            </p>
            <CodeBlock label="HTML" code={htmlSnippet} />
          </section>

          <section id="javascript">
            <p className="docs-kicker">02 · Browser API</p>
            <h2>Explicit rendering</h2>
            <p>
              Use explicit rendering for SPAs and custom form lifecycles. The
              global API also exposes <code>execute</code>, <code>reset</code>,
              <code>remove</code> and <code>getResponse</code>.
            </p>
            <CodeBlock label="JavaScript" code={javascriptSnippet} />
          </section>

          <section id="server">
            <p className="docs-kicker">03 · Your server</p>
            <h2>Verify before the protected action</h2>
            <p>
              Your Secret Key must never enter browser code. Verification is
              action-bound and tokens are atomically consumed once.
            </p>
            <CodeBlock label="Node.js" code={nodeSnippet} />
            <div className="docs-callout">
              Direct HTTP: <code>POST {apiBaseUrl}/api/v1/verify</code>
              with JSON <code>{`{"action":"signup","token":"tc1..."}`}</code>
              and <code>Authorization: Bearer YOUR_SECRET_KEY</code>.
            </div>
          </section>

          <section id="testing">
            <p className="docs-kicker">04 · CI and staging</p>
            <h2>Deterministic test keys</h2>
            <p>
              Test keys never provide bot protection. Keep them out of
              production configuration. The pass and fail Site Keys work on any
              HTTP(S) origin and can only be verified by the matching test
              secret.
            </p>
            <dl className="test-key-grid">
              <div>
                <dt>Always pass Site Key</dt>
                <dd>
                  <code>{TRUSTCAPTCHA_TEST_SITE_KEY_PASS}</code>
                </dd>
              </div>
              <div>
                <dt>Always fail Site Key</dt>
                <dd>
                  <code>{TRUSTCAPTCHA_TEST_SITE_KEY_FAIL}</code>
                </dd>
              </div>
              <div>
                <dt>Test Secret</dt>
                <dd>
                  <code>{TRUSTCAPTCHA_TEST_SECRET}</code>
                </dd>
              </div>
            </dl>
          </section>

          <section id="security">
            <p className="docs-kicker">05 · Security</p>
            <h2>Integration requirements</h2>
            <ul className="docs-checklist">
              <li>Keep Secret Keys only in a server-side secret manager.</li>
              <li>
                Use a distinct action for login, signup, password reset and
                payment.
              </li>
              <li>Reject failures, expired tokens and replayed tokens.</li>
              <li>Never treat the browser callback alone as authorization.</li>
              <li>Rotate a Secret immediately if it is exposed.</li>
            </ul>
          </section>

          <section id="reference">
            <p className="docs-kicker">Reference</p>
            <h2>Widget options</h2>
            <div className="reference-table" role="table">
              {[
                ["data-sitekey", "Required public Site Key"],
                ["data-action", "Protected action; defaults to generic"],
                [
                  "data-mode",
                  "managed, checkbox, invisible, or non-interactive",
                ],
                ["data-language", "auto or a supported locale"],
                ["data-callback", "Global function called with the token"],
                ["data-error-callback", "Global function called with an error"],
                ["data-expired-callback", "Called when the token expires"],
                ["data-response-field", "Custom hidden input name"],
              ].map(([name, description]) => (
                <div role="row" key={name}>
                  <code role="cell">{name}</code>
                  <span role="cell">{description}</span>
                </div>
              ))}
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}

function CodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <div className="docs-code">
      <div>
        <span>{label}</span>
        <small>Copy into your application</small>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}
