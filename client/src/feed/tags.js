export function collectTags(tags, draft) {
  return [...new Set([...tags, ...draft.split(/[\s,]+/)]
    .map(tag => tag.trim().replace(/^#+/, '').toLowerCase().normalize('NFC'))
    .filter(Boolean)
    .map(tag => '#' + tag))];
}
