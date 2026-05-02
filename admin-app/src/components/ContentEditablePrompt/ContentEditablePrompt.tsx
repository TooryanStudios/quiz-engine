import React, { useRef, useEffect, useCallback } from 'react';
import type { ResolvedMentionReference } from './types';
import { escapeHtml, escapeRegex, extractText, getCaretOffset, setCaretOffset } from './utils';

interface ContentEditablePromptProps {
  value: string;
  placeholder?: string;
  resolvedReferences: ResolvedMentionReference[];
  onChange: (value: string, cursorOffset: number) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onKeyUp?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  className?: string;
}

export const ContentEditablePrompt = React.forwardRef<HTMLDivElement, ContentEditablePromptProps>(({
  value,
  placeholder,
  resolvedReferences,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  onKeyUp,
  onClick,
  className,
}, forwardedRef) => {
  const innerRef = useRef<HTMLDivElement>(null);
  const containerRef = (forwardedRef as React.MutableRefObject<HTMLDivElement>) || innerRef;
  const lastEmittedValue = useRef<string>(value);

  const generateHtml = useCallback((text: string, refs: ResolvedMentionReference[]) => {
    let html = escapeHtml(text);
    html = html.replace(/\n/g, '<br>');

    const sortedRefs = [...refs].sort((a, b) => b.mention.length - a.mention.length);

    sortedRefs.forEach(ref => {
      const escapedMention = escapeRegex(ref.mention);
      const regex = new RegExp(`(${escapedMention})(?!\\w)`, 'g');

      const thumbHtml = ref.kind === 'video'
        ? `<video src="${ref.thumbUrl || ref.url}" class="lab-prompt-inline-preview-thumb" muted playsinline preload="metadata"></video>`
        : `<img src="${ref.thumbUrl || ref.url}" alt="${escapeHtml(ref.name)}" class="lab-prompt-inline-preview-thumb" />`;

      const chipHtml =
        `<span contenteditable="false" data-mention-key="${ref.mention.slice(1)}" class="lab-prompt-inline-preview-item" style="margin: 0 4px; cursor: default;">` +
        thumbHtml +
        `<span class="lab-prompt-inline-preview-label">${escapeHtml(ref.name)}</span>` +
        `</span>`;

      html = html.replace(regex, chipHtml);
    });

    return html;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const currentText = extractText(el);
    if (value !== currentText) {
      const offset = document.activeElement === el ? getCaretOffset(el) : null;
      el.innerHTML = generateHtml(value, resolvedReferences);
      lastEmittedValue.current = value;
      if (offset !== null) {
        setCaretOffset(el, offset);
      }
    }
  }, [value, resolvedReferences, generateHtml, containerRef]);

  const handleInput = () => {
    const el = containerRef.current;
    if (!el) return;
    const text = extractText(el);
    if (text !== lastEmittedValue.current) {
      lastEmittedValue.current = text;
      const offset = getCaretOffset(el);
      onChange(text, offset);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (onKeyDown) onKeyDown(e);
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (onKeyUp) onKeyUp(e);
    handleInput();
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) onClick(e);
    const el = containerRef.current;
    if (el) {
      onChange(extractText(el), getCaretOffset(el));
    }
  };

  return (
    <div
      ref={containerRef}
      contentEditable
      className={className}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onClick={handleClick}
      onFocus={onFocus}
      onBlur={onBlur}
      role="textbox"
      aria-multiline="true"
      aria-placeholder={placeholder}
      data-placeholder={placeholder}
      suppressContentEditableWarning
    />
  );
});

