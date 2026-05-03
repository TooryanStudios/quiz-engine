export const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

export const escapeRegex = (text: string): string => {
  return text.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
};

export const extractText = (node: Node, isRoot = true): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    if (el.dataset.mentionKey) {
      return `@${el.dataset.mentionKey}`;
    }
    if (el.nodeName === 'BR') {
      return '\n';
    }
    if (el.nodeName === 'DIV') {
      let res = '';
      for (let i = 0; i < el.childNodes.length; i++) {
        res += extractText(el.childNodes[i], false);
      }
      return (isRoot ? '' : '\n') + res;
    }
    let res = '';
    for (let i = 0; i < el.childNodes.length; i++) {
      res += extractText(el.childNodes[i], false);
    }
    return res;
  }
  return '';
};

export const getCaretOffset = (root: HTMLElement): number => {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);

  let offset = 0;
  let found = false;

  const traverse = (node: Node) => {
    if (found) return;

    if (node === range.startContainer) {
      if (node.nodeType === Node.TEXT_NODE) {
        offset += range.startOffset;
      }
      found = true;
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      offset += (node.textContent || '').length;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.dataset.mentionKey) {
        offset += (`@${el.dataset.mentionKey}`).length;
      } else if (el.nodeName === 'BR') {
        offset += 1;
      } else if (el.nodeName === 'DIV') {
        if (node !== root) offset += 1;
        for (const child of Array.from(node.childNodes)) traverse(child);
      } else {
        for (const child of Array.from(node.childNodes)) traverse(child);
      }
    }
  };

  traverse(root);
  return offset;
};

export const setCaretOffset = (root: HTMLElement, targetOffset: number): void => {
  let currentOffset = 0;
  let found = false;
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();

  const traverse = (node: Node) => {
    if (found) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const len = (node.textContent || '').length;
      if (currentOffset + len >= targetOffset) {
        range.setStart(node, targetOffset - currentOffset);
        range.collapse(true);
        found = true;
      } else {
        currentOffset += len;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.dataset.mentionKey) {
        const len = (`@${el.dataset.mentionKey}`).length;
        if (currentOffset + len >= targetOffset) {
          range.setStartAfter(node);
          range.collapse(true);
          found = true;
        } else {
          currentOffset += len;
        }
      } else if (el.nodeName === 'BR') {
        if (currentOffset + 1 >= targetOffset) {
          range.setStartAfter(node);
          range.collapse(true);
          found = true;
        } else {
          currentOffset += 1;
        }
      } else if (el.nodeName === 'DIV') {
        if (node !== root) {
          if (currentOffset + 1 >= targetOffset) {
            range.setStartAfter(node);
            range.collapse(true);
            found = true;
          } else {
            currentOffset += 1;
          }
        }
        if (!found) {
          for (const child of Array.from(node.childNodes)) traverse(child);
        }
      } else {
        for (const child of Array.from(node.childNodes)) traverse(child);
      }
    }
  };

  traverse(root);
  if (!found) {
    range.selectNodeContents(root);
    range.collapse(false);
  }
  sel.removeAllRanges();
  sel.addRange(range);
};
