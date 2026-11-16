import { collectTags } from './tags';

export default function TagInput({ tags, draft, onChange, onDraftChange }) {
  function addTags() {
    onChange(collectTags(tags, draft));
    onDraftChange('');
  }

  return (
    <div className="tag-editor">
      {tags.length > 0 && (
        <div className="tags">
          {tags.map(tag => (
            <button key={tag} type="button" className="tag"
              aria-label={`Удалить тег ${tag}`}
              onClick={() => onChange(tags.filter(item => item !== tag))}
            >
              {tag} ×
            </button>
          ))}
        </div>
      )}
      <input
        type="text"
        aria-label="Теги публикации"
        placeholder="Добавить тег и нажать Enter"
        value={draft}
        onChange={e => onDraftChange(e.target.value)}
        onKeyDown={e => {
          if (e.nativeEvent.isComposing || !['Enter', ','].includes(e.key)) return;
          e.preventDefault();
          addTags();
        }}
      />
    </div>
  );
}
