import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "../components/AppShell";
import { api } from "../modules/api/client";
import { useAuth } from "../modules/auth/AuthContext";
import { hasAnyRole } from "../modules/auth/roles";
import type { Facility } from "../types";

type OverlayMode = "none" | "add" | "view" | "edit";

type FacilityDraft = {
  name: string;
  address: string;
  city: string;
  zipcode: string;
  contactInfo: string;
  zones: string[];
};

const emptyDraft = (): FacilityDraft => ({
  name: "",
  address: "",
  city: "",
  zipcode: "",
  contactInfo: "",
  zones: [""]
});

export const FacilitiesPage = () => {
  const OVERLAY_ANIM_MS = 260;
  const { user } = useAuth();
  const isAdmin = useMemo(() => hasAnyRole(user?.roles, ["ADMIN"]), [user?.roles]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [overlayMode, setOverlayMode] = useState<OverlayMode>("none");
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("");
  const [draft, setDraft] = useState<FacilityDraft>(emptyDraft);
  const closeTimerRef = useRef<number | null>(null);

  const [searchName, setSearchName] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [searchZipcode, setSearchZipcode] = useState("");

  const selectedFacility = useMemo(
    () => facilities.find((facility) => facility.id === selectedFacilityId) ?? null,
    [facilities, selectedFacilityId]
  );

  const filteredFacilities = useMemo(() => {
    const nameNeedle = searchName.trim().toLowerCase();
    const cityNeedle = searchCity.trim().toLowerCase();
    const zipNeedle = searchZipcode.trim().toLowerCase();
    return facilities.filter((facility) => {
      const nameMatch = !nameNeedle || facility.name.toLowerCase().includes(nameNeedle);
      const cityMatch = !cityNeedle || facility.city.toLowerCase().includes(cityNeedle);
      const zipMatch = !zipNeedle || facility.zipcode.toLowerCase().includes(zipNeedle);
      return nameMatch && cityMatch && zipMatch;
    });
  }, [facilities, searchCity, searchName, searchZipcode]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<Facility[]>("/facilities");
      setFacilities(response.data);
    } catch {
      setError("Failed to load facilities.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const showOverlay = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    window.requestAnimationFrame(() => setOverlayVisible(true));
  };

  const openAdd = () => {
    setDraft(emptyDraft());
    setSelectedFacilityId("");
    setOverlayMode("add");
    showOverlay();
  };

  const openView = (facility: Facility) => {
    setSelectedFacilityId(facility.id);
    setOverlayMode("view");
    showOverlay();
  };

  const openEdit = (facility: Facility) => {
    setSelectedFacilityId(facility.id);
    setDraft({
      name: facility.name,
      address: facility.address,
      city: facility.city,
      zipcode: facility.zipcode,
      contactInfo: facility.contact_info,
      zones: facility.zones.length > 0 ? [...facility.zones] : [""]
    });
    setOverlayMode("edit");
    showOverlay();
  };

  const closeOverlay = () => {
    setOverlayVisible(false);
    closeTimerRef.current = window.setTimeout(() => {
      setOverlayMode("none");
      closeTimerRef.current = null;
    }, OVERLAY_ANIM_MS);
    setSaving(false);
  };

  const setDraftField = (field: keyof Omit<FacilityDraft, "zones">, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const addZoneInput = () => {
    setDraft((prev) => ({ ...prev, zones: [...prev.zones, ""] }));
  };

  const updateZone = (index: number, value: string) => {
    setDraft((prev) => ({
      ...prev,
      zones: prev.zones.map((zone, i) => (i === index ? value : zone))
    }));
  };

  const removeZone = (index: number) => {
    setDraft((prev) => {
      const next = prev.zones.filter((_, i) => i !== index);
      return { ...prev, zones: next.length > 0 ? next : [""] };
    });
  };

  const buildPayload = () => {
    const zones = Array.from(new Set(draft.zones.map((zone) => zone.trim()).filter(Boolean)));
    return {
      name: draft.name.trim(),
      address: draft.address.trim(),
      city: draft.city.trim(),
      zipcode: draft.zipcode.trim(),
      contactInfo: draft.contactInfo.trim(),
      zones
    };
  };

  const createFacility = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAdmin) return;
    const payload = buildPayload();
    if (payload.zones.length === 0) {
      setError("At least one zone/room is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.post("/facilities", payload);
      await load();
      closeOverlay();
    } catch {
      setError("Failed to create facility.");
      setSaving(false);
    }
  };

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFacilityId || !isAdmin) return;
    const payload = buildPayload();
    if (payload.zones.length === 0) {
      setError("At least one zone/room is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.put(`/facilities/${selectedFacilityId}`, payload);
      await load();
      closeOverlay();
    } catch {
      setError("Failed to update facility.");
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <AppShell title="Facilities">
        <section className="rounded-2xl bg-fsm-panel shadow p-6">
          <p className="text-red-600">Admin access required.</p>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell title="Facilities">
      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold">Facilities</h2>
          <button
            type="button"
            onClick={openAdd}
            className="rounded bg-fsm-accent text-white px-4 py-2 text-sm hover:bg-fsm-accentDark"
          >
            Add Facility
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-3 mb-4">
          <input
            className="rounded border px-3 py-2"
            placeholder="Search by facility name"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
          <input
            className="rounded border px-3 py-2"
            placeholder="Search by city"
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
          />
          <input
            className="rounded border px-3 py-2"
            placeholder="Search by zipcode"
            value={searchZipcode}
            onChange={(e) => setSearchZipcode(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {loading ? (
          <p className="text-slate-600">Loading...</p>
        ) : filteredFacilities.length === 0 ? (
          <p className="text-slate-600">No facilities match your filter.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Address</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFacilities.map((facility) => (
                  <tr key={facility.id} className="border-b last:border-0">
                    <td className="py-2 pr-3">{facility.name}</td>
                    <td className="py-2 pr-3">
                      {facility.address}, {facility.city} {facility.zipcode}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded border px-3 py-1 hover:bg-slate-50"
                          onClick={() => openView(facility)}
                        >
                          Show Details
                        </button>
                        <button
                          type="button"
                          className="rounded border px-3 py-1 hover:bg-slate-50"
                          onClick={() => openEdit(facility)}
                        >
                          Edit Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {overlayMode !== "none" && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close overlay"
            className={`absolute inset-0 bg-slate-900/30 transition-opacity duration-300 ${
              overlayVisible ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeOverlay}
          />
          <aside
            className={`relative h-full w-full max-w-xl bg-white shadow-2xl border-l border-slate-200 p-6 overflow-y-auto transform transition-transform duration-300 ease-out ${
              overlayVisible ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">
                {overlayMode === "add" && "Add Facility"}
                {overlayMode === "view" && "Facility Details"}
                {overlayMode === "edit" && "Edit Facility"}
              </h3>
              <button type="button" onClick={closeOverlay} className="rounded border px-3 py-1 hover:bg-slate-50">
                Close
              </button>
            </div>

            {overlayMode === "view" && selectedFacility && (
              <div className="grid gap-3 text-sm">
                <p>
                  <strong>Name:</strong> {selectedFacility.name}
                </p>
                <p>
                  <strong>Address:</strong> {selectedFacility.address}
                </p>
                <p>
                  <strong>City:</strong> {selectedFacility.city}
                </p>
                <p>
                  <strong>Zipcode:</strong> {selectedFacility.zipcode}
                </p>
                <p>
                  <strong>Contact:</strong> {selectedFacility.contact_info}
                </p>
                <div>
                  <p className="font-semibold mb-2">Zones / Rooms</p>
                  <ul className="list-disc pl-5">
                    {selectedFacility.zones.map((zone) => (
                      <li key={zone}>{zone}</li>
                    ))}
                  </ul>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    className="rounded bg-fsm-accent text-white px-4 py-2 text-sm hover:bg-fsm-accentDark"
                    onClick={() => openEdit(selectedFacility)}
                  >
                    Edit Details
                  </button>
                </div>
              </div>
            )}

            {(overlayMode === "add" || overlayMode === "edit") && (
              <form className="grid gap-3" onSubmit={overlayMode === "add" ? createFacility : saveEdit}>
                <input
                  className="rounded border px-3 py-2"
                  placeholder="Facility Name"
                  value={draft.name}
                  onChange={(e) => setDraftField("name", e.target.value)}
                  required
                />
                <input
                  className="rounded border px-3 py-2"
                  placeholder="Address"
                  value={draft.address}
                  onChange={(e) => setDraftField("address", e.target.value)}
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="rounded border px-3 py-2"
                    placeholder="City"
                    value={draft.city}
                    onChange={(e) => setDraftField("city", e.target.value)}
                    required
                  />
                  <input
                    className="rounded border px-3 py-2"
                    placeholder="Zipcode"
                    value={draft.zipcode}
                    onChange={(e) => setDraftField("zipcode", e.target.value)}
                    required
                  />
                </div>
                <input
                  className="rounded border px-3 py-2"
                  placeholder="Contact Information"
                  value={draft.contactInfo}
                  onChange={(e) => setDraftField("contactInfo", e.target.value)}
                  required
                />

                <div className="rounded border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">Zones / Rooms</p>
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-sm hover:bg-slate-50"
                      onClick={addZoneInput}
                    >
                      Add Zone
                    </button>
                  </div>
                  <div className="grid gap-2">
                    {draft.zones.map((zone, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          className="rounded border px-3 py-2 flex-1"
                          placeholder={`Zone ${index + 1}`}
                          value={zone}
                          onChange={(e) => updateZone(index, e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="rounded border px-2 py-1 text-sm hover:bg-slate-50"
                          onClick={() => removeZone(index)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="rounded bg-fsm-accent text-white px-4 py-2 w-fit hover:bg-fsm-accentDark disabled:opacity-50"
                  disabled={saving}
                >
                  {saving
                    ? overlayMode === "add"
                      ? "Creating..."
                      : "Updating..."
                    : overlayMode === "add"
                      ? "Create Facility"
                      : "Save Changes"}
                </button>
              </form>
            )}
          </aside>
        </div>
      )}
    </AppShell>
  );
};
