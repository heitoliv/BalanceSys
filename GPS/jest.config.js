/** Configuração do Jest com ts-jest para os testes em TypeScript. */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  clearMocks: true,
};
