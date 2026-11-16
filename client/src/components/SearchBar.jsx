import { SearchIcon } from './Icons';

function SearchBar({ value, onChange }) {
  return (
    <div className="topbar">
      <div className="search-bar">
        <SearchIcon />
        <input
          type="text"
          placeholder="Поиск по твитам"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
        {value && (
          <button className="search-clear" onClick={() => onChange('')} title="Очистить">
            ×
          </button>
        )}
      </div>
    </div>
  );
}

export default SearchBar;
