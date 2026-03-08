import { useState } from "react";
import { AppShell } from "../components/AppShell";
import { api } from "../modules/api/client";
import type { AttachmentItem } from "../types";

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const AttachmentsPage = () => {
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [filters, setFilters] = useState({
    workOrderNumber: "",
    from: "",
    to: ""
  });

  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      params.set("entityType", "WORK_ORDER");
      params.set("limit", "200");
      if (filters.workOrderNumber.trim()) {
        params.set("workOrderNumber", filters.workOrderNumber.trim());
      }
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      const res = await api.get<AttachmentItem[]>(`/uploads?${params.toString()}`);
      setAttachments(res.data);
    } catch {
      setError("Failed to load attachments.");
    } finally {
      setLoading(false);
    }
  };

  const download = async (item: AttachmentItem) => {
    setError(null);
    try {
      const response = await api.get(`/uploads/${item.id}/download`, {
        responseType: "blob"
      });
      const blobUrl = URL.createObjectURL(response.data as Blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = item.original_file_name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      setError("Download failed.");
    }
  };

  return (
    <AppShell title="Attachments">
      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <h2 className="text-xl font-semibold">Search Attachments</h2>
        <p className="text-sm text-slate-600 mt-1">
          Search by work order number, date range, or both.
        </p>
        <form className="mt-4 grid md:grid-cols-4 gap-3" onSubmit={search}>
          <input
            type="number"
            min={1}
            placeholder="Work Order #"
            className="rounded border px-3 py-2"
            value={filters.workOrderNumber}
            onChange={(e) => setFilters((p) => ({ ...p, workOrderNumber: e.target.value }))}
          />
          <input
            type="date"
            className="rounded border px-3 py-2"
            value={filters.from}
            onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
          />
          <input
            type="date"
            className="rounded border px-3 py-2"
            value={filters.to}
            onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
          />
          <button className="rounded bg-fsm-accent text-white px-3 py-2 hover:bg-fsm-accentDark">
            Search
          </button>
        </form>
      </section>

      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <h2 className="text-xl font-semibold mb-3">Attachment Library</h2>
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        {!searched ? (
          <p className="text-slate-600">Run a search to view attachments.</p>
        ) : loading ? (
          <p className="text-slate-600">Loading...</p>
        ) : attachments.length === 0 ? (
          <p className="text-slate-600">No attachments found.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Work Order</th>
                  <th className="py-2 pr-3">MIME</th>
                  <th className="py-2 pr-3">Size</th>
                  <th className="py-2 pr-3">Uploaded</th>
                  <th className="py-2 pr-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {attachments.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2 pr-3">{item.original_file_name}</td>
                    <td className="py-2 pr-3">{item.work_order_number ? `WO-${item.work_order_number}` : "-"}</td>
                    <td className="py-2 pr-3">{item.mime_type}</td>
                    <td className="py-2 pr-3">{formatSize(item.file_size)}</td>
                    <td className="py-2 pr-3">{new Date(item.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-3">
                      <button
                        className="rounded bg-fsm-accent text-white px-3 py-1.5 text-sm font-medium hover:bg-fsm-accentDark"
                        onClick={() => void download(item)}
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
};
