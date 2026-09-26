"use client";

import { useId, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { cleanCep, formatAddress, formatCep, parseAddress } from "@/lib/address";
import { fetchAddressByCep } from "@/lib/viacep";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const BRAZILIAN_STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

export type AddressFieldsProps = {
  defaultValue?: string | null;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  className?: string;
};

export function AddressFields({
  defaultValue,
  required = false,
  disabled = false,
  name = "address",
  className,
}: AddressFieldsProps) {
  const uid = useId();
  const initial = useMemo(() => parseAddress(defaultValue), [defaultValue]);

  const [cep, setCep] = useState(initial.cep ?? "");
  const [street, setStreet] = useState(initial.street ?? "");
  const [number, setNumber] = useState(initial.number ?? "");
  const [complement, setComplement] = useState(initial.complement ?? "");
  const [neighborhood, setNeighborhood] = useState(initial.neighborhood ?? "");
  const [city, setCity] = useState(initial.city ?? "");
  const [state, setState] = useState(initial.state ?? "");

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const lastSearchedCepRef = useRef<string>(cleanCep(initial.cep));
  const numberInputRef = useRef<HTMLInputElement>(null);

  async function lookupCep(targetCep: string) {
    const digits = cleanCep(targetCep);
    if (digits.length !== 8) return;
    lastSearchedCepRef.current = digits;
    setIsLoading(true);
    setStatusMessage({ type: "info", text: "Buscando endereço pelo CEP…" });

    const result = await fetchAddressByCep(digits);
    setIsLoading(false);

    if (result) {
      if (result.street) setStreet(result.street);
      if (result.neighborhood) setNeighborhood(result.neighborhood);
      if (result.city) setCity(result.city);
      if (result.state) setState(result.state);
      setStatusMessage({
        type: "success",
        text: "Endereço localizado via CEP.",
      });

      // Transfere o foco para o campo de número para agilizar a digitação
      setTimeout(() => {
        numberInputRef.current?.focus();
      }, 60);
    } else {
      setStatusMessage({
        type: "error",
        text: "CEP não localizado. Preencha os campos manualmente.",
      });
    }
  }

  const compiledAddress = useMemo(() => {
    return formatAddress({
      cep,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
    });
  }, [cep, street, number, complement, neighborhood, city, state]);

  return (
    <div className={cn("grid gap-3 sm:grid-cols-12", className)}>
      {/* Campo oculto contendo o endereço completo formatado para compatibilidade */}
      <input type="hidden" name={name} value={compiledAddress} />

      {/* CEP */}
      <div className="sm:col-span-12 md:col-span-4">
        <Field>
          <FieldLabel htmlFor={`${uid}-cep`}>
            CEP {required ? "*" : ""}
          </FieldLabel>
          <div className="relative">
            <Input
              id={`${uid}-cep`}
              name="address_cep"
              value={cep}
              placeholder="00000-000"
              maxLength={9}
              disabled={disabled}
              required={required}
              onChange={(e) => {
                const formatted = formatCep(e.target.value);
                setCep(formatted);
                const digits = cleanCep(formatted);
                if (
                  digits.length === 8 &&
                  digits !== lastSearchedCepRef.current
                ) {
                  lookupCep(formatted);
                }
              }}
              className={isLoading ? "pr-8" : ""}
            />
            {isLoading && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            )}
          </div>
          {statusMessage && (
            <p
              className={cn(
                "text-xs mt-1.5 flex items-center gap-1",
                statusMessage.type === "success" &&
                  "text-emerald-600 dark:text-emerald-400 font-medium",
                statusMessage.type === "error" &&
                  "text-amber-600 dark:text-amber-400",
                statusMessage.type === "info" && "text-muted-foreground"
              )}
            >
              {statusMessage.type === "success" && (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              )}
              {statusMessage.type === "error" && (
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </p>
          )}
        </Field>
      </div>

      {/* Rua / Logradouro */}
      <div className="sm:col-span-12 md:col-span-8">
        <Field>
          <FieldLabel htmlFor={`${uid}-street`}>
            Rua / Logradouro {required ? "*" : ""}
          </FieldLabel>
          <Input
            id={`${uid}-street`}
            name="address_street"
            value={street}
            placeholder="Ex: Rua das Flores"
            disabled={disabled}
            required={required}
            onChange={(e) => setStreet(e.target.value)}
          />
        </Field>
      </div>

      {/* Número */}
      <div className="sm:col-span-12 sm:col-span-4 md:col-span-3">
        <Field>
          <FieldLabel htmlFor={`${uid}-number`}>
            Número {required ? "*" : ""}
          </FieldLabel>
          <Input
            ref={numberInputRef}
            id={`${uid}-number`}
            name="address_number"
            value={number}
            placeholder="Ex: 120 ou S/N"
            disabled={disabled}
            required={required}
            onChange={(e) => setNumber(e.target.value)}
          />
        </Field>
      </div>

      {/* Complemento */}
      <div className="sm:col-span-12 sm:col-span-8 md:col-span-4">
        <Field>
          <FieldLabel htmlFor={`${uid}-complement`}>
            Complemento{" "}
            <span className="text-muted-foreground font-normal text-xs">
              (opcional)
            </span>
          </FieldLabel>
          <Input
            id={`${uid}-complement`}
            name="address_complement"
            value={complement}
            placeholder="Apto, Bloco, Casa..."
            disabled={disabled}
            onChange={(e) => setComplement(e.target.value)}
          />
        </Field>
      </div>

      {/* Bairro */}
      <div className="sm:col-span-12 md:col-span-5">
        <Field>
          <FieldLabel htmlFor={`${uid}-neighborhood`}>
            Bairro {required ? "*" : ""}
          </FieldLabel>
          <Input
            id={`${uid}-neighborhood`}
            name="address_neighborhood"
            value={neighborhood}
            placeholder="Bairro"
            disabled={disabled}
            required={required}
            onChange={(e) => setNeighborhood(e.target.value)}
          />
        </Field>
      </div>

      {/* Cidade */}
      <div className="sm:col-span-12 sm:col-span-8 md:col-span-8">
        <Field>
          <FieldLabel htmlFor={`${uid}-city`}>
            Cidade {required ? "*" : ""}
          </FieldLabel>
          <Input
            id={`${uid}-city`}
            name="address_city"
            value={city}
            placeholder="Cidade"
            disabled={disabled}
            required={required}
            onChange={(e) => setCity(e.target.value)}
          />
        </Field>
      </div>

      {/* Estado / UF */}
      <div className="sm:col-span-12 sm:col-span-4 md:col-span-4">
        <Field>
          <FieldLabel htmlFor={`${uid}-state`}>
            Estado (UF) {required ? "*" : ""}
          </FieldLabel>
          <Select
            name="address_state"
            value={state}
            onValueChange={(val) => setState(val)}
            disabled={disabled}
          >
            <SelectTrigger id={`${uid}-state`} className="w-full">
              <SelectValue placeholder="UF" />
            </SelectTrigger>
            <SelectContent>
              {BRAZILIAN_STATES.map((uf) => (
                <SelectItem key={uf} value={uf}>
                  {uf}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  );
}
