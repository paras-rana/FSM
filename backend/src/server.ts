import { app } from "./app";
import { env } from "./config/env";
import { runBootstrapMigrations } from "./db/bootstrap";

const start = async () => {
  try {
    await runBootstrapMigrations();

    app.listen(env.BACKEND_PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`FSM backend listening on http://localhost:${env.BACKEND_PORT}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Backend startup failed during bootstrap migrations", error);
    process.exit(1);
  }
};

void start();
