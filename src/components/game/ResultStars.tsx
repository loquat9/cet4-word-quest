import type { StarRating } from '../../types';
import { cn } from '../../utils/cn';

interface ResultStarsProps {
  stars: StarRating;
  size?: 'md' | 'lg';
}

export function ResultStars({ stars, size = 'lg' }: ResultStarsProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-1',
        size === 'lg' ? 'text-5xl' : 'text-2xl',
      )}
      role="img"
      aria-label={`${stars} 星`}
    >
      {[1, 2, 3].map((star) => (
        <span
          key={star}
          aria-hidden="true"
          className={
            star <= stars
              ? 'animate-fade-in text-primary'
              : 'animate-fade-in text-slate-200'
          }
          style={{ animationDelay: `${(star - 1) * 40}ms` }}
        >
          {star <= stars ? '★' : '☆'}
        </span>
      ))}
    </div>
  );
}
