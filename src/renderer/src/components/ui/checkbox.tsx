import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onCheckedChange?: (checked: boolean, event?: React.ChangeEvent<HTMLInputElement>) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, onChange, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const lastMouseEventRef = React.useRef<React.MouseEvent | null>(null);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      // Inject the mouse event's shiftKey state into the native event
      // This allows shift-click range selection to work properly
      if (lastMouseEventRef.current) {
        Object.defineProperty(event.nativeEvent, 'shiftKey', {
          value: lastMouseEventRef.current.shiftKey,
          writable: false,
          configurable: true
        });
        lastMouseEventRef.current = null;
      }

      onChange?.(event);
      onCheckedChange?.(event.target.checked, event);
    };

    return (
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          className="sr-only"
          ref={(node) => {
            inputRef.current = node;
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
            }
          }}
          onChange={handleChange}
          {...props}
        />
        <div
          className={cn(
            "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            props.checked ? "bg-primary text-primary-foreground" : "bg-background",
            className
          )}
          onClick={(e) => {
            // Capture the mouse event to preserve shift key state
            lastMouseEventRef.current = e;
            inputRef.current?.click();
          }}
        >
          {props.checked && (
            <Check className="h-3 w-3 text-primary-foreground" />
          )}
        </div>
      </div>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }