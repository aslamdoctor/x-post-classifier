// Generates src/config.js from environment variable TYPESAFE_API_KEY
const key = process.env.TYPESAFE_API_KEY || "";
const content = `// Auto-generated during build. Do not commit.\nexport const BUILTIN_TYPESAFE_KEY = ${JSON.stringify(key)};\n`;
await Bun.write("src/config.js", content);
console.log("Generated src/config.js");
