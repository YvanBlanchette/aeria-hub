import { LocaleProvider } from "@/components/i18n/locale-provider";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import "./globals.css";

const fontVariables = "[--app-font-sans:'Segoe_UI',sans-serif] [--app-font-mono:'Cascadia_Code','Consolas',monospace]";

export const metadata = {
	title: "ÆRIA Hub",
	description: "Travel agency CRM to manage clients, trips, and itineraries in one place.",
	manifest: "/manifest.webmanifest",
	applicationName: "ÆRIA Hub",
	icons: {
		icon: [{ url: "/icon-192.png", type: "image/png" }],
		apple: [{ url: "/apple-touch-icon.png", type: "image/png" }],
	},
};

export const viewport = {
	themeColor: "#0b4f6c",
};

export default function RootLayout({ children }) {
	return (
		<html
			lang="en"
			suppressHydrationWarning
			className={`${fontVariables} h-full antialiased`}
		>
			<head>
				<meta
					name="apple-mobile-web-app-title"
					content="ÆRIA Hub"
				/>
			</head>
			<body
				className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/20 selection:text-foreground"
				suppressHydrationWarning
			>
				<div
					aria-hidden="true"
					className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(232,163,61,0.14),transparent_34%),radial-gradient(circle_at_top_right,rgba(11,79,108,0.12),transparent_28%),linear-gradient(to_bottom,rgba(255,255,255,0.7),transparent_18%)]"
				/>
				<RegisterServiceWorker />
				<LocaleProvider>{children}</LocaleProvider>
			</body>
		</html>
	);
}
