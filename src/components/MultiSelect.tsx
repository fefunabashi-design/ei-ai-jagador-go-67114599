import { ChevronDown, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

export type MultiSelectOption = { value: string; label: string };

type MultiSelectProps = {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

export const MultiSelect = ({ label, options, selected, onChange, placeholder }: MultiSelectProps) => {
  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };
  const labelFor = (v: string) => options.find((o) => o.value === v)?.label || v;

  return (
    <div className="min-w-0">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">{label}</p>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex min-h-9 w-full items-center justify-between gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-left text-xs"
          >
            <div className="flex flex-1 flex-wrap gap-1 min-w-0">
              {selected.length === 0 ? (
                <span className="text-muted-foreground truncate">{placeholder || "Selecione..."}</span>
              ) : (
                selected.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground max-w-full"
                  >
                    <span className="truncate">{labelFor(s)}</span>
                    <X
                      size={10}
                      className="shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        toggle(s);
                      }}
                    />
                  </span>
                ))
              )}
            </div>
            <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="min-w-[220px] w-auto max-w-[90vw] p-1" align="start">
          <div className="max-h-60 overflow-auto">
            {options.map((opt) => {
              const checked = selected.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent"
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggle(opt.value)} />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export const toMultiOptions = (arr: string[]): MultiSelectOption[] =>
  arr.map((v) => ({ value: v, label: v }));
