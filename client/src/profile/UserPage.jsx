import { useEffect, useState } from 'react';
import UserAvatar from '../components/UserAvatar';
import { fetchPublicProfileAPI } from '../api';
import TweetList from '../feed/TweetList';

function UserPage({ email, search, onSearchChange, onBack, onAuthorClick, onOpenPost }) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchPublicProfileAPI(email, controller.signal).then(({ data }) => {
      setProfile(data);
    }).catch(() => {});
    return () => controller.abort();
  }, [email]);

  const header = (
    <div className="profile">
      <button onClick={onBack}>← Назад</button>
      <div className="profile-info">
        <UserAvatar email={email} className="avatar-big" />
        <div>
          <h2 className="profile-name">{email}</h2>
          <p className="profile-status">{profile?.email === email && profile.status ? profile.status : 'Посты пользователя'}</p>
        </div>
      </div>
    </div>
  );

  return (
    <TweetList
      key={email}
      author={email}
      header={header}
      showForm={false}
      showSort
      search={search}
      onSearchChange={onSearchChange}
      onAuthorClick={onAuthorClick}
      onOpenPost={onOpenPost}
    />
  );
}

export default UserPage;
