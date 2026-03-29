const { getDefaultConfig } = require("expo/metro-config");
const { resolve: metroResolve } = require("metro-resolver");
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
const previousResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, realModuleName, platform, moduleName) => {
  if (realModuleName === "@flashcards/core") {
    return { filePath: coreEntry, type: "sourceFile" };
  }
  if (previousResolveRequest) {
    return previousResolveRequest(context, realModuleName, platform, moduleName);
  }
  return metroResolve(context, realModuleName, platform);
};

module.exports = config;
