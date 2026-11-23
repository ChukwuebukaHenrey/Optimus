/**
 * A deliberately small Markdown renderer for repair briefs in the offline report.
 * Everything is escaped first; only headings, bullet and numbered lists, paragraphs and inline code
 * are recognised. No links, images or raw HTML are ever produced, so untrusted text (recorded values
 * from the app under test) cannot inject markup.
 */
const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escape = (value: string) => value.replace(/[&<>"']/gu, (c) => entities[c]);
const inline = (text: string) => escape(text).replace(/`([^`]+)`/gu, '<code>$1</code>');

export function renderMarkdown(source: string): string {
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  let paragraph: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length) out.push(`<p>${paragraph.map(inline).join(' ')}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (const raw of source.replace(/\r\n?/gu, '\n').split('\n')) {
    const line = raw.trimEnd();
    const heading = /^(#{1,3})\s+(.*)$/u.exec(line);
    const bullet = /^\s*[-*]\s+(.*)$/u.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/u.exec(line);
    if (!line.trim()) {
      flushParagraph();
      closeList();
    } else if (heading) {
      flushParagraph();
      closeList();
      const level = Math.min(6, heading[1].length + 3);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    } else if (bullet || numbered) {
      flushParagraph();
      const kind = bullet ? 'ul' : 'ol';
      if (list !== kind) {
        closeList();
        out.push(`<${kind}>`);
        list = kind;
      }
      out.push(`<li>${inline((bullet ?? numbered)![1])}</li>`);
    } else {
      closeList();
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  closeList();
  return out.join('\n');
}
