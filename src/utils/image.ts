/**
 * 获取图片的缩略图 URL
 * @param url 原始图片 URL
 * @param width 缩略图宽度，默认 200
 * @param height 缩略图高度，默认 200
 * @returns 缩略图 URL
 */
export const getThumbnailUrl = (url?: string, width: number = 200, height: number = 200): string => {
    if (!url) return '';

    // 如果不是腾讯云 COS/云开发的 URL，或者已经是缩略图 URL，则直接返回
    const isTencentCloud = url.includes('tcb.qcloud.la');
    if (!isTencentCloud || url.includes('imageView2')) {
        return url;
    }

    // 拼接缩略图参数
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}imageView2/2/w/${width}/h/${height}`;
};