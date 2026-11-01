import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.js"],
    include: ["tests/**/*.test.js"],
    testTimeout: 30000,
    hookTimeout: 180000,
    fileParallelism: false,
    sequence: { concurrent: false },
    pool: "forks",
    maxForks: 1,
    minForks: 1,
    reporters: ["default"],
  },
});
