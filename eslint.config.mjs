import nextVitals from "eslint-config-next/core-web-vitals";

const config = [...nextVitals, { ignores: [".claude/**", ".next-validation/**", ".next-local/**", ".local/**"] }];

export default config;
