export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem" }}>
      <h1>BFF service</h1>
      <p>
        This app has no end-user UI. It exposes API routes under{" "}
        <code>/api/*</code> for the frontend (apps/web) to call.
      </p>
      <p>
        See <code>/api/health</code>.
      </p>
    </main>
  );
}
