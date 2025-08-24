"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const Schema = z.object({
  projectType: z.enum(["cafe", "gym", "hostel-mess", "bookstore", "other"]),
  city: z.string().min(1, "City is required"),
  address: z.string().optional(),
  budgetInLakh: z.coerce.number().min(1, "Budget must be >= 1"),
  seatingCapacity: z.coerce.number().min(1, "Capacity must be >= 1"),
  openHours: z.string().optional(),
  // NEW FIELDS
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  radiusM: z.coerce.number().min(50).max(5000).default(500),
  // toggles
  usePopulationDensity: z.boolean().default(true),
  considerCompetition: z.boolean().default(true),
  notes: z.string().optional(),
});

export type ScenarioValues = z.infer<typeof Schema>;

export default function ScenarioForm({
  defaultValues,
  onSubmit,
  submitLabel = "Analyze",
}: {
  defaultValues?: Partial<ScenarioValues>;
  onSubmit: (values: ScenarioValues) => Promise<void> | void;
  submitLabel?: string;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ScenarioValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      projectType: "cafe",
      city: "Vellore",
      budgetInLakh: 10,
      seatingCapacity: 30,
      openHours: "08:00-22:00",
      // sensible defaults for Vellore campus-ish area; change if you like
      lat: 12.9698,
      lon: 79.1559,
      radiusM: 500,
      usePopulationDensity: true,
      considerCompetition: true,
      notes: "Target students near PRP block; affordable breakfast menu.",
      ...defaultValues,
    },
  });

  // optional helper for convenience
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported in this browser");
      return;
    }
    toast.message("Getting your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue("lat", pos.coords.latitude);
        setValue("lon", pos.coords.longitude);
        toast.success("Location filled");
      },
      () => toast.error("Failed to get location")
    );
  };

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (v) => {
        toast.loading("Running analysis…", { id: "analyze" });
        try {
          await onSubmit(v);
          toast.success("Analysis complete", { id: "analyze" });
        } catch (e: any) {
          toast.error(e?.message || "Request failed", { id: "analyze" });
        }
      })}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Project Type */}
        <div>
          <Label>Project Type</Label>
          <Select
            defaultValue="cafe"
            onValueChange={(v) =>
              setValue("projectType", v as ScenarioValues["projectType"])
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cafe">Cafe</SelectItem>
              <SelectItem value="gym">Gym</SelectItem>
              <SelectItem value="hostel-mess">Hostel Mess</SelectItem>
              <SelectItem value="bookstore">Bookstore</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          {errors.projectType && (
            <p className="text-sm text-red-600 mt-1">
              {errors.projectType.message}
            </p>
          )}
        </div>

        {/* City */}
        <div>
          <Label>City</Label>
          <Input
            className="mt-1"
            placeholder="City name"
            {...register("city")}
          />
          {errors.city && (
            <p className="text-sm text-red-600 mt-1">{errors.city.message}</p>
          )}
        </div>

        {/* Address */}
        <div className="sm:col-span-2">
          <Label>Address (optional)</Label>
          <Input
            className="mt-1"
            placeholder="Street / Area"
            {...register("address")}
          />
        </div>

        {/* Budget */}
        <div>
          <Label>Budget (₹ in lakh)</Label>
          <Input
            type="number"
            className="mt-1"
            {...register("budgetInLakh", { valueAsNumber: true })}
          />
          {errors.budgetInLakh && (
            <p className="text-sm text-red-600 mt-1">
              {errors.budgetInLakh.message}
            </p>
          )}
        </div>

        {/* Capacity */}
        <div>
          <Label>Seating Capacity</Label>
          <Input
            type="number"
            className="mt-1"
            {...register("seatingCapacity", { valueAsNumber: true })}
          />
          {errors.seatingCapacity && (
            <p className="text-sm text-red-600 mt-1">
              {errors.seatingCapacity.message}
            </p>
          )}
        </div>

        {/* Open Hours */}
        <div>
          <Label>Open Hours</Label>
          <Input
            className="mt-1"
            placeholder="08:00-22:00"
            {...register("openHours")}
          />
        </div>

        {/* NEW: Lat / Lon / Radius */}
        <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="flex items-center justify-between">
              <Label>Latitude</Label>
              <button
                type="button"
                onClick={useMyLocation}
                className="text-xs text-blue-600 hover:underline"
                title="Use my current location"
              >
                Use my location
              </button>
            </div>
            <Input
              type="number"
              step="any"
              className="mt-1"
              {...register("lat", { valueAsNumber: true })}
            />
            {errors.lat && (
              <p className="text-sm text-red-600 mt-1">{errors.lat.message}</p>
            )}
          </div>

          <div>
            <Label>Longitude</Label>
            <Input
              type="number"
              step="any"
              className="mt-1"
              {...register("lon", { valueAsNumber: true })}
            />
            {errors.lon && (
              <p className="text-sm text-red-600 mt-1">{errors.lon.message}</p>
            )}
          </div>

          <div>
            <Label>Radius (meters)</Label>
            <Input
              type="number"
              className="mt-1"
              {...register("radiusM", { valueAsNumber: true })}
            />
            {errors.radiusM && (
              <p className="text-sm text-red-600 mt-1">
                {errors.radiusM.message}
              </p>
            )}
          </div>
        </div>

        {/* Toggles */}
        <div className="flex items-center justify-between rounded-xl border p-3">
          <div>
            <Label className="font-medium">Use Population Density</Label>
            <p className="text-xs text-slate-500">
              Include raster/TIF layer in backend.
            </p>
          </div>
          <Switch
            defaultChecked
            onCheckedChange={(v) => setValue("usePopulationDensity", v)}
          />
        </div>

        <div className="flex items-center justify-between rounded-xl border p-3">
          <div>
            <Label className="font-medium">Consider Competition</Label>
            <p className="text-xs text-slate-500">
              Include POIs like cafes/gyms nearby.
            </p>
          </div>
          <Switch
            defaultChecked
            onCheckedChange={(v) => setValue("considerCompetition", v)}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label>Notes / Extra Context</Label>
        <Textarea
          className="mt-1"
          rows={4}
          placeholder="Constraints, special signals…"
          {...register("notes")}
        />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting…" : submitLabel}
      </Button>
    </form>
  );
}
