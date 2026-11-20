"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Loader2, MapPin } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { DEFAULT_CHECK_IN_RADIUS_M, MAX_CHECK_IN_RADIUS_M, MIN_CHECK_IN_RADIUS_M } from "@/features/classes/check-in-rules";

/**
 * Coordenadas e raio do check-in. O professor pode colar do mapa ou, estando no local,
 * usar a localização do aparelho (lida uma vez, no clique).
 */
export function LocationCoordinatesFields({ idPrefix, latitude, longitude, radius }: { idPrefix: string; latitude?: number; longitude?: number; radius?: number }) {
  const [lat, setLat] = useState(latitude?.toString() ?? "");
  const [lng, setLng] = useState(longitude?.toString() ?? "");
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function fillFromDevice() {
    if (!("geolocation" in navigator)) {
      setMessage("Este navegador não informa a localização. Cole as coordenadas do mapa.");
      return;
    }
    setLocating(true);
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLng(position.coords.longitude.toFixed(6));
        setLocating(false);
        setMessage(`Localização preenchida (precisão de cerca de ${Math.round(position.coords.accuracy)} m).`);
      },
      (error) => {
        setLocating(false);
        setMessage(error.code === 1 ? "O acesso à localização foi negado. Permita a localização para este site nas configurações do navegador ou cole as coordenadas do mapa." : "Não foi possível obter a localização agora. Tente de novo ou cole as coordenadas do mapa.");
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 }
    );
  }

  return (
    <fieldset className="space-y-3 rounded-xl border border-border p-4">
      <legend className="px-1 text-sm font-medium">Check-in por localização</legend>
      <p className="text-sm text-muted-foreground">Sem coordenadas, os alunos deste local não conseguem fazer check-in pelo app.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-lat`}>Latitude</FieldLabel>
          <Input id={`${idPrefix}-lat`} name="latitude" inputMode="decimal" placeholder="-23.550520" value={lat} onChange={(event) => setLat(event.target.value)} className="h-11" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-lng`}>Longitude</FieldLabel>
          <Input id={`${idPrefix}-lng`} name="longitude" inputMode="decimal" placeholder="-46.633308" value={lng} onChange={(event) => setLng(event.target.value)} className="h-11" />
        </Field>
      </div>
      <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto" disabled={locating} onClick={fillFromDevice}>
        {locating ? <Loader2 className="size-4" aria-hidden="true" /> : <MapPin className="size-4" aria-hidden="true" />}
        {locating ? "Obtendo localização…" : "Usar minha localização atual"}
      </Button>
      {message ? <p className="text-sm text-muted-foreground" aria-live="polite">{message}</p> : null}
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-radius`}>Raio aceito (metros)</FieldLabel>
        <Input id={`${idPrefix}-radius`} name="check_in_radius_m" type="number" inputMode="numeric" min={MIN_CHECK_IN_RADIUS_M} max={MAX_CHECK_IN_RADIUS_M} step={5} defaultValue={radius ?? DEFAULT_CHECK_IN_RADIUS_M} className="h-11" />
        <FieldDescription>Padrão de {DEFAULT_CHECK_IN_RADIUS_M} m. Aumente se o GPS dentro do prédio costuma errar.</FieldDescription>
      </Field>
    </fieldset>
  );
}
