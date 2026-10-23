import type { Category } from '../db/types';
import { Icon } from './Icon';

interface CategoryIconProps {
  category: Category;
  size?: number;
  className?: string;
}

export function CategoryIcon({ category, size = 20, className = 'row-icon' }: CategoryIconProps) {
  return (
    <div className={className} aria-hidden="true">
      <Icon name={category} size={size} />
    </div>
  );
}
