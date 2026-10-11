// Keep legacy /login?returnTo=/workhub links out of the Lab auth lifecycle.
// Other login destinations continue to load the original application bundle.
function buildWorkhubLoginGateway(html) {
 let entryCount = 0;
 const result = html.replace(/<script\b([^>]*\btype=["']module["'][^>]*)\bsrc=["']([^"']+)["']([^>]*)>\s*<\/script>/gi, (_tag, _before, src) => {
  entryCount++;
  if (!src.startsWith('/assets/') || !/^\/assets\/[\w.\/-]+\.js$/.test(src)) throw new Error('Unexpected main application entry path.');
  return `<script type="module">
const target = new URLSearchParams(location.search).get('returnTo') || '';
const isWorkhub = /^\\/workhub(?:[/?#]|$)/i.test(target) && !target.includes('\\\\');
if (isWorkhub) {
  location.replace('/workhub/login?returnTo=' + encodeURIComponent(target));
} else {
  import(${JSON.stringify(src)});
}
</script>`;
 });
 if (entryCount !== 1) throw new Error('Expected one main application entry; refusing to publish login gateway.');
 return result;
}
module.exports = { buildWorkhubLoginGateway };
