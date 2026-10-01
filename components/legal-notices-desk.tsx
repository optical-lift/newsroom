"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { FORUM_WORKSPACE_ID } from "@/lib/supabase/config";
import { getNewsroomBrowserClient } from "@/lib/supabase/browser";

type LegalNoticeJob = {
  id: string;
  title: string;
  customer: string | null;
  notice_type: string | null;
  case_number: string | null;
  first_run_date: string | null;
  run_count: number;
  proof_state: "needed" | "ready" | "sent" | "revision_requested";
  approval_state: "waiting" | "approved";
  approval_method: "email" | "phone" | "other" | null;
  approved_at: string | null;
  payment_state: "pending" | "paid_online" | "paid_phone" | "not_required";
  payment_at: string | null;
  latest_proof_version: number | null;
  latest_proof_file_name: string | null;
  latest_proof_storage_path: string | null;
  ready: boolean;
  next_action: "add_proof" | "upload_revision" | "send_proof" | "get_approval" | "collect_payment" | "ready";
  created_at: string;
  updated_at: string;
};

type NewNotice = {
  title: string;
  customer: string;
  noticeType: string;
  caseNumber: string;
  firstRunDate: string;
  runCount: string;
};

const EMPTY_NOTICE: NewNotice = {
  title: "",
  customer: "",
  noticeType: "",
  caseNumber: "",
  firstRunDate: "",
  runCount: "1"
};

function dateLabel(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00Z`));
}

function nextActionLabel(job: LegalNoticeJob) {
  switch (job.next_action) {
    case "add_proof": return "Add proof";
    case "upload_revision": return "Upload revision";
    case "send_proof": return "Send proof";
    case "get_approval": return "Needs approval";
    case "collect_payment": return "Needs payment";
    case "ready": return "Ready";
  }
}

function paymentLabel(value: LegalNoticeJob["payment_state"]) {
  if (value === "paid_online") return "Paid online";
  if (value === "paid_phone") return "Paid by phone";
  if (value === "not_required") return "Not required";
  return "Pending";
}

function proofLabel(job: LegalNoticeJob) {
  if (!job.latest_proof_version) return "None";
  if (job.proof_state === "revision_requested") return `v${job.latest_proof_version} · revision requested`;
  if (job.proof_state === "sent") return `v${job.latest_proof_version} · sent`;
  return `v${job.latest_proof_version} · ready`;
}

function NoticeRow({
  job,
  busy,
  onUpload,
  onAction,
  onOpenProof
}: {
  job: LegalNoticeJob;
  busy: boolean;
  onUpload: (job: LegalNoticeJob, file: File) => Promise<void>;
  onAction: (job: LegalNoticeJob, action: string) => Promise<void>;
  onOpenProof: (job: LegalNoticeJob) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);

  return (
    <article className="legal-job">
      <div className="legal-job-main">
        <div>
          <div className="legal-job-title-row">
            <h2>{job.title}</h2>
            <span className={`legal-status ${job.ready ? "legal-ready" : "legal-pending"}`}>
              {nextActionLabel(job)}
            </span>
          </div>
          <p className="legal-meta">
            {[job.customer, job.notice_type, job.case_number].filter(Boolean).join(" · ") || "No additional details"}
          </p>
        </div>
        <div className="legal-run">
          <strong>{dateLabel(job.first_run_date)}</strong>
          <span>{job.run_count} {job.run_count === 1 ? "run" : "runs"}</span>
        </div>
      </div>

      <div className="legal-state-grid">
        <div><span>Proof</span><strong>{proofLabel(job)}</strong></div>
        <div><span>Approval</span><strong>{job.approval_state === "approved" ? `Approved${job.approval_method ? ` · ${job.approval_method}` : ""}` : "Waiting"}</strong></div>
        <div><span>Payment</span><strong>{paymentLabel(job.payment_state)}</strong></div>
      </div>

      <div className="legal-actions">
        {job.latest_proof_storage_path ? (
          <button className="legal-secondary" type="button" disabled={busy} onClick={() => void onOpenProof(job)}>
            Open proof
          </button>
        ) : null}

        {job.next_action === "add_proof" || job.next_action === "upload_revision" ? (
          <>
            <label className="legal-file">
              <input
                type="file"
                accept=".pdf,.doc,.docx,image/*"
                disabled={busy}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <span>{file?.name ?? "Choose proof"}</span>
            </label>
            <button
              className="legal-primary"
              type="button"
              disabled={busy || !file}
              onClick={() => file ? void onUpload(job, file) : undefined}
            >
              {job.next_action === "upload_revision" ? "Upload revision" : "Upload proof"}
            </button>
          </>
        ) : null}

        {job.next_action === "send_proof" ? (
          <button className="legal-primary" type="button" disabled={busy} onClick={() => void onAction(job, "proof_sent")}>Mark proof sent</button>
        ) : null}

        {job.next_action === "get_approval" ? (
          <>
            <button className="legal-primary" type="button" disabled={busy} onClick={() => void onAction(job, "approved_email")}>Approved by email</button>
            <button className="legal-secondary" type="button" disabled={busy} onClick={() => void onAction(job, "approved_phone")}>Approved by phone</button>
            <button className="legal-secondary" type="button" disabled={busy} onClick={() => void onAction(job, "revision_requested")}>Revision requested</button>
          </>
        ) : null}

        {job.next_action === "collect_payment" ? (
          <>
            <button className="legal-primary" type="button" disabled={busy} onClick={() => void onAction(job, "paid_online")}>Paid online</button>
            <button className="legal-secondary" type="button" disabled={busy} onClick={() => void onAction(job, "paid_phone")}>Paid by phone</button>
            <button className="legal-secondary" type="button" disabled={busy} onClick={() => void onAction(job, "payment_not_required")}>No payment required</button>
          </>
        ) : null}
      </div>
    </article>
  );
}

export default function LegalNoticesDesk() {
  const supabase = useMemo(() => getNewsroomBrowserClient(), []);
  const [jobs, setJobs] = useState<LegalNoticeJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyJob, setBusyJob] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newNotice, setNewNotice] = useState<NewNotice>(EMPTY_NOTICE);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const { data, error: loadError } = await supabase.rpc("newsroom_list_legal_notice_jobs", {
      target_workspace: FORUM_WORKSPACE_ID
    });
    if (loadError) {
      setError(loadError.message);
      setLoading(false);
      return;
    }
    setJobs((data ?? []) as LegalNoticeJob[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void load(); }, [load]);

  async function createNotice(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    const { error: createError } = await supabase.rpc("newsroom_create_legal_notice_job", {
      target_workspace: FORUM_WORKSPACE_ID,
      target_title: newNotice.title,
      target_customer: newNotice.customer || null,
      target_notice_type: newNotice.noticeType || null,
      target_case_number: newNotice.caseNumber || null,
      target_first_run_date: newNotice.firstRunDate || null,
      target_run_count: Number(newNotice.runCount) || 1
    });
    setCreating(false);
    if (createError) {
      setError(createError.message);
      return;
    }
    setNewNotice(EMPTY_NOTICE);
    setShowNew(false);
    await load();
  }

  async function uploadProof(job: LegalNoticeJob, file: File) {
    setBusyJob(job.id);
    setError(null);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
    const path = `${FORUM_WORKSPACE_ID}/${job.id}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("newsroom-legal-proofs")
      .upload(path, file, { upsert: false });

    if (uploadError) {
      setBusyJob(null);
      setError(uploadError.message);
      return;
    }

    const { error: registerError } = await supabase.rpc("newsroom_register_legal_notice_proof", {
      target_job: job.id,
      target_file_name: file.name,
      target_storage_path: path
    });

    if (registerError) {
      await supabase.storage.from("newsroom-legal-proofs").remove([path]);
      setBusyJob(null);
      setError(registerError.message);
      return;
    }

    setBusyJob(null);
    await load();
  }

  async function runAction(job: LegalNoticeJob, action: string) {
    setBusyJob(job.id);
    setError(null);
    const { error: actionError } = await supabase.rpc("newsroom_legal_notice_action", {
      target_job: job.id,
      target_action: action,
      target_note: null
    });
    setBusyJob(null);
    if (actionError) {
      setError(actionError.message);
      return;
    }
    await load();
  }

  async function openProof(job: LegalNoticeJob) {
    if (!job.latest_proof_storage_path) return;
    setBusyJob(job.id);
    setError(null);
    const { data, error: signedError } = await supabase.storage
      .from("newsroom-legal-proofs")
      .createSignedUrl(job.latest_proof_storage_path, 600);
    setBusyJob(null);
    if (signedError || !data?.signedUrl) {
      setError(signedError?.message ?? "Could not open proof.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  const summary = {
    ready: jobs.filter((job) => job.ready).length,
    proof: jobs.filter((job) => ["add_proof", "upload_revision", "send_proof"].includes(job.next_action)).length,
    approval: jobs.filter((job) => job.next_action === "get_approval").length,
    payment: jobs.filter((job) => job.next_action === "collect_payment").length
  };

  return (
    <>
      <style>{`
        .legal-header { margin-bottom: 24px; }
        .legal-header-actions { display: flex; align-items: center; gap: 10px; }
        .legal-primary, .legal-secondary { min-height: 38px; padding: 8px 12px; border-radius: 7px; font-size: 12px; font-weight: 800; cursor: pointer; }
        .legal-primary { border: 0; background: var(--accent); color: white; }
        .legal-secondary { border: 1px solid var(--line); background: var(--surface); color: var(--accent); }
        .legal-primary:disabled, .legal-secondary:disabled { opacity: .5; cursor: wait; }
        .legal-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); max-width: 900px; margin-bottom: 18px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); overflow: hidden; }
        .legal-summary div { padding: 16px 18px; border-right: 1px solid var(--line); }
        .legal-summary div:last-child { border-right: 0; }
        .legal-summary strong, .legal-summary span { display: block; }
        .legal-summary strong { font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: 500; }
        .legal-summary span { margin-top: 3px; color: var(--muted); font-size: 11px; }
        .legal-new { max-width: 900px; margin-bottom: 18px; padding: 20px; border: 1px solid var(--line); border-radius: 12px; background: #ebece6; }
        .legal-new-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .legal-new label { display: grid; gap: 6px; color: #46504a; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .07em; }
        .legal-new label:first-child { grid-column: 1 / -1; }
        .legal-new input { min-height: 42px; padding: 9px 10px; border: 1px solid #c3c7c1; border-radius: 7px; background: var(--surface); color: var(--ink); }
        .legal-new-actions { display: flex; gap: 10px; margin-top: 14px; }
        .legal-error { max-width: 900px; margin: 0 0 16px; padding: 11px 13px; border-radius: 8px; background: #f7e8e5; color: #7b3028; font-size: 12px; }
        .legal-list { max-width: 900px; display: grid; gap: 12px; }
        .legal-job { padding: 20px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
        .legal-job-main { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 20px; align-items: start; }
        .legal-job-title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .legal-job h2 { margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: 500; }
        .legal-meta { margin: 6px 0 0; color: var(--muted); font-size: 12px; }
        .legal-status { display: inline-flex; padding: 5px 8px; border-radius: 999px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; }
        .legal-ready { background: #e3eee7; color: #22533e; }
        .legal-pending { background: #f3ecd8; color: #5c4a24; }
        .legal-run { text-align: right; }
        .legal-run strong, .legal-run span { display: block; }
        .legal-run strong { font-size: 13px; }
        .legal-run span { margin-top: 3px; color: var(--muted); font-size: 11px; }
        .legal-state-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 16px; border-top: 1px solid #ecebe5; border-bottom: 1px solid #ecebe5; }
        .legal-state-grid div { padding: 12px 10px 12px 0; }
        .legal-state-grid span, .legal-state-grid strong { display: block; }
        .legal-state-grid span { color: var(--muted); font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
        .legal-state-grid strong { margin-top: 4px; font-size: 12px; }
        .legal-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
        .legal-file { display: inline-flex; align-items: center; max-width: 260px; min-height: 38px; padding: 8px 10px; border: 1px dashed #aeb6b0; border-radius: 7px; color: var(--muted); font-size: 11px; cursor: pointer; }
        .legal-file input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
        .legal-file span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .legal-empty { max-width: 900px; padding: 28px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); color: var(--muted); }
        @media (max-width: 760px) {
          .legal-summary { grid-template-columns: repeat(2, 1fr); }
          .legal-summary div:nth-child(2) { border-right: 0; }
          .legal-summary div:nth-child(-n+2) { border-bottom: 1px solid var(--line); }
          .legal-new-grid, .legal-job-main { grid-template-columns: 1fr; }
          .legal-new label:first-child { grid-column: auto; }
          .legal-run { text-align: left; }
          .legal-state-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <header className="page-header legal-header">
        <p className="eyebrow">Mitchell Republic</p>
        <div className="title-row">
          <h1>Legal Notices</h1>
          <div className="legal-header-actions">
            <button className="legal-primary" type="button" onClick={() => setShowNew((value) => !value)}>
              {showNew ? "Close" : "New notice"}
            </button>
          </div>
        </div>
      </header>

      <section className="legal-summary" aria-label="Legal notice queue summary">
        <div><strong>{summary.ready}</strong><span>Ready</span></div>
        <div><strong>{summary.proof}</strong><span>Proof work</span></div>
        <div><strong>{summary.approval}</strong><span>Awaiting approval</span></div>
        <div><strong>{summary.payment}</strong><span>Awaiting payment</span></div>
      </section>

      {showNew ? (
        <form className="legal-new" onSubmit={createNotice}>
          <div className="legal-new-grid">
            <label>Notice title<input required value={newNotice.title} onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })} /></label>
            <label>Customer<input value={newNotice.customer} onChange={(e) => setNewNotice({ ...newNotice, customer: e.target.value })} /></label>
            <label>Notice type<input placeholder="Probate, public hearing, bid notice…" value={newNotice.noticeType} onChange={(e) => setNewNotice({ ...newNotice, noticeType: e.target.value })} /></label>
            <label>Case / notice number<input value={newNotice.caseNumber} onChange={(e) => setNewNotice({ ...newNotice, caseNumber: e.target.value })} /></label>
            <label>First run<input type="date" value={newNotice.firstRunDate} onChange={(e) => setNewNotice({ ...newNotice, firstRunDate: e.target.value })} /></label>
            <label>Number of runs<input type="number" min="1" max="52" value={newNotice.runCount} onChange={(e) => setNewNotice({ ...newNotice, runCount: e.target.value })} /></label>
          </div>
          <div className="legal-new-actions">
            <button className="legal-primary" type="submit" disabled={creating}>{creating ? "Creating…" : "Create notice"}</button>
          </div>
        </form>
      ) : null}

      {error ? <p className="legal-error">{error}</p> : null}

      {loading ? (
        <div className="legal-empty">Loading legal notices…</div>
      ) : jobs.length === 0 ? (
        <div className="legal-empty">No legal notices in the queue.</div>
      ) : (
        <section className="legal-list">
          {jobs.map((job) => (
            <NoticeRow
              key={job.id}
              job={job}
              busy={busyJob === job.id}
              onUpload={uploadProof}
              onAction={runAction}
              onOpenProof={openProof}
            />
          ))}
        </section>
      )}
    </>
  );
}
