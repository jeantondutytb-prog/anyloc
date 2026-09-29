import { Config } from "@remotion/cli/config";

// Reuse the web app's assets (proof screenshots, logo) instead of copying them.
Config.setPublicDir("../../public");
Config.setVideoImageFormat("jpeg");
