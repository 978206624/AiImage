import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-bg">
      <p className="text-7xl font-light text-accent mb-4">404</p>
      <h1 className="text-xl font-medium text-fg mb-2">页面不存在</h1>
      <p className="text-sm text-muted mb-8 max-w-sm">
        你访问的页面可能已被移除，或者地址输入有误。
      </p>
      <Link
        href="/"
        className="px-6 py-2.5 bg-accent text-bg text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
      >
        返回首页
      </Link>
    </div>
  );
}
