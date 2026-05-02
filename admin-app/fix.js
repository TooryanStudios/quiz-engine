const fs = require('fs');
let code = fs.readFileSync('src/components/ContentEditablePrompt/utils.ts', 'utf8');
code = code.replace(/export const extractText[\s\S]*?(?=export const getCaretOffset)/, "export const extractText = (node: Node, isRoot: boolean = true): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent || '').replace(/\\u00A0/g, ' ');
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    if (el.dataset.mentionKey) {
      return '@' + el.dataset.mentionKey;
    }
    if (el.nodeName === 'BR') {
      return '\\n';
    }
    if (el.nodeName === 'DIV') {
      let res = '';
      for (let i = 0; i < el.childNodes.length; i++) {
        res += extractText(el.childNodes[i], false);
      }
      return isRoot ? res : '\\n' + res;
    }
    let res = '';
    for (let i = 0; i < el.childNodes.length; i++) {
      res += extractText(el.childNodes[i], false);
    }
    return res;
  }
  return '';
};

");
fs.writeFileSync('src/components/ContentEditablePrompt/utils.ts', code);
