process.env.CONTENT_CHECK = "true";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ensureContentSeeded } = require("../lib/lessons");

const run = async () => {
  await ensureContentSeeded();
  console.log("Seeded content.");
};

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
