const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!))

export function buildChatEmail(sender: string, message: string, urgent: boolean, url: string) {
  const short = (value: string, limit: number) => {
    const text = value.replace(/\s+/g, ' ').trim()
    return [...text].length > limit ? [...text].slice(0, limit - 1).join('') + '…' : text
  }
  const subject = `${urgent ? 'Urgent · ' : ''}${short(sender, 32)}: ${short(message.replace(/https?:\/\/\S+/g, '[link]'), 64) || 'Attachment'}`
  const content = escape(message).replace(/https?:\/\/[^\s<]+/g, link => `<a href="${link}" style="color:#6750c8;word-break:break-all;">${link}</a>`).replace(/\n/g, '<br>')
  return {
    subject,
    text: `${sender}\n\n${message}\n\nOpen chat: ${url}\nReply to this email to respond in WorkHub.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#202332;"><p style="font-size:13px;color:#777;margin:0 0 20px;">WorkHub${urgent ? ' · Urgent message' : ''}</p><p dir="auto" style="font-size:15px;font-weight:600;margin:0 0 12px;">${escape(sender)}</p><div dir="auto" style="font-size:16px;line-height:1.6;overflow-wrap:anywhere;">${content}</div><p style="margin:24px 0;"><a href="${escape(url)}" style="background:#725acb;color:white;padding:11px 18px;border-radius:8px;text-decoration:none;display:inline-block;">Open chat</a></p><p style="font-size:12px;color:#777;">Reply to this email to respond in WorkHub.</p></div>`,
  }
}
