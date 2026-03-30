const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules")
];

const coreEntry = path.resolve(workspaceRoot, "packages/core/src/index.ts");

const upstreamResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform, ...rest) => {
  if (moduleName === "@flashcards/core") {
    return { filePath: coreEntry, type: "sourceFile" };
  }
  if (typeof upstreamResolveRequest === "function") {
    return upstreamResolveRequest(context, moduleName, platform, ...rest);
  }
  if (context != null && typeof context.resolveRequest === "function") {
    return context.resolveRequest(context, moduleName, platform);
  }
  throw new Error(
    `[metro.config] Cannot resolve "${moduleName}": no upstream resolveRequest (Metro / Expo version mismatch).`
  );
};

module.exports = config;
