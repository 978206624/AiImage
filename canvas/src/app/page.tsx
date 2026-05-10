export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1
          className="text-4xl font-light tracking-tight mb-4"
          style={{ fontFamily: "var(--font-d)" }}
        >
          CAN<span style={{ color: "var(--accent)" }}>◈</span>VAS
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "14px" }}>
          AI 图像画廊 · 开发中
        </p>
      </div>
    </main>
  );
}
