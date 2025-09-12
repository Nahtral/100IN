import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface EnhancedSliderProps {
  value: number[]
  onValueChange: (value: number[]) => void
  min?: number
  max?: number
  step?: number
  className?: string
  showAlternativeInputs?: boolean
  showPresetButtons?: boolean
  disabled?: boolean
  orientation?: "horizontal" | "vertical"
}

const PRESET_VALUES = [
  { label: "Poor", value: 2, color: "bg-red-500" },
  { label: "Below Avg", value: 4, color: "bg-orange-500" },
  { label: "Average", value: 5, color: "bg-yellow-500" },
  { label: "Good", value: 7, color: "bg-blue-500" },
  { label: "Excellent", value: 9, color: "bg-green-500" },
]

const EnhancedSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  EnhancedSliderProps
>(({ 
  className, 
  value,
  onValueChange,
  min = 1,
  max = 10,
  step = 1,
  showAlternativeInputs = true,
  showPresetButtons = false,
  disabled = false,
  orientation = "horizontal",
  ...props 
}, ref) => {
  const currentValue = value[0] || min

  const handleIncrement = () => {
    const newValue = Math.min(currentValue + step, max)
    onValueChange([newValue])
  }

  const handleDecrement = () => {
    const newValue = Math.max(currentValue - step, min)
    onValueChange([newValue])
  }

  const handleInputChange = (inputValue: string) => {
    const numValue = parseInt(inputValue, 10)
    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
      onValueChange([numValue])
    }
  }

  const handlePresetClick = (presetValue: number) => {
    onValueChange([presetValue])
  }

  const getValueColor = (val: number) => {
    if (val >= 8) return "text-green-600"
    if (val >= 6) return "text-yellow-600"
    if (val >= 4) return "text-orange-600"
    return "text-red-600"
  }

  const getThumbColor = (val: number) => {
    if (val >= 8) return "border-green-500 bg-green-50"
    if (val >= 6) return "border-yellow-500 bg-yellow-50"
    if (val >= 4) return "border-orange-500 bg-orange-50"
    return "border-red-500 bg-red-50"
  }

  const getTrackColor = (val: number) => {
    if (val >= 8) return "bg-green-500"
    if (val >= 6) return "bg-yellow-500"
    if (val >= 4) return "bg-orange-500"
    return "bg-red-500"
  }

  return (
    <div className="space-y-3">
      {/* Enhanced Slider */}
      <div className="relative">
        <SliderPrimitive.Root
          ref={ref}
          className={cn(
            "relative flex w-full touch-none select-none items-center",
            "group",
            className
          )}
          value={value}
          onValueChange={onValueChange}
          max={max}
          min={min}
          step={step}
          disabled={disabled}
          orientation={orientation}
          {...props}
        >
          <SliderPrimitive.Track className="relative h-3 w-full grow overflow-hidden rounded-full bg-secondary/30">
            <SliderPrimitive.Range 
              className={cn(
                "absolute h-full transition-colors duration-200",
                getTrackColor(currentValue)
              )} 
            />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb 
            className={cn(
              "block h-6 w-6 rounded-full border-2 shadow-md transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:pointer-events-none disabled:opacity-50",
              "hover:scale-110 active:scale-95",
              "touch-target",
              getThumbColor(currentValue)
            )}
          />
        </SliderPrimitive.Root>
        
        {/* Value Display */}
        <div className="absolute -top-8 left-0 right-0 flex justify-center">
          <span className={cn(
            "text-sm font-semibold px-2 py-1 rounded bg-background border shadow-sm",
            getValueColor(currentValue)
          )}>
            {currentValue}
          </span>
        </div>
      </div>

      {/* Alternative Input Methods */}
      {showAlternativeInputs && (
        <div className="flex items-center gap-2">
          {/* Decrement Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDecrement}
            disabled={disabled || currentValue <= min}
            className="touch-target-lg p-0 h-8 w-8"
          >
            <Minus className="h-3 w-3" />
          </Button>

          {/* Direct Input */}
          <Input
            type="number"
            value={currentValue}
            onChange={(e) => handleInputChange(e.target.value)}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className="w-16 text-center h-8 mobile-input"
          />

          {/* Increment Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleIncrement}
            disabled={disabled || currentValue >= max}
            className="touch-target-lg p-0 h-8 w-8"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Preset Buttons */}
      {showPresetButtons && (
        <div className="flex flex-wrap gap-1">
          {PRESET_VALUES.map((preset) => (
            <Button
              key={preset.value}
              type="button"
              variant={currentValue === preset.value ? "default" : "outline"}
              size="sm"
              onClick={() => handlePresetClick(preset.value)}
              disabled={disabled}
              className="text-xs px-2 py-1 h-6 mobile-btn-xs"
            >
              {preset.label}
            </Button>
          ))}
        </div>
      )}

      {/* Labels */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Needs Work</span>
        <span>Average</span>
        <span>Excellent</span>
      </div>
    </div>
  )
})

EnhancedSlider.displayName = "EnhancedSlider"

export { EnhancedSlider }