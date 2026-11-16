import { useEffect, useState } from 'react';
import { avatarURL, fetchMyProfileAPI, saveProfileAPI } from '../api';
import useObjectURLs from '../hooks/useObjectURLs';
import UserAvatar from '../components/UserAvatar';
import AvatarEditor, { CameraIcon } from './AvatarEditor';

export default function MyProfilePage({ version, onSaved }) {
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const { createURL, releaseURL } = useObjectURLs();
  const [remove, setRemove] = useState(false);
  const [photoEditor, setPhotoEditor] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchMyProfileAPI(controller.signal).then(({ data }) => {
      setProfile(data.user);
      setStatus(data.user.status);
    }).catch(() => {
      if (!controller.signal.aborted) setError('Не удалось загрузить профиль.');
    });
    return () => controller.abort();
  }, [attempt]);

  function clearPhotoDraft() {
    releaseURL(preview);
    setFile(null);
    setPreview('');
  }

  function reset() {
    setStatus(profile.status);
    clearPhotoDraft();
    setRemove(false);
    setError('');
    setEditing(false);
  }

  async function save(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    const data = new FormData();
    data.set('status', status);
    if (file) data.set('avatar', file);
    else if (remove) data.set('removeAvatar', 'true');
    try {
      const result = await saveProfileAPI(data);
      setProfile(result.data);
      setStatus(result.data.status);
      clearPhotoDraft();
      setRemove(false);
      setEditing(false);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Не удалось сохранить профиль.');
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return <section className="profile-settings">
      {error ? <><p role="alert">{error}</p><button type="button" onClick={() => {
        setError('');
        setAttempt(value => value + 1);
      }}>Повторить</button></> : <p>Загрузка профиля…</p>}
    </section>;
  }

  const avatarButton = (
    <button type="button" className="profile-avatar-button" aria-label="Изменить фото профиля"
      title="Изменить фото профиля" disabled={saving} onClick={() => setPhotoEditor(true)}>
      {file && preview ? <span className="avatar avatar-big"><img src={preview} alt="" /></span>
        : remove ? <span className="avatar avatar-big">{profile.email[0]?.toUpperCase()}</span>
        : <UserAvatar email={profile.email} version={version} className="avatar-big" as="span" />}
      <span className="profile-avatar-overlay"><CameraIcon /></span>
    </button>
  );

  return (
    <section className="profile-settings">
      <h2>Профиль</h2>
      {editing ? (
        <form className="form" onSubmit={save}>
          <div className="profile-avatar-editor">
            {avatarButton}
            <button type="button" className="btn-outline" disabled={saving} onClick={() => setPhotoEditor(true)}>
              Выбрать фото
            </button>
            {(file || (profile.hasAvatar && !remove)) && <button type="button" disabled={saving} onClick={() => {
              setRemove(!file || !profile.hasAvatar);
              clearPhotoDraft();
              setError('');
            }}>{file ? 'Убрать выбранное фото' : 'Удалить аватарку'}</button>}
          </div>
          <label>
            Статус
            <input value={status} maxLength={120} disabled={saving} onChange={e => setStatus(e.target.value)} />
          </label>
          <span className="hint">{status.length}/120</span>
          {error && <p className="error" role="alert">{error}</p>}
          <div>
            <button type="submit" className="btn-main" disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить'}</button>
            <button type="button" disabled={saving} onClick={reset}>Отмена</button>
          </div>
        </form>
      ) : (
        <>
          <div className="profile-info">
            {avatarButton}
            <div>
              <b>{profile.email}</b>
              <p className="profile-status">{profile.status || 'Статус не указан'}</p>
            </div>
          </div>
          <button type="button" className="btn-outline" onClick={() => setEditing(true)}>Редактировать профиль</button>
        </>
      )}
      {photoEditor && <AvatarEditor
        initialURL={file ? preview : profile.hasAvatar && !remove ? avatarURL(profile.email, version) : ''}
        onClose={() => setPhotoEditor(false)}
        onApply={image => {
          setPhotoEditor(false);
          setRemove(false);
          releaseURL(preview);
          setFile(image);
          setPreview(createURL(image));
          setEditing(true);
          setError('');
        }} />}
    </section>
  );
}
