"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Plus } from "@/components/ui/icons";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { TrainingLocation } from "../types";
import { ROUTES } from "@/lib/navigation/routes";

export function LocationSelect({
  id,
  name = "location",
  defaultValue = "",
  locations = [],
  placeholder = "Selecione o local ou dojang",
  required,
}: {
  id?: string;
  name?: string;
  defaultValue?: string;
  locations?: TrainingLocation[];
  placeholder?: string;
  required?: boolean;
}) {
  const router = useRouter();
  const knownMatch = locations.find(
    (loc) => loc.name.toLowerCase() === defaultValue.toLowerCase()
  );
  const initialMode = knownMatch || !defaultValue ? "select" : "custom";

  const [mode, setMode] = useState<"select" | "custom">(initialMode);
  const [selectedValue, setSelectedValue] = useState(
    knownMatch ? knownMatch.name : defaultValue ? "custom" : ""
  );
  const [customValue, setCustomValue] = useState(knownMatch ? "" : defaultValue);

  const handleSelectChange = (val: string) => {
    if (val === "__new__") {
      router.push(ROUTES.adminLocations);
      return;
    }
    if (val === "custom") {
      setMode("custom");
      setSelectedValue("custom");
      return;
    }
    setMode("select");
    setSelectedValue(val);
  };

  const finalValue = mode === "custom" ? customValue : selectedValue;

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={finalValue} />

      <Select value={selectedValue} onValueChange={handleSelectChange}>
        <SelectTrigger id={id} className="h-11 text-sm bg-background">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Locais cadastrados</SelectLabel>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.name}>
                <span className="flex items-center gap-2">
                  <MapPin className="size-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                  <span className="font-medium">{loc.name}</span>
                  {loc.address ? (
                    <span className="text-xs text-muted-foreground truncate max-w-xs">
                      ({loc.address})
                    </span>
                  ) : null}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectItem value="custom">
              <span className="text-muted-foreground italic">Digitar outro endereço personalizado…</span>
            </SelectItem>
            <SelectItem value="__new__" className="text-primary-text font-medium">
              <span className="flex items-center gap-1.5">
                <Plus className="size-3.5" aria-hidden="true" />
                Cadastrar novo local no sistema
              </span>
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      {mode === "custom" ? (
        <div className="pt-1">
          <Input
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder="Digite o endereço ou nome do local"
            className="h-11 text-sm"
            required={required}
            autoFocus
          />
        </div>
      ) : null}
    </div>
  );
}
