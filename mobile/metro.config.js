// Общий код (туры, переводы, вход, api) берётся из ../src — тот же, что у веб-версии.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const root = path.resolve(__dirname, "..");
const config = getDefaultConfig(__dirname);

config.watchFolders = [path.join(root, "src")];

const SRC = path.join(root, "src") + path.sep;
const SUPABASE = path.join(__dirname, "lib", "supabase.js");
const base = config.resolver.resolveRequest;
config.resolver.resolveRequest = (ctx, name, platform) => {
  if (name === "lucide-react") name = "lucide-react-native"; // те же имена иконок
  // src/supabase.js читает import.meta.env (Vite) — подменяем на мобильный клиент
  const fromSrc = ctx.originModulePath.startsWith(SRC);
  if (fromSrc && name === "./supabase") return { type: "sourceFile", filePath: SUPABASE };
  // пакеты для ../src ищем в mobile/node_modules, иначе подхватится веб-React второй копией
  if (fromSrc && !name.startsWith(".")) ctx = { ...ctx, originModulePath: path.join(__dirname, "index.js") };
  return (base || ctx.resolveRequest)(ctx, name, platform);
};

module.exports = config;
