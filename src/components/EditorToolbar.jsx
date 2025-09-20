import { useMemo } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Redo,
  Underline,
  Undo
} from 'lucide-react';

const ToolbarButton = ({ icon: Icon, label, onClick, isActive }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-1 rounded px-2 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-200 ${
      isActive ? 'bg-slate-200' : ''
    }`}
    aria-label={label}
    title={label}
  >
    <Icon className="h-4 w-4" />
  </button>
);

const EditorToolbar = ({ onCommand, selectionState }) => {
  const blockOptions = useMemo(
    () => [
      { label: 'Normal text', value: 'p' },
      { label: 'Title', value: 'h1' },
      { label: 'Subheading', value: 'h2' },
      { label: 'Small heading', value: 'h3' }
    ],
    []
  );

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-[#dadce0] bg-[#f8f9fa] px-3 py-2 text-slate-700">
      <div className="flex items-center gap-1">
        <ToolbarButton icon={Undo} label="Undo" onClick={() => onCommand('undo')} />
        <ToolbarButton icon={Redo} label="Redo" onClick={() => onCommand('redo')} />
      </div>

      <div className="h-6 w-px bg-[#dadce0]" aria-hidden />

      <select
        className="rounded border border-[#dadce0] bg-white px-2 py-1 text-sm text-slate-700 shadow-sm focus:border-sky-500 focus:outline-none"
        value={selectionState?.blockType || 'p'}
        onChange={(event) => onCommand('formatBlock', event.target.value)}
        aria-label="Text style"
      >
        {blockOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1">
        <ToolbarButton
          icon={Bold}
          label="Bold"
          onClick={() => onCommand('bold')}
          isActive={selectionState?.bold}
        />
        <ToolbarButton
          icon={Italic}
          label="Italic"
          onClick={() => onCommand('italic')}
          isActive={selectionState?.italic}
        />
        <ToolbarButton
          icon={Underline}
          label="Underline"
          onClick={() => onCommand('underline')}
          isActive={selectionState?.underline}
        />
        <ToolbarButton
          icon={Highlighter}
          label="Highlight"
          onClick={() => onCommand('backColor', '#fff475')}
          isActive={selectionState?.highlight}
        />
      </div>

      <div className="flex items-center gap-1">
        <ToolbarButton icon={AlignLeft} label="Align left" onClick={() => onCommand('justifyLeft')} />
        <ToolbarButton icon={AlignCenter} label="Align centre" onClick={() => onCommand('justifyCenter')} />
        <ToolbarButton icon={AlignRight} label="Align right" onClick={() => onCommand('justifyRight')} />
      </div>

      <div className="flex items-center gap-1">
        <ToolbarButton icon={List} label="Bulleted list" onClick={() => onCommand('insertUnorderedList')} />
        <ToolbarButton icon={ListOrdered} label="Numbered list" onClick={() => onCommand('insertOrderedList')} />
      </div>

      <div className="h-6 w-px bg-[#dadce0]" aria-hidden />

      <button
        type="button"
        onClick={() => onCommand('removeFormat')}
        className="rounded border border-[#dadce0] px-3 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
      >
        Clear formatting
      </button>
    </div>
  );
};

export default EditorToolbar;
