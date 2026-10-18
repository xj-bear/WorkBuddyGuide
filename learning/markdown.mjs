// 原文未加尖括号的裸网址可能紧接中文括号，避免标点被误算进下载地址。
export function configureTutorialLinks(md) {
  if (md.__workbuddyLinksConfigured) return;
  md.__workbuddyLinksConfigured = true;
  md.core.ruler.after('linkify', 'workbuddy-link-boundaries', state => {
    for (const block of state.tokens) {
      const tokens = block.children;
      if (!tokens) continue;
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.type !== 'link_open' || token.markup !== 'linkify') continue;
        const text = tokens[i + 1];
        if (text?.type !== 'text' || tokens[i + 2]?.type !== 'link_close') continue;
        const boundary = text.content.search(/[，。；！？（）【】]/);
        if (boundary < 0) continue;
        const suffix = new state.Token('text', '', 0);
        suffix.content = text.content.slice(boundary);
        text.content = text.content.slice(0, boundary);
        token.attrSet('href', md.normalizeLink(text.content));
        tokens.splice(i + 3, 0, suffix);
      }
    }
  });
}
