// src/componentes/TipTapEditor.jsx	
import React from 'react';
import { EditorProvider, FloatingMenu, BubbleMenu, useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Box, Paper, Typography, IconButton, Tooltip } from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import CodeIcon from '@mui/icons-material/Code';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import CharacterCount from '@tiptap/extension-character-count'; // Import CharacterCount
// Consider adding more imports for headings, blockquotes etc. if needed

const extensions = [
  StarterKit.configure({
    // You can configure extensions here if needed
    // For example, to disable some tools from the starter kit:
    // heading: false, 
    // blockquote: false,
  }),
  CharacterCount, // Add CharacterCount extension
  // Add more extensions if you want, e.g., Underline, Link, etc.
  // Tiptap has many extensions available.
];

const TipTapMenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        alignItems: 'center', 
        p: 1, 
        borderBottom: 1, 
        borderColor: 'divider',
        gap: 0.5 // Spacing between buttons
      }}
    >
      <Tooltip title="Bold">
        <IconButton onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'is-active' : ''} size="small">
          <FormatBoldIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Italic">
        <IconButton onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'is-active' : ''} size="small">
          <FormatItalicIcon />
        </IconButton>
      </Tooltip>
      {/* Add more buttons for other StarterKit features as needed */}
      <Tooltip title="Strikethrough">
        <IconButton onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editor.can().chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'is-active' : ''} size="small">
          <StrikethroughSIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Bullet List">
        <IconButton onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'is-active' : ''} size="small">
          <FormatListBulletedIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Numbered List">
        <IconButton onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive('orderedList') ? 'is-active' : ''} size="small">
          <FormatListNumberedIcon />
        </IconButton>
      </Tooltip>
       <Tooltip title="Code Block">
        <IconButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={editor.isActive('codeBlock') ? 'is-active' : ''} size="small">
          <CodeIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Blockquote">
        <IconButton onClick={() => editor.chain().focus().toggleBlockquote().run()} className={editor.isActive('blockquote') ? 'is-active' : ''} size="small">
          <FormatQuoteIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Horizontal Rule">
        <IconButton onClick={() => editor.chain().focus().setHorizontalRule().run()} size="small">
          <HorizontalRuleIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Undo">
        <IconButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} size="small">
          <UndoIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Redo">
        <IconButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} size="small">
          <RedoIcon />
        </IconButton>
      </Tooltip>
      {/* Example for headings (you might want a dropdown for this) */}
      <Tooltip title="Heading 1">
        <IconButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''} size="small">
          H1
        </IconButton>
      </Tooltip>
       <Tooltip title="Heading 2">
        <IconButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''} size="small">
          H2
        </IconButton>
      </Tooltip>
    </Box>
  );
};

const TipTapEditor = ({ value, onChange, disabled = false, placeholder = 'Escribe algo...' }) => {
  const editor = useEditor({
    extensions,
    content: value || '', // Initial content
    editable: !disabled,
    onUpdate: ({ editor }) => {
      // When the content changes, get HTML and call onChange
      onChange(editor.getHTML());
    },
  });

  // Update editor content if the external `value` prop changes
  // This is important if the parent component updates the content programmatically
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', false); // false to avoid emitting update again
    }
  }, [value, editor]);
  
  // Update editable state if `disabled` prop changes
  React.useEffect(() => {
    if (editor) {
        editor.setEditable(!disabled);
    }
  }, [disabled, editor]);


  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        borderColor: 'rgba(0, 0, 0, 0.23)', // Mimic TextField border
        borderRadius: 1, // Mimic TextField border radius
        '&:hover': {
          borderColor: 'rgba(0, 0, 0, 0.87)', // Mimic TextField hover border
        },
        '&.Mui-focused': { // This class might not be directly applicable, focus is on internal editor
          borderColor: 'primary.main',
          borderWidth: 2,
        },
        opacity: disabled ? 0.7 : 1, // Visual cue for disabled state
        backgroundColor: disabled ? 'action.disabledBackground' : 'transparent',
      }}
    >
      {editor && <TipTapMenuBar editor={editor} />}
      <Box
        sx={{
          p: 1.5, // Padding for the content area
          minHeight: '150px', // Minimum height for the editor
          overflowY: 'auto',
          '& .ProseMirror': {
            outline: 'none', // Remove default outline
            '&:focus-visible': { // For keyboard navigation focus
                // Add custom focus styles if needed, though direct focus might be tricky to style from here
            },
            '& p.is-editor-empty:first-of-type::before': { // Placeholder CSS
              content: `"${placeholder}"`,
              float: 'left',
              color: '#adb5bd',
              pointerEvents: 'none',
              height: 0,
            },
          }
        }}
      >
        <EditorContent editor={editor} />
      </Box>
      {editor && (
        <Box sx={{ p: 1, textAlign: 'right', fontSize: '0.75rem', color: 'text.secondary', borderTop: 1, borderColor: 'divider' }}>
          {editor.storage.characterCount.characters()} characters
          {/* Optionally, add word count: | {editor.storage.characterCount.words()} words */}
        </Box>
      )}
      {/* 
      It's good practice to destroy the editor instance when the component unmounts
      to prevent memory leaks. useEditor handles this automatically.
      */}
    </Paper>
  );
};

export default TipTapEditor;
