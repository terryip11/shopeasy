import Image, { type ImageProps } from 'next/image';
import { shouldSkipImageOptimization } from '@/lib/storage/r2-public-url';

type AppImageProps = ImageProps;

/**
 * 包裝 next/image：R2／遠端圖直出（unoptimized），避免消耗 Vercel Image Transformations。
 */
export function AppImage({ src, unoptimized, ...props }: AppImageProps) {
  const skip =
    unoptimized ??
    (typeof src === 'string' ? shouldSkipImageOptimization(src) : false);

  return <Image src={src} unoptimized={skip} {...props} />;
}
