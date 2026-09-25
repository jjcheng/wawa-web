import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	allowedDevOrigins: ["192.168.5.109"],
	images: {
		localPatterns: [
			{
				pathname: "/logo-*.png",
				search: "?v=2",
			},
		],
	},
};

export default nextConfig;
