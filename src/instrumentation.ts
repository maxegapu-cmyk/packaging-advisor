/** Runs once when the Next.js server starts: prepare the database and print the first admin code. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initApp } = await import("./lib/init");
    initApp();
  }
}
