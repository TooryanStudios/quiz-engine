import React from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../ui/dropdown-menu';
import { ZoomIn, ChevronDown, Maximize2 } from 'lucide-react';
import { Button } from '../../../ui/button';

export type CanvasZoom = 'fit' | '100%' | '75%' | '50%';

interface CanvasZoomDropdownProps {
  canvasZoom: CanvasZoom;
  onCanvasZoomChange: (zoom: CanvasZoom) => void;
  disabled?: boolean;
  className?: string;
}

const CANVAS_ZOOM_OPTIONS: { value: CanvasZoom; label: string; description: string }[] = [
  { value: 'fit',  label: 'Fit',  description: 'Fit to window' },
  { value: '100%', label: '100%', description: 'Full size' },
  { value: '75%',  label: '75%',  description: 'Three-quarter size' },
  { value: '50%',  label: '50%',  description: 'Half size' },
];

export const CanvasZoomDropdown: React.FC<CanvasZoomDropdownProps> = ({
  canvasZoom,
  onCanvasZoomChange,
  disabled = false,
  className = '',
}) => {
  const currentOption = CANVAS_ZOOM_OPTIONS.find(o => o.value === canvasZoom);
  const Icon = canvasZoom === 'fit' ? Maximize2 : ZoomIn;

  return (
    <div className="hidden md:block">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className={`gap-2 min-w-22.5 h-7 justify-between border-border bg-background hover:bg-[hsl(0_0%_22%)] hover:text-accent-foreground shadow-none text-xs font-extralight ${className}`}
            onTouchStart={(e) => e.preventDefault()}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-amber-400" />
              <span className="font-extralight text-xs">{currentOption?.label ?? 'Fit'}</span>
            </div>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-44 border-border bg-popover" align="end">
          <DropdownMenuLabel className="flex items-center gap-2 text-popover-foreground font-extralight">
            <ZoomIn className="h-4 w-4" />
            Canvas Zoom
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuRadioGroup
            value={canvasZoom}
            onValueChange={(v) => onCanvasZoomChange(v as CanvasZoom)}
          >
            {CANVAS_ZOOM_OPTIONS.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                className="flex items-center gap-3 cursor-pointer"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-extralight">{option.label}</span>
                  <span className="text-[10px] text-muted-foreground">{option.description}</span>
                </div>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
