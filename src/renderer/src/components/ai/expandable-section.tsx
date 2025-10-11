import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface ExpandableSectionProps {
  title: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  level?: number;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

export function ExpandableSection({
  title,
  count,
  isExpanded,
  onToggle,
  children,
  level = 0,
  className,
  headerClassName,
  contentClassName
}: ExpandableSectionProps) {
  const contentId = useId();

  return (
    <div className={cn('border-b border-gray-200 dark:border-gray-700', level > 0 && 'ml-4', className)}>
      <button
        className={cn(
          'w-full flex items-center justify-between py-2 px-3 hover:bg-accent transition-colors',
          headerClassName
        )}
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        <span className="text-sm font-medium">
          {title} ({count})
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      <motion.div
        id={contentId}
        initial={false}
        animate={{
          height: isExpanded ? 'auto' : 0,
          opacity: isExpanded ? 1 : 0
        }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="overflow-hidden min-w-0"
      >
        <div className={cn('pb-2 min-w-0', contentClassName)}>{children}</div>
      </motion.div>
    </div>
  );
}
