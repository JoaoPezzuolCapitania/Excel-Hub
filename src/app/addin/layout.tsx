import { SessionProvider } from "next-auth/react";
import "@/app/globals.css";
import Script from "next/script";

export const metadata = {
  title: "ExcelHub Add-in",
};

export default function AddinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <Script
        src="https://appsforoffice.microsoft.com/lib/1.1/hosted/office.js"
        strategy="afterInteractive"
      />
      <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        {children}
      </div>
    </SessionProvider>
  );
}
