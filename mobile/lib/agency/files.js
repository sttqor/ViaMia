import { Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { File } from "expo-file-system";
import { docUrl } from "../../../src/agency/agency-api";

// Телефонная замена <input type="file"> и compressImage.js: выбрать файл, ужать картинку
// (по длинной стороне, JPEG 0.82) и отдать { name, type, size, uri, body } — его принимают
// uploadPhoto / uploadDoc из src/agency/agency-api.js.

const MAX_DOC = 10 * 1024 * 1024;

async function prepare({ uri, name, type }, maxSide) {
  if (type?.startsWith("image/")) {
    const img = await ImageManipulator.manipulate(uri, { maxWidth: maxSide, maxHeight: maxSide }).renderAsync();
    const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.82 });
    uri = out.uri;
    name = (name || "photo").replace(/\.\w+$/, "") + ".jpg";
    type = "image/jpeg";
  }
  const body = await new File(uri).arrayBuffer();
  return { name: name || "file.bin", type: type || "application/octet-stream", size: body.byteLength, uri, body };
}

// фото из галереи (тур, гид, логотип)
export async function pickImages({ multiple = false, limit = 1 } = {}) {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: multiple, selectionLimit: limit, quality: 1 });
  if (res.canceled) return [];
  return Promise.all(res.assets.slice(0, limit).map((a) => prepare({ uri: a.uri, name: a.fileName, type: a.mimeType || "image/jpeg" }, 1600)));
}

// документы агентства: фото или PDF до 10 МБ
export async function pickDocs(limit) {
  const res = await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"], multiple: true, copyToCacheDirectory: true });
  if (res.canceled) return [];
  // некоторые провайдеры на Android не отдают mimeType — берём по расширению; бакет принимает только фото и PDF
  const typeOf = (a) => a.mimeType || (/\.pdf$/i.test(a.name || "") ? "application/pdf" : /\.(jpe?g|png|webp|heic|heif)$/i.test(a.name || "") ? "image/jpeg" : null);
  const ok = res.assets.filter((a) => (!a.size || a.size <= MAX_DOC) && typeOf(a)).slice(0, limit);
  return Promise.all(ok.map((a) => prepare({ uri: a.uri, name: a.name, type: typeOf(a) }, 2400)));
}

// документ из приватного бакета — по временной ссылке в браузере телефона
export async function openDoc(path) {
  try {
    await Linking.openURL(await docUrl(path));
  } catch (err) {
    console.warn("Документ не открылся", err);
  }
}
