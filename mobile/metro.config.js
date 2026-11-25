// Общий код (туры, переводы, вход, api) берётся из ../src — тот же, что у веб-версии.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const root = path.resolve(__dirname, "..");
const config = getDefaultConfig(__dirname);

config.watchFolders = [path.join(root, "src")];

const SRC = path.join(root, "src") + path.sep;
const SUPABASE = path.join(__dirname, "lib", "supabase.js");
const WEB_SUPABASE = path.join(root, "src", "supabase.js");
const base = config.resolver.resolveRequest;
config.resolver.resolveRequest = (ctx, name, platform) => {
  if (name === "lucide-react") name = "lucide-react-native"; // те же имена иконок
  const fromSrc = ctx.originModulePath.startsWith(SRC);
  // пакеты для ../src ищем в mobile/node_modules, иначе подхватится веб-React второй копией
  if (fromSrc && !name.startsWith(".")) ctx = { ...ctx, originModulePath: path.join(__dirname, "index.js") };
  const res = (base || ctx.resolveRequest)(ctx, name, platform);
  // src/supabase.js читает import.meta.env (Vite) — подменяем на мобильный клиент
  return res.filePath === WEB_SUPABASE ? { type: "sourceFile", filePath: SUPABASE } : res;
};

module.exports = config;
