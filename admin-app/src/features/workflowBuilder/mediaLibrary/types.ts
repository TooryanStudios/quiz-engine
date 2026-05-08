export type MediaLibraryItemType = 'image' | 'video'

export type MediaLibraryItem = {
  id: string
  url: string
  name: string
  type: MediaLibraryItemType
  kind?: 'image' | 'video' | 'audio'
  storagePath?: string
  mimeType?: string
  size?: number
  createdAt: number
}
