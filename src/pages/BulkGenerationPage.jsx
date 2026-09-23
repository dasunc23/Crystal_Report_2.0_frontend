import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    CheckCircle2,
    FileImage,
    FileText,
    Images,
    Loader2,
    Play,
    RefreshCw,
    Upload,
    AlertCircle,
    Download,
} from "lucide-react";

import {
    getProjectStudents,
    uploadStudentPhotos,
} from "../api/studentApi";
import { createPrintSheetPreview } from "../api/templateApi";
import { downloadGenerationJob } from "../api/generationApi";

const API_BASE = (
    import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api"
).replace(/\/$/, "");

function apiUrl(path) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return API_BASE + normalizedPath;
}

function unwrap(payload) {
    if (payload?.data !== undefined && !Array.isArray(payload)) {
        return payload.data;
    }

    return payload;
}

function errorMessage(error, fallback) {
    return (
        error?.response?.data?.message ||
        error?.message ||
        fallback
    );
}

async function detailedErrorMessage(error, fallback) {
    const responseData = error?.response?.data;

    if (responseData instanceof Blob) {
        try {
            const text = await responseData.text();
            const data = JSON.parse(text);

            if (typeof data?.message === "string") {
                return data.message;
            }

            if (data?.errors) {
                return Object.values(data.errors).flat().join(" ");
            }
        } catch {
            // Keep the fallback when the blob is not a JSON error response.
        }
    }

    return errorMessage(error, fallback);
}

async function request(path, options = {}) {
    const headers = new Headers(options.headers);
    const token = localStorage.getItem("auth_token");

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(apiUrl(path), {
        ...options,
        credentials: "omit",
        headers,
    });

    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        const message =
            typeof body === "object" ? body?.message : body;

        throw new Error(message || `Request failed with status ${response.status}`);
    }

    return body;
}

function getCount(value) {
    return Number(value ?? 0);
}

function getStudentRecords(payload) {
    if (Array.isArray(payload?.students?.data)) {
        return payload.students.data;
    }

    if (Array.isArray(payload?.students)) {
        return payload.students;
    }

    if (Array.isArray(payload?.data)) {
        return payload.data;
    }

    return Array.isArray(payload) ? payload : [];
}

export default function BulkGenerationPage() {
    const { projectId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const templateId = location.state?.templateId || "";
    const templateName = location.state?.templateName || "";
    const importResult = location.state?.importResult || null;

    const [photoFiles, setPhotoFiles] = useState([]);
    const [photoSummary, setPhotoSummary] = useState(null);
    const [summary, setSummary] = useState(importResult);
    const [generationJob, setGenerationJob] = useState(null);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
    const [pdfPreviewError, setPdfPreviewError] = useState("");
    const pdfPreviewUrlRef = useRef("");
    const pdfPreviewFrameRef = useRef(null);

    const [loadingPhotos, setLoadingPhotos] = useState(false);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [startingGeneration, setStartingGeneration] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [confirmed, setConfirmed] = useState(false);

    const fileInputRef = useRef(null);

    const jobStatus = String(
        generationJob?.status ||
            generationJob?.state ||
            generationJob?.job_status ||
            ""
    ).toLowerCase();

    const progress = Math.min(
        100,
        Math.max(
            0,
            Number(
                generationJob?.progress ??
                    generationJob?.percentage ??
                    generationJob?.percent ??
                    0
            )
        )
    );

    const isRunning = ["queued", "pending", "processing", "running"].includes(
        jobStatus
    );

    const isCompleted = ["completed", "complete", "finished", "success"].includes(
        jobStatus
    );

    const isFailed = ["failed", "error", "cancelled"].includes(jobStatus);

    const canGenerate = useMemo(() => {
        if (!projectId || !templateId || loadingPhotos || loadingPreview) {
            return false;
        }

        if (!summary || !pdfPreviewUrl) {
            return false;
        }

        if (summary.invalid_count > 0) {
            return false;
        }

        return confirmed && !isRunning && !startingGeneration;
    }, [
        projectId,
        templateId,
        loadingPhotos,
        loadingPreview,
        summary,
        pdfPreviewUrl,
        confirmed,
        isRunning,
        startingGeneration,
    ]);

    function clearMessages() {
        setError("");
        setSuccess("");
    }

    function clearPdfPreview() {
        if (pdfPreviewUrlRef.current) {
            URL.revokeObjectURL(pdfPreviewUrlRef.current);
            pdfPreviewUrlRef.current = "";
        }

        setPdfPreviewUrl("");
        setPdfPreviewError("");
    }

    async function refreshStudents() {
        const response = await getProjectStudents(projectId);
        const records = getStudentRecords(unwrap(response));
        return records;
    }

    useEffect(() => {
        return () => {
            if (pdfPreviewUrlRef.current) {
                URL.revokeObjectURL(pdfPreviewUrlRef.current);
            }
        };
    }, []);

    function handlePhotoSelection(event) {
        const files = Array.from(event.target.files || []);

        clearMessages();
        setPhotoFiles(files);
        setPhotoSummary(null);
        clearPdfPreview();
        setGenerationJob(null);
        setConfirmed(false);
    }

    async function uploadPhotos() {
        if (!projectId) {
            setError("Project ID is missing.");
            return;
        }

        if (!templateId) {
            setError("Template ID is missing. Return to the editor and try again.");
            return;
        }

        if (photoFiles.length === 0) {
            setError("Please select the student photo files first.");
            return;
        }

        try {
            setLoadingPhotos(true);
            clearMessages();

            const result = unwrap(
                await uploadStudentPhotos(projectId, photoFiles)
            );

            await refreshStudents();
            setPhotoSummary(result || {});
            setSuccess("Student photos uploaded and matched successfully.");
        } catch (requestError) {
            setError(
                errorMessage(
                    requestError,
                    "Unable to upload and match student photos."
                )
            );
        } finally {
            setLoadingPhotos(false);
        }
    }

    async function loadPreview() {
        if (!projectId || !templateId) {
            setError("Project or template information is missing.");
            return;
        }

        try {
            setLoadingPreview(true);
            clearMessages();

            const currentStudents = await refreshStudents();
            const studentIds = currentStudents
                .map((student) => student?.id)
                .filter((id) => id !== null && id !== undefined);

            if (studentIds.length === 0) {
                throw new Error(
                    "No persisted students are available for PDF preview."
                );
            }

            const response = await createPrintSheetPreview(
                projectId,
                templateId,
                studentIds
            );

            if (!(response.data instanceof Blob) || response.data.size === 0) {
                throw new Error("The preview response did not contain a PDF.");
            }

            clearPdfPreview();
            const nextUrl = URL.createObjectURL(response.data);
            pdfPreviewUrlRef.current = nextUrl;
            setPdfPreviewUrl(nextUrl);
            setPdfPreviewError("");
            setSummary(importResult || {});
            setConfirmed(false);
            setSuccess("A4 PDF preview is ready for review.");
        } catch (requestError) {
            const message = await detailedErrorMessage(
                requestError,
                "Unable to create the PDF preview."
            );

            setPdfPreviewError(
                message
            );
            setError(message);
        } finally {
            setLoadingPreview(false);
        }
    }

    async function startGeneration() {
        if (!canGenerate) {
            setError(
                "Review the preview, resolve invalid records, and confirm before generating."
            );
            return;
        }

        try {
            setStartingGeneration(true);
            clearMessages();

            const result = unwrap(
                await request(
                    `/projects/${projectId}/templates/${templateId}/generate`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json",
                        },
                        body: JSON.stringify({
                            confirm: true,
                            template_id: templateId,
                        }),
                    }
                )
            );

            setGenerationJob(result?.job || result);
            setSuccess(
                "Bulk generation has started. You can remain on this page while it runs."
            );
        } catch (requestError) {
            setError(
                errorMessage(
                    requestError,
                    "Unable to start bulk card generation."
                )
            );
        } finally {
            setStartingGeneration(false);
        }
    }

    async function openPreviewFullscreen() {
        if (!pdfPreviewFrameRef.current) {
            return;
        }

        if (document.fullscreenElement) {
            await document.exitFullscreen();
            return;
        }

        await pdfPreviewFrameRef.current.requestFullscreen();
    }

    async function downloadFinalPdf() {
        const jobId = generationJob?.id || generationJob?.job_id;

        if (!jobId) {
            setError("The completed generation job ID is missing.");
            return;
        }

        try {
            clearMessages();
            const response = await downloadGenerationJob(projectId, jobId);
            const url = URL.createObjectURL(response.data);
            const link = document.createElement("a");
            link.href = url;
            link.download = `student-id-cards-${projectId}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (requestError) {
            setError(
                errorMessage(requestError, "Unable to download the final PDF.")
            );
        }
    }

    async function refreshJobStatus() {
        if (!generationJob?.id && !generationJob?.job_id) {
            return;
        }

        const jobId = generationJob.id || generationJob.job_id;

        try {
            setLoadingStatus(true);

            const result = unwrap(
                await request(`/projects/${projectId}/generation-jobs/${jobId}`)
            );

            setGenerationJob(result?.job || result);
        } catch (requestError) {
            setError(
                errorMessage(requestError, "Unable to refresh generation status.")
            );
        } finally {
            setLoadingStatus(false);
        }
    }

    useEffect(() => {
        if (!isRunning) {
            return undefined;
        }

        const timer = window.setInterval(() => {
            refreshJobStatus();
        }, 3000);

        return () => window.clearInterval(timer);
    }, [isRunning, generationJob?.id, generationJob?.job_id]);

    return (
        <div className="min-h-screen bg-slate-100">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
                    <div className="flex min-w-0 items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1688bd]"
                            aria-label="Go back"
                        >
                            <ArrowLeft size={21} />
                        </button>

                        <div className="min-w-0">
                            <h1 className="flex items-center gap-2 text-xl font-bold text-[#07345d] sm:text-2xl">
                                <Images size={25} />
                                Bulk Card Generation
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                {templateName
                                    ? `Template: ${templateName}`
                                    : "Review records and generate student cards"}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                `/projects/${projectId}/templates/${templateId}/edit`
                            )
                        }
                        className="hidden rounded-lg border border-[#1688bd] bg-white px-4 py-2 text-sm font-semibold text-[#1688bd] transition hover:bg-[#eaf7fc] sm:inline-flex"
                    >
                        Back to Editor
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                {success && (
                    <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                        <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                        <span>{success}</span>
                    </div>
                )}

                {error && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <AlertCircle size={18} className="mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="space-y-6">
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <div className="mb-5 flex items-center gap-3">
                                <div className="rounded-xl bg-[#eaf7fc] p-3 text-[#1688bd]">
                                    <FileImage size={22} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-[#07345d]">
                                        1. Upload Student Photos
                                    </h2>
                                    <p className="text-sm text-slate-500">
                                        Select the photo files named with each
                                        student barcode.
                                    </p>
                                </div>
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                webkitdirectory="true"
                                directory="true"
                                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                                onChange={handlePhotoSelection}
                                className="block w-full cursor-pointer rounded-xl border border-slate-300 bg-slate-50 text-sm text-slate-600 file:mr-4 file:cursor-pointer file:border-0 file:bg-[#1688bd] file:px-4 file:py-3 file:font-semibold file:text-white hover:file:bg-[#11739f]"
                            />

                            <p className="mt-2 text-xs text-slate-500">
                                Select the folder containing barcode-named student photos, such as 00000001.jpg.
                            </p>

                            {photoFiles.length > 0 && (
                                <p className="mt-3 text-sm text-slate-600">
                                    {photoFiles.length} photo file(s) selected.
                                </p>
                            )}

                            <button
                                type="button"
                                onClick={uploadPhotos}
                                disabled={
                                    photoFiles.length === 0 || loadingPhotos
                                }
                                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1688bd] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#11739f] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {loadingPhotos ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <Upload size={18} />
                                )}
                                {loadingPhotos
                                    ? "Matching Photos..."
                                    : "Upload and Match Photos"}
                            </button>
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <div className="mb-5 flex items-center gap-3">
                                <div className="rounded-xl bg-[#eaf7fc] p-3 text-[#1688bd]">
                                    <FileText size={22} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-[#07345d]">
                                        2. Preview Sample Cards
                                    </h2>
                                    <p className="text-sm text-slate-500">
                                        Check real student data before generating
                                        the complete batch.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={loadPreview}
                                disabled={loadingPreview || !templateId}
                                className="inline-flex items-center gap-2 rounded-xl border border-[#1688bd] bg-white px-5 py-3 text-sm font-semibold text-[#1688bd] transition hover:bg-[#eaf7fc] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {loadingPreview ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <RefreshCw size={18} />
                                )}
                                {loadingPreview
                                    ? "Generating PDF preview..."
                                    : "Generate PDF Preview"}
                            </button>

                            {(summary || pdfPreviewUrl || pdfPreviewError) && (
                                <div className="mt-5 space-y-4">
                                    {pdfPreviewError && (
                                        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
                                            {pdfPreviewError}
                                        </p>
                                    )}

                                    {pdfPreviewUrl && (
                                        <div className="space-y-3">
                                            <div
                                                ref={pdfPreviewFrameRef}
                                                className="h-[75vh] min-h-[520px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                                            >
                                                <iframe
                                                    src={pdfPreviewUrl}
                                                    title="Student ID card PDF preview"
                                                    className="h-full w-full"
                                                />
                                            </div>

                                            <div className="flex flex-wrap gap-3">
                                                <button
                                                    type="button"
                                                    onClick={openPreviewFullscreen}
                                                    className="inline-flex items-center gap-2 rounded-xl bg-[#1688bd] px-4 py-2 text-sm font-semibold text-white hover:bg-[#11739f]"
                                                >
                                                    <Images size={17} />
                                                    Full Screen Preview
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={clearPdfPreview}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                                >
                                                    Clear Preview
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    </div>

                    <aside className="space-y-6">
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <h2 className="mb-2 text-lg font-bold text-[#07345d]">
                                3. Confirm and Generate
                            </h2>

                            <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={confirmed}
                                    onChange={(event) =>
                                        setConfirmed(event.target.checked)
                                    }
                                    disabled={!pdfPreviewUrl || isRunning}
                                    className="mt-1 h-4 w-4 accent-[#1688bd]"
                                />
                                <span>
                                    I reviewed the sample cards and confirm that
                                    the design and student data are ready for
                                    bulk generation.
                                </span>
                            </label>

                            {summary?.invalid_count > 0 && (
                                <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                                    Resolve invalid records before starting the
                                    complete generation.
                                </p>
                            )}

                            <button
                                type="button"
                                onClick={startGeneration}
                                disabled={!canGenerate}
                                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1688bd] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#11739f] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {startingGeneration ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <Play size={18} />
                                )}
                                {startingGeneration
                                    ? "Starting..."
                                    : "Generate Complete Batch"}
                            </button>
                        </section>

                        {generationJob && (
                            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <h2 className="text-lg font-bold text-[#07345d]">
                                        Generation Status
                                    </h2>

                                    <button
                                        type="button"
                                        onClick={refreshJobStatus}
                                        disabled={loadingStatus}
                                        className="rounded-lg p-2 text-[#1688bd] hover:bg-[#eaf7fc]"
                                        aria-label="Refresh generation status"
                                    >
                                        <RefreshCw
                                            size={18}
                                            className={
                                                loadingStatus
                                                    ? "animate-spin"
                                                    : ""
                                            }
                                        />
                                    </button>
                                </div>

                                <p className="mb-3 text-sm capitalize text-slate-600">
                                    Status:{" "}
                                    <span className="font-semibold">
                                        {jobStatus || "unknown"}
                                    </span>
                                </p>

                                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className="h-full rounded-full bg-[#1688bd] transition-all"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>

                                <p className="mt-2 text-right text-xs text-slate-500">
                                    {progress}% complete
                                </p>

                                {isCompleted && (
                                    <button
                                        type="button"
                                        onClick={downloadFinalPdf}
                                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700"
                                    >
                                        <Download size={18} />
                                        Download Final PDF
                                    </button>
                                )}

                                {isFailed && (
                                    <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                                        {generationJob.error ||
                                            "The generation job failed. Please review the records and try again."}
                                    </p>
                                )}
                            </section>
                        )}
                    </aside>
                </section>
            </main>
        </div>
    );
}

function SummaryCard({ label, value, color }) {
    const styles = {
        green: "bg-green-50 text-green-800",
        amber: "bg-amber-50 text-amber-800",
        red: "bg-red-50 text-red-800",
        blue: "bg-[#eaf7fc] text-[#1688bd]",
    };

    return (
        <div className={`rounded-xl p-3 ${styles[color] || styles.blue}`}>
            <p className="text-xs font-medium">{label}</p>
            <p className="mt-1 text-xl font-bold">{value}</p>
        </div>
    );
}

