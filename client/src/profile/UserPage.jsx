import TweetList from '../feed/TweetList';

function UserPage({ email, search, onSearchChange, onBack, onAuthorClick, onOpenPost }) {
  const header = (
    <div className="profile">
      <button onClick={onBack}>← Назад</button>
      <div className="profile-info">
        <div className="avatar avatar-big">{email[0]?.toUpperCase()}</div>
        <div>
          <h2 className="profile-name">{email}</h2>
          <p className="hint">Посты пользователя</p>
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
