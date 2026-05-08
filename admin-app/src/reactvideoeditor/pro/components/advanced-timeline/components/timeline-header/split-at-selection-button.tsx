import React from 'react';
import { Scissors } from 'lucide-react';
import { Button } from '../../../ui/button';

interface SplitAtSelectionButtonProps {
  onSplitAtSelection: () => void;
  disabled?: boolean;
  hasSelectedItem?: boolean;
  selectedItemsCount?: number;
}

export const SplitAtSelectionButton: React.FC<SplitAtSelectionButtonProps> = ({ 
  onSplitAtSelection,
  disabled = false,
  hasSelectedItem = false,
  selectedItemsCount = 0
}) => {
  const isDisabled = disabled || !hasSelectedItem;

  const getTooltipMessage = () => {
    if (selectedItemsCount === 0) {
      return 'Select an item to split at playhead';
    }
    if (selectedItemsCount > 1) {
      return 'Select only one item to split';
    }
    if (!hasSelectedItem) {
      return 'Move playhead over selected item to split';
    }
    return 'Split selected item at playhead';
  };

  return (
    <div className="hidden md:block">
      <Button
        onClick={onSplitAtSelection}
        variant="ghost"
        size="icon"
        disabled={isDisabled}
        title={getTooltipMessage()}
        className={`transition-all duration-200 relative h-7 w-7 ${
          isDisabled 
            ? 'text-muted-foreground opacity-50 cursor-not-allowed' 
            : 'text-foreground hover:bg-[hsl(0_0%_22%)] hover:text-accent-foreground'
        }`}
        onTouchStart={(e) => e.preventDefault()}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <Scissors className="w-4 h-4 transition-all duration-300" />
      </Button>
    </div>
  );
}; 