export default function manifest() {
	return {
		name: "ÆRIA Hub",
		short_name: "ÆRIA",
		description: "Travel agency CRM to manage clients, trips, and itineraries in one place.",
		start_url: "/",
		display: "standalone",
		background_color: "#f4f6f8",
		theme_color: "#0b4f6c",
		lang: "fr",
		icons: [
			{
				src: "/icon-192.png",
				sizes: "192x192",
				type: "image/png",
			},
			{
				src: "/icon-512.png",
				sizes: "512x512",
				type: "image/png",
			},
			{
				src: "/icon-512-maskable.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable any",
			},
		],
	};
}
