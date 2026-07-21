import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata = {
	title: "ÆRIA Hub",
	description: "Travel agency CRM to manage clients, trips, and itineraries in one place.",
};

export default function RootLayout({ children }) {
	return (
		<html
			lang="en"
			suppressHydrationWarning
			className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
					className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(232,163,61,0.14),transparent_34%),radial-gradient(circle_at_top_right,rgba(11,79,108,0.12),transparent_28%),linear-gradient(to_bottom,rgba(255,255,255,0.7),transparent_18%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(232,163,61,0.08),transparent_30%),radial-gradient(circle_at_top_right,rgba(62,150,190,0.1),transparent_26%),linear-gradient(to_bottom,rgba(255,255,255,0.03),transparent_18%)]"
				/>
				<ThemeProvider
					attribute="class"
					defaultTheme="light"
					enableSystem={false}
					disableTransitionOnChange
				>
					{children}
				</ThemeProvider>
			</body>
		</html>
	);
}
