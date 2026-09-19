const os = require("os");
const { PrismaClient, Prisma } = require("@prisma/client");

// Shared Prisma Client (MySQL, prod_api_terraterri) - one instance for the whole
// application. Connection comes from the environment only:
//   DATABASE_URL, or - when it is not set - DB_HOST, DB_PORT, DB_DATABASE,
//   DB_USERNAME, DB_PASSWORD (+ optional DB_CONNECTION_LIMIT).

const SHUTDOWN_TIMEOUT_MS = 10000;

const databaseUrl = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const {
    DB_HOST,
    DB_PORT,
    DB_DATABASE,
    DB_USERNAME,
    DB_PASSWORD,
    DB_CONNECTION_LIMIT,
  } = process.env;

  if (!DB_HOST || !DB_DATABASE || !DB_USERNAME) {
    return undefined;
  }

  const params = new URLSearchParams();
  // A path (e.g. Cloud SQL /cloudsql/...) is a Unix socket, not a TCP host
  const isSocket = DB_HOST.startsWith("/");
  if (isSocket) {
    params.set("socket", DB_HOST);
  }
  if (DB_CONNECTION_LIMIT) {
    params.set("connection_limit", DB_CONNECTION_LIMIT);
  }

  const credentials = `${encodeURIComponent(DB_USERNAME)}:${encodeURIComponent(DB_PASSWORD || "")}`;
  const host = isSocket ? "localhost" : `${DB_HOST}:${Number(DB_PORT) || 3306}`;
  const query = params.toString();

  return `mysql://${credentials}@${host}/${encodeURIComponent(DB_DATABASE)}${query ? `?${query}` : ""}`;
};

const createClient = () => {
  const url = databaseUrl();

  return new PrismaClient({
    ...(url ? { datasourceUrl: url } : {}),
    errorFormat: "minimal",
  });
};

// Kept on globalThis so a second load of this file (e.g. a differently cased
// require path on Windows) still reuses the same client and connection pool
const prisma = globalThis.crmPrisma || (globalThis.crmPrisma = createClient());

// No process.exit() here: Node exits by itself once the engine's pending
// callbacks are done (exiting immediately can crash the Prisma engine on Windows)
const disconnectAndExit = async (exitCode) => {
  process.exitCode = exitCode;

  try {
    await prisma.$disconnect();
  } catch (error) {
    console.error("Failed to disconnect Prisma Client:", error.message);
  }
};

// Graceful shutdown on SIGINT / SIGTERM: stop accepting requests, close the
// database connections, then let the process exit (forced after SHUTDOWN_TIMEOUT_MS).

const registerShutdown = (server) => {
  let shuttingDown = false;

  const shutdown = (signal) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;

    const exitCode = 128 + (os.constants.signals[signal] || 0);
    setTimeout(() => process.exit(exitCode), SHUTDOWN_TIMEOUT_MS).unref();

    if (!server) {
      disconnectAndExit(exitCode);
      return;
    }

    server.close(() => disconnectAndExit(exitCode));
    server.closeIdleConnections();
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
};

// Interactive transaction. READ COMMITTED so reads after a row lock see the
// latest committed data (same as the CodeIgniter CRM's locked lead updates).
const runTransaction = async (work) =>
  prisma.$transaction(work, {
    isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    maxWait: 5000,
    timeout: 20000,
  });

module.exports = { prisma, registerShutdown, runTransaction };
