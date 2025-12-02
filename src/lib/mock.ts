import type { FileItem, FileDetailResponse, FileListResponse } from '../../shared/types';

const imageUrls = [
  'https://placehold.co/1200x800/jpeg',
  'https://placehold.co/800x1200/jpeg',
  'https://placehold.co/1000x1000/jpeg',
  'https://placehold.co/900x1200/jpeg',
  'https://placehold.co/1200x900/jpeg',
  'https://placehold.co/800x800/jpeg',
  'https://placehold.co/1200x1000/jpeg',
  'https://placehold.co/900x900/jpeg',
];

const videoSamples = [
  {
    file: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
    thumb: 'https://placehold.co/1200x800/jpeg',
  },
  {
    file: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_2mb.mp4',
    thumb: 'https://placehold.co/1000x700/jpeg',
  },
];

let cachedFiles: FileItem[] | null = null;

export function generateMockFiles(total = 24): FileItem[] {
  if (cachedFiles) return cachedFiles;

  const items: FileItem[] = [];

  for (let i = 0; i < total; i++) {
    const isVideo = i % 7 === 0; // 每7个加一个视频
    const id = `${i + 1}`;
    if (isVideo) {
      const vid = videoSamples[(i / 7) % videoSamples.length | 0];
      items.push({
        id,
        file_name: `sample-video-${id}.mp4`,
        file_path: vid.file,
        thumbnail_path: vid.thumb,
        file_size: 2_000_000,
        file_format: 'mp4',
        file_type: 'video',
        ai_model: 'Gen-Video-X',
        prompt: 'A sample animated video clip for gallery testing',
        reference_image_ids: [],
        duration: 10,
        resolution: '1280x720',
        publish_status: 'published',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } else {
      const img = imageUrls[i % imageUrls.length];
      items.push({
        id,
        file_name: `sample-image-${id}.jpg`,
        file_path: img,
        thumbnail_path: img,
        file_size: 500_000,
        file_format: 'jpg',
        file_type: 'image',
        ai_model: 'Gen-Image-Y',
        prompt: 'A random high-resolution photograph as mock data',
        reference_image_ids: [],
        publish_status: 'published',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  cachedFiles = items;
  return items;
}

export function getMockFileDetail(id: string): FileDetailResponse {
  const files = cachedFiles || generateMockFiles();
  const file = files.find(f => f.id === id) || files[0];
  return {
    file,
    reference_images: [],
  };
}

export function getMockFileList(page = 1, pageSize = 20): FileListResponse {
  const files = cachedFiles || generateMockFiles();
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const slice = files.slice(start, end);
  return {
    files: slice,
    total: files.length,
    hasNextPage: end < files.length,
  };
}
