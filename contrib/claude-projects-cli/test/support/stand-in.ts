// A local stand-in for the claude.ai pages the CLI drives. It has the same
// shape (project list, project and chat pages, a composer, a send button) but
// no real account, so it proves the adapter and daemon, not the live DOM.
const page = (body: string) => `<!doctype html><html><body>${body}
<div id="log"></div>
<div contenteditable="true" class="ProseMirror"></div>
<button aria-label="Send message">Send</button>
<script>
const composer = document.querySelector('.ProseMirror');
const log = document.getElementById('log');
document.querySelector('button[aria-label="Send message"]').onclick = () => {
  const text = composer.innerText;
  if (!text.trim()) return;
  const node = document.createElement('div');
  node.setAttribute('data-testid', 'user-message');
  node.innerText = text;
  log.appendChild(node);
  composer.innerText = '';
};
</script></body></html>`;

export interface StandIn {
  baseUrl: string;
  stop(): void;
}

export function startStandIn(): StandIn {
  const server = Bun.serve({
    port: 0,
    fetch(request) {
      const { pathname } = new URL(request.url);
      if (pathname === '/projects') {
        return new Response(page('<a href="/project/p1">Ops</a>'), { headers: html });
      }
      if (pathname === '/project/p1') {
        return new Response(page('<a href="/chat/p1-t1">Blockers</a>'), { headers: html });
      }
      if (pathname === '/chat/p1-t1') {
        return new Response(page(''), { headers: html });
      }
      return new Response('not found', { status: 404 });
    },
  });
  return { baseUrl: `http://127.0.0.1:${server.port}`, stop: () => server.stop(true) };
}

const html = { 'content-type': 'text/html; charset=utf-8' };
