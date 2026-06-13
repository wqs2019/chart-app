export type MediaResourceType = 'image' | 'video' | 'livePhoto';

export interface MediaResource {
  id?: string;
  uri: string;
  thumbnail?: string;
  type: MediaResourceType;
  name?: string;
  durationMs?: number;
  livePhotoVideoUri?: string;
}
