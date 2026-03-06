import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/AppShell";
import { api } from "../modules/api/client";
import { useAuth } from "../modules/auth/AuthContext";
import { hasAnyRole } from "../modules/auth/roles";
import type { AttachmentItem } from "../types";

const entityTypes = ["WORK_ORDER", "LABOR_ENTRY", "MATERIAL", "VENDOR_INVOICE", "SERVICE_REQUEST"] as const;

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const AttachmentsPage = () => {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    entityType: "WORK_ORDER",
    entityId: ""
  });
  const [file, setFile] = useState<File | null>(null);

  const canUpload = useMemo(
    () => hasAnyRole(user?.roles, ["TECHNICIAN", "MANAGER", "ADMIN"]),
    [user?.roles]
  );

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<AttachmentItem[]>("/uploads?limit=100");
      setAttachments(res.data);
    } catch {
      setError("Failed to load attachments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const upload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canUpload || !file) return;
    setUploading(true);
    setError(null);
    try {
      const data = new FormData();
      data.append("entityType", form.entityType);
      data.append("entityId", form.entityId);
      data.append("file", file);
      await api.post("/uploads", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setFile(null);
      setForm((p) => ({ ...p, entityId: "" }));
      await load();
    } catch {
      setError("Upload failed. Check entity ID and file type/size limits.");
    } finally {
      setUploading(false);
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
      {canUpload && (
        <section className="rounded-2xl bg-fsm-panel shadow p-6">
          <h2 className="text-xl font-semibold">Upload Attachment</h2>
          <form className="mt-4 grid md:grid-cols-4 gap-3" onSubmit={upload}>
            <select
              className="rounded border px-3 py-2"
              value={form.entityType}
              onChange={(e) => setForm((p) => ({ ...p, entityType: e.target.value }))}
            >
              {entityTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <input
              placeholder="Entity ID"
              className="rounded border px-3 py-2"
              value={form.entityId}
              onChange={(e) => setForm((p) => ({ ...p, entityId: e.target.value }))}
              required
            />
            <input
              type="file"
              className="rounded border px-3 py-2"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
            <button
              className="rounded bg-fsm-accent text-white px-3 py-2 hover:bg-fsm-accentDark disabled:opacity-50"
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </form>
        </section>
      )}

      <section className="rounded-2xl bg-fsm-panel shadow p-6">
        <h2 className="text-xl font-semibold mb-3">Attachment Library</h2>
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        {loading ? (
          <p className="text-slate-600">Loading...</p>
        ) : attachments.length === 0 ? (
          <p className="text-slate-600">No attachments found.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Entity</th>
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
                    <td className="py-2 pr-3">
                      {item.entity_type}: {item.entity_id}
                    </td>
                    <td className="py-2 pr-3">{item.mime_type}</td>
                    <td className="py-2 pr-3">{formatSize(item.file_size)}</td>
                    <td className="py-2 pr-3">{new Date(item.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-3">
                      <button className="rounded border px-2 py-1 hover:bg-slate-50" onClick={() => void download(item)}>
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

