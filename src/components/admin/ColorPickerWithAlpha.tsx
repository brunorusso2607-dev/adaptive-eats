import { useState, useEffect, useCallback } from "react";
import { RgbaColorPicker, RgbaColor } from "react-colorful";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Pipette } from "lucide-react";

interface ColorPickerWithAlphaProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
}

// Parse rgba string to RgbaColor object
function parseRgba(rgba: string): RgbaColor {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (match) {
    return {
      r: parseInt(match[1]),
      g: parseInt(match[2]),
      b: parseInt(match[3]),
      a: match[4] !== undefined ? parseFloat(match[4]) : 1,
    };
  }
  // Default fallback
  return { r: 128, g: 128, b: 128, a: 1 };
}

// Convert RgbaColor to rgba string
function rgbaToString(color: RgbaColor): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
}

// Convert RgbaColor to hex
function rgbaToHex(color: RgbaColor): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

// Parse hex to RgbaColor
function hexToRgba(hex: string, alpha: number = 1): RgbaColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
      a: alpha,
    };
  }
  return { r: 128, g: 128, b: 128, a: alpha };
}

export function ColorPickerWithAlpha({ color, onChange, label }: ColorPickerWithAlphaProps) {
  const [rgbaColor, setRgbaColor] = useState<RgbaColor>(() => parseRgba(color));
  const [hexInput, setHexInput] = useState(() => rgbaToHex(parseRgba(color)));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const parsed = parseRgba(color);
    setRgbaColor(parsed);
    setHexInput(rgbaToHex(parsed));
  }, [color]);

  const handleColorChange = useCallback((newColor: RgbaColor) => {
    setRgbaColor(newColor);
    setHexInput(rgbaToHex(newColor));
    onChange(rgbaToString(newColor));
  }, [onChange]);

  const handleHexChange = useCallback((hex: string) => {
    setHexInput(hex);
    if (/^#?[0-9A-Fa-f]{6}$/.test(hex)) {
      const newColor = hexToRgba(hex, rgbaColor.a);
      setRgbaColor(newColor);
      onChange(rgbaToString(newColor));
    }
  }, [onChange, rgbaColor.a]);

  const handleAlphaChange = useCallback((alpha: number) => {
    const newColor = { ...rgbaColor, a: alpha };
    setRgbaColor(newColor);
    onChange(rgbaToString(newColor));
  }, [onChange, rgbaColor]);

  return (
    <div className="space-y-2">
      {label && <Label className="text-xs text-muted-foreground">{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 h-10"
          >
            <div
              className="w-6 h-6 rounded border border-border shadow-sm"
              style={{ backgroundColor: rgbaToString(rgbaColor) }}
            />
            <span className="text-xs font-mono flex-1 text-left truncate">
              {rgbaToString(rgbaColor)}
            </span>
            <Pipette className="w-4 h-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="space-y-4">
            <RgbaColorPicker color={rgbaColor} onChange={handleColorChange} />
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">HEX</Label>
                <Input
                  value={hexInput}
                  onChange={(e) => handleHexChange(e.target.value)}
                  placeholder="#000000"
                  className="font-mono text-sm h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Opacidade</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(rgbaColor.a * 100)}
                    onChange={(e) => handleAlphaChange(parseInt(e.target.value) / 100)}
                    className="font-mono text-sm h-8"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {['r', 'g', 'b', 'a'].map((channel) => (
                <div key={channel} className="space-y-1">
                  <Label className="text-xs uppercase">{channel}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={channel === 'a' ? 1 : 255}
                    step={channel === 'a' ? 0.01 : 1}
                    value={channel === 'a' ? rgbaColor.a.toFixed(2) : rgbaColor[channel as keyof RgbaColor]}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      handleColorChange({
                        ...rgbaColor,
                        [channel]: channel === 'a' ? Math.min(1, Math.max(0, value)) : Math.min(255, Math.max(0, Math.round(value))),
                      });
                    }}
                    className="font-mono text-xs h-8"
                  />
                </div>
              ))}
            </div>

            <div className="pt-2 border-t">
              <Label className="text-xs text-muted-foreground">Preview</Label>
              <div
                className="mt-2 h-10 rounded-md border shadow-inner flex items-center justify-center text-sm font-medium"
                style={{
                  backgroundColor: rgbaToString(rgbaColor),
                  color: rgbaColor.a > 0.5 && (rgbaColor.r + rgbaColor.g + rgbaColor.b) / 3 < 128 ? 'white' : 'black',
                }}
              >
                Texto de exemplo
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
