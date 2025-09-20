const PredictiveSuggestions = ({ suggestions, onSelect }) => {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute bottom-6 left-0 right-0 flex justify-center px-10">
      <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-full border border-[#dadce0] bg-[#f1f3f4]/90 px-4 py-2 shadow">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSelect(suggestion)}
            className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-sky-100"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PredictiveSuggestions;
