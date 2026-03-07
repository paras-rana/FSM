import { useEffect, useMemo, useState } from "react";
import { api } from "../modules/api/client";
import type { Facility } from "../types";

const urgencyOptions = ["HIGH", "MEDIUM", "LOW"] as const;

export const PublicServiceRequestPage = () => {
  const [requestorName, setRequestorName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [building, setBuilding] = useState("");
  const [area, setArea] = useState("");
  const [urgency, setUrgency] = useState<(typeof urgencyOptions)[number]>("MEDIUM");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadFacilities = async () => {
      try {
        const response = await api.get<Facility[]>("/facilities/public");
        setFacilities(response.data);
        const first = response.data[0];
        if (first) {
          setBuilding(first.name);
          setArea(first.zones[0] ?? "");
        }
      } catch {
        setError("Could not load facility options.");
      }
    };
    void loadFacilities();
  }, []);

  const zonesForSelectedFacility = useMemo(
    () => facilities.find((facility) => facility.name === building)?.zones ?? [],
    [facilities, building]
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const response = await api.post("/service-requests/public", {
        requestorName,
        contactInfo,
        building,
        area,
        urgency,
        description
      });
      setMessage(`Service request submitted successfully. SR #${response.data.sr_number}`);
      setRequestorName("");
      setContactInfo("");
      const first = facilities[0];
      setBuilding(first?.name ?? "");
      setArea(first?.zones[0] ?? "");
      setUrgency("MEDIUM");
      setDescription("");
    } catch {
      setError("Could not submit service request right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-6">
      <section className="max-w-2xl mx-auto rounded-2xl bg-fsm-panel shadow p-8">
        <h1 className="text-2xl font-bold">Submit Service Request</h1>
        <p className="text-slate-600 mt-1">Public intake form for service requests.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Requestor Name</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={requestorName}
              onChange={(e) => setRequestorName(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Contact Info</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Facility Name</span>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={building}
              onChange={(e) => {
                const nextFacility = e.target.value;
                setBuilding(nextFacility);
                const nextZones = facilities.find((facility) => facility.name === nextFacility)?.zones ?? [];
                setArea(nextZones[0] ?? "");
              }}
              required
            >
              <option value="" disabled>
                Select facility
              </option>
              {facilities.map((facility) => (
                <option key={facility.id} value={facility.name}>
                  {facility.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Room / Area</span>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              required
            >
              {zonesForSelectedFacility.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Urgency</span>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as (typeof urgencyOptions)[number])}
              required
            >
              {urgencyOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Description</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 min-h-28"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </label>

          {message && <p className="text-fsm-accentDark text-sm">{message}</p>}
          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            className="rounded-lg bg-fsm-accent text-white px-4 py-2 font-semibold hover:bg-fsm-accentDark disabled:opacity-50"
            disabled={loading || facilities.length === 0}
          >
            {loading ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </section>
    </main>
  );
};
