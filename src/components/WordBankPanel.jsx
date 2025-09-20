import { useMemo, useState } from 'react';

const WordBankPanel = ({ categories, onInsertWord }) => {
  const categoryKeys = useMemo(() => Object.keys(categories), [categories]);
  const [activeCategory, setActiveCategory] = useState(categoryKeys[0]);
  const [searchTerm, setSearchTerm] = useState('');

  const wordsToShow = useMemo(() => {
    const words = categories[activeCategory] || [];
    if (!searchTerm) {
      return words;
    }
    return words.filter((word) => word.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [categories, activeCategory, searchTerm]);

  return (
    <aside className="flex h-full w-full flex-col">
      <div className="border-b border-[#dadce0] bg-[#f8f9fa] px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-700">Word bank</h2>
        <p className="text-xs text-slate-500">Tap a word or phrase to add it to the document.</p>
      </div>

      <div className="border-b border-[#dadce0] px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {categoryKeys.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => {
                setActiveCategory(category);
                setSearchTerm('');
              }}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                activeCategory === category
                  ? 'border-sky-500 bg-sky-100 text-sky-800'
                  : 'border-[#dadce0] bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search words..."
          className="mt-3 w-full rounded border border-[#dadce0] px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-sky-500 focus:outline-none"
        />
      </div>

      <div className="flex-1 overflow-auto px-4 py-4">
        {wordsToShow.length === 0 ? (
          <p className="text-sm text-slate-500">No words found. Try a different search.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {wordsToShow.map((word) => (
              <button
                key={word}
                type="button"
                onClick={() => onInsertWord(word)}
                className="rounded-full border border-[#dadce0] bg-white px-3 py-1 text-sm text-slate-700 shadow-sm transition hover:border-sky-500 hover:bg-sky-50"
              >
                {word}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};

export default WordBankPanel;
