import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Camera, ChevronLeft, Trash2, User } from "lucide-react";
import { useSettings } from "../settings-context";
import { useAuth } from "../auth-context";
import { avatarPath, clearAvatars, uploadAvatar } from "../api";
import { SCREEN_IN, TAP } from "../components/shared";
import { Reveal } from "../components/ui.jsx";

// Изменить профиль: фото и имя с фамилией (то же имя подставляется в бронь)
export function ProfileEdit({ account, onSave, onBack }) {
  const { t } = useSettings();
  const { user } = useAuth();
  const [name, setName] = useState(account?.name || "");
  const [avatar, setAvatar] = useState(account?.avatar || "");
  const [busy, setBusy] = useState(null); // null | "photo" | "save"
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  // ушли без сохранения — загруженное фото не нужно, остаётся только сохранённое
  const saved = useRef(false);
  const before = account?.avatar;
  useEffect(
    () => () => {
      if (!saved.current && user) clearAvatars(user.id, avatarPath(before)).catch(() => {});
    },
    [user, before]
  );

  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setBusy("photo");
    setError(null);
    try {
      setAvatar(await uploadAvatar(user.id, file));
    } catch (err) {
      console.warn("Фото профиля не загрузилось", err);
      setError("profile.errPhoto");
    } finally {
      setBusy(null);
    }
  }

  async function save(e) {
    e.preventDefault();
    const n = name.trim().replace(/\s+/g, " ");
    if (n.length < 2) return setError("profile.errName");
    setBusy("save");
    setError(null);
    try {
      await onSave({ name: n, avatar });
      saved.current = true;
      onBack();
    } catch (err) {
      console.warn("Профиль не сохранился", err);
      setError("profile.errSave");
      setBusy(null);
    }
  }

  return (
    <motion.div className="gyg-scroll screen" {...SCREEN_IN}>
      <div className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t("common.back")}>
          <ChevronLeft size={20} />
        </button>
        <b>{t("profile.edit")}</b>
      </div>
      <form className="screen-body profile-edit" onSubmit={save} noValidate>
        <button type="button" className="profile-photo" onClick={() => fileRef.current?.click()} disabled={!!busy} aria-label={t("profile.photoChange")}>
          {avatar ? <img src={avatar} alt="" /> : <User size={40} color="var(--terracotta)" />}
          <span className="profile-photo-cam">
            <Camera size={16} />
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
        <div className="row gap-6 profile-photo-actions">
          <button type="button" className="pill pill-sm" onClick={() => fileRef.current?.click()} disabled={!!busy}>
            {busy === "photo" ? t("profile.photoLoading") : t("profile.photoChange")}
          </button>
          {avatar && (
            <button type="button" className="pill pill-sm" onClick={() => setAvatar("")} disabled={!!busy}>
              <Trash2 size={14} /> {t("profile.photoRemove")}
            </button>
          )}
        </div>

        <label className="profile-label" htmlFor="profile-name">{t("profile.name")}</label>
        <div className="search">
          <User size={18} color="var(--muted-2)" />
          <input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("profile.namePh")}
            autoComplete="name"
            maxLength={80}
          />
        </div>
        <p className="muted t-xs mt-8">{t("profile.nameNote")}</p>

        <Reveal show={!!error}>
          <div className="form-error mt-16" role="alert">{error && t(error)}</div>
        </Reveal>

        <motion.button type="submit" className="cta mt-16" whileTap={TAP} disabled={!!busy}>
          {busy === "save" ? t("profile.saving") : t("profile.save")}
        </motion.button>
      </form>
    </motion.div>
  );
}
