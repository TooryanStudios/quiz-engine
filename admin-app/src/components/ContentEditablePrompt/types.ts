export type ResolvedMentionReference = {
  mention: string
  name: string
  url: string
  thumbUrl?: string
  kind: 'image' | 'video'
  role: string
}
