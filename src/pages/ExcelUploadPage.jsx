import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    CheckCircle2,
    FileSpreadsheet,
    Eye,
    Upload,
    RefreshCw,
    AlertCircle,
    Database,
} from "lucide-react";

import {
    previewStudentExcel,
    importStudentExcel,
} from "../api/studentApi";

import {
    getTemplatesByProject,
    getTemplateElements,
} from "../api/templateApi";

function unwrapResponse(response) {
    const value = response?.data ?? response;

    if (value?.data !== undefined) {
        return value.data;
    }

    return value;
}

function getErrorMessage(error, fallback) {
    const data = error?.response?.data;

    if (typeof data?.message === "string") {
        return data.message;
    }

    if (data?.errors) {
        return Object.values(data.errors).flat().join(" ");
    }

    if (typeof error?.message === "string") {
        return error.message;
    }

    return fallback;
}

function normalizeTemplates(response) {
    const data = unwrapResponse(response);

    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data?.templates)) {
        return data.templates;
    }

    if (Array.isArray(data?.data)) {
        return data.data;
    }

    return [];
}

function normalizeElements(response) {
    const data = unwrapResponse(response);

    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data?.elements)) {
        return data.elements;
    }

    if (Array.isArray(data?.data)) {
        return data.data;
    }

    return [];
}

function normalizePreview(response) {
    const data = unwrapResponse(response);

    const rows =
        data?.rows ||
        data?.preview ||
        data?.records ||
        data?.data ||
        [];

    const columns =
        data?.columns ||
        (rows.length > 0 && typeof rows[0] === "object"
            ? Object.keys(rows[0])
            : []);

    return {
        columns: Array.isArray(columns) ? columns : [],
        rows: Array.isArray(rows) ? rows : [],
    };
}

function getElementLabel(element) {
    const type = element?.type || element?.element_type;

    if (type === "student_name") return "Student Name";
    if (type === "student_id") return "Student ID";
    if (type === "barcode") return "Barcode";
    if (type === "photo") return "Student Photo";
    if (type === "manufacture_date") return "Manufacture Date";

    return element?.name || element?.field_name || element?.text || type || "Element";
}

function getElementField(element) {
    return (
        element?.field_name ||
        element?.mapping?.source_field ||
        element?.dataMapping?.source_field ||
        element?.data_mapping?.source_field ||
        ""
    );
}

export default function ExcelUploadPage() {
    const { projectId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const routeTemplateId = location.state?.templateId
        ? String(location.state.templateId)
        : "";

    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState(routeTemplateId);
    const [templateElements, setTemplateElements] = useState([]);

    const [selectedFile, setSelectedFile] = useState(null);
    const [columns, setColumns] = useState([]);
    const [previewRows, setPreviewRows] = useState([]);
    const [mappings, setMappings] = useState({});
    const [importResult, setImportResult] = useState(null);

    const [loadingTemplates, setLoadingTemplates] = useState(true);
    const [loadingElements, setLoadingElements] = useState(false);
    const [processing, setProcessing] = useState(false);

    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const selectedTemplate = useMemo(
        () =>
            templates.find(
                (template) =>
                    String(template.id ?? template.template_id) ===
                    String(selectedTemplateId)
            ) || null,
        [templates, selectedTemplateId]
    );

    const dynamicElements = useMemo(
        () =>
            templateElements.filter((element) => {
                const type = element.type || element.element_type;
                return (
                    element.visible !== false &&
                    type !== "photo" &&
                    type !== "static_text"
                );
            }),
        [templateElements]
    );

    useEffect(() => {
        let cancelled = false;

        async function loadTemplates() {
            try {
                setLoadingTemplates(true);
                setErrorMessage("");

                const response = await getTemplatesByProject(projectId);
                const loadedTemplates = normalizeTemplates(response);

                if (cancelled) return;

                setTemplates(loadedTemplates);

                if (
                    routeTemplateId &&
                    loadedTemplates.some(
                        (template) =>
                            String(template.id ?? template.template_id) ===
                            routeTemplateId
                    )
                ) {
                    setSelectedTemplateId(routeTemplateId);
                } else if (!selectedTemplateId && loadedTemplates.length > 0) {
                    setSelectedTemplateId(
                        String(
                            loadedTemplates[0].id ??
                                loadedTemplates[0].template_id
                        )
                    );
                }
            } catch (error) {
                if (!cancelled) {
                    setErrorMessage(
                        getErrorMessage(error, "Unable to load templates.")
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoadingTemplates(false);
                }
            }
        }

        if (projectId) {
            loadTemplates();
        }

        return () => {
            cancelled = true;
        };
    }, [projectId, routeTemplateId]);

    useEffect(() => {
        let cancelled = false;

        async function loadTemplateElements() {
            if (!selectedTemplateId) {
                setTemplateElements([]);
                setMappings({});
                return;
            }

            try {
                setLoadingElements(true);
                setErrorMessage("");

                const response = await getTemplateElements(
                    projectId,
                    selectedTemplateId
                );

                if (!cancelled) {
                    setTemplateElements(normalizeElements(response));
                    setMappings({});
                }
            } catch (error) {
                if (!cancelled) {
                    setTemplateElements([]);
                    setErrorMessage(
                        getErrorMessage(
                            error,
                            "Unable to load the selected template elements."
                        )
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoadingElements(false);
                }
            }
        }

        loadTemplateElements();

        return () => {
            cancelled = true;
        };
    }, [projectId, selectedTemplateId]);

    function clearMessages() {
        setSuccessMessage("");
        setErrorMessage("");
    }

    function handleFileChange(event) {
        const file = event.target.files?.[0] || null;

        clearMessages();
        setSelectedFile(file);
        setColumns([]);
        setPreviewRows([]);
        setImportResult(null);
    }

    function handleMappingChange(elementId, column) {
        setMappings((previous) => ({
            ...previous,
            [elementId]: column,
        }));
    }

    async function handlePreview() {
        if (!projectId) {
            setErrorMessage("Project ID is missing.");
            return;
        }

        if (!selectedFile) {
            setErrorMessage("Please select an Excel file first.");
            return;
        }

        try {
            setProcessing(true);
            clearMessages();

            const response = await previewStudentExcel(
                projectId,
                selectedFile
            );

            const preview = normalizePreview(response);

            setColumns(preview.columns);
            setPreviewRows(preview.rows);
            setSuccessMessage("Excel preview loaded successfully.");
        } catch (error) {
            setErrorMessage(
                getErrorMessage(error, "Unable to preview the Excel file.")
            );
        } finally {
            setProcessing(false);
        }
    }

    async function handleImport() {
        if (!projectId) {
            setErrorMessage("Project ID is missing.");
            return;
        }

        if (!selectedFile) {
            setErrorMessage("Please select an Excel file first.");
            return;
        }

        if (!selectedTemplateId) {
            setErrorMessage("Please select a template before importing.");
            return;
        }

        try {
            setProcessing(true);
            clearMessages();

            const response = await importStudentExcel(
                projectId,
                selectedFile,
                selectedTemplateId,
                mappings
            );

            const result = unwrapResponse(response);
            setImportResult(result);
            setSuccessMessage("Excel file imported successfully.");

            // Redirect to bulk generation after the import succeeds.
            navigate(`/projects/${projectId}/bulk-generation`, {
                state: {
                    projectId: String(projectId),
                    templateId: String(selectedTemplateId),
                    templateName:
                        selectedTemplate?.name ||
                        selectedTemplate?.template_name ||
                        `Template ${selectedTemplateId}`,
                    importResult: result,
                },
            });
        } catch (error) {
            setErrorMessage(
                getErrorMessage(error, "Unable to import the Excel file.")
            );
        } finally {
            setProcessing(false);
        }
    }

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
                                <FileSpreadsheet size={25} />
                                Excel Upload
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Upload student data, preview the records, and
                                map Excel columns to your card template.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="hidden rounded-lg border border-[#1688bd] bg-white px-4 py-2 text-sm font-semibold text-[#1688bd] transition hover:bg-[#eaf7fc] sm:inline-flex"
                    >
                        Back to Editor
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                {successMessage && (
                    <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                        <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
                        <span>{successMessage}</span>
                    </div>
                )}

                {errorMessage && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <AlertCircle className="mt-0.5 shrink-0" size={18} />
                        <span>{errorMessage}</span>
                    </div>
                )}

                <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="space-y-6">
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <div className="mb-5 flex items-center gap-3">
                                <div className="rounded-xl bg-[#eaf7fc] p-3 text-[#1688bd]">
                                    <Database size={22} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-[#07345d]">
                                        Select Template
                                    </h2>
                                    <p className="text-sm text-slate-500">
                                        Choose the card design for these
                                        student records.
                                    </p>
                                </div>
                            </div>

                            <label
                                htmlFor="template"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                Template
                            </label>

                            <select
                                id="template"
                                value={selectedTemplateId}
                                onChange={(event) => {
                                    setSelectedTemplateId(event.target.value);
                                    setImportResult(null);
                                    setSuccessMessage("");
                                }}
                                disabled={loadingTemplates || processing}
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-[#1688bd] focus:ring-2 focus:ring-[#1688bd]/20 disabled:bg-slate-100"
                            >
                                <option value="">
                                    {loadingTemplates
                                        ? "Loading templates..."
                                        : "Select a template"}
                                </option>

                                {templates.map((template) => {
                                    const id =
                                        template.id ?? template.template_id;
                                    const name =
                                        template.name ||
                                        template.template_name ||
                                        `Template ${id}`;

                                    return (
                                        <option key={id} value={id}>
                                            {name}
                                        </option>
                                    );
                                })}
                            </select>

                            {selectedTemplate && (
                                <p className="mt-2 text-xs text-slate-500">
                                    Selected:{" "}
                                    <span className="font-semibold">
                                        {selectedTemplate.name ||
                                            selectedTemplate.template_name}
                                    </span>
                                </p>
                            )}
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <div className="mb-5 flex items-center gap-3">
                                <div className="rounded-xl bg-[#eaf7fc] p-3 text-[#1688bd]">
                                    <Upload size={22} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-[#07345d]">
                                        Upload Excel File
                                    </h2>
                                    <p className="text-sm text-slate-500">
                                        Use a validated .xlsx, .xls, or .csv
                                        file.
                                    </p>
                                </div>
                            </div>

                            <label
                                htmlFor="excel-file"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                Select validated Excel file
                            </label>

                            <input
                                id="excel-file"
                                type="file"
                                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                                onChange={handleFileChange}
                                disabled={processing}
                                className="block w-full cursor-pointer rounded-xl border border-slate-300 bg-slate-50 text-sm text-slate-600 file:mr-4 file:cursor-pointer file:border-0 file:bg-[#1688bd] file:px-4 file:py-3 file:font-semibold file:text-white hover:file:bg-[#11739f] disabled:cursor-not-allowed disabled:opacity-60"
                            />

                            {selectedFile && (
                                <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                                    Selected file:{" "}
                                    <span className="font-semibold">
                                        {selectedFile.name}
                                    </span>
                                </div>
                            )}

                            <div className="mt-5 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={handlePreview}
                                    disabled={!selectedFile || processing}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#1688bd] bg-white px-5 py-3 text-sm font-semibold text-[#1688bd] transition hover:bg-[#eaf7fc] focus:outline-none focus:ring-2 focus:ring-[#1688bd]/30 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {processing ? (
                                        <RefreshCw
                                            size={18}
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <Eye size={18} />
                                    )}
                                    Preview Excel
                                </button>

                                <button
                                    type="button"
                                    onClick={handleImport}
                                    disabled={
                                        !selectedFile ||
                                        !selectedTemplateId ||
                                        processing
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1688bd] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#11739f] focus:outline-none focus:ring-2 focus:ring-[#1688bd]/30 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {processing ? (
                                        <RefreshCw
                                            size={18}
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <Upload size={18} />
                                    )}
                                    Import Excel
                                </button>
                            </div>
                        </section>

                        {columns.length > 0 && (
                            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                                <h2 className="mb-4 text-lg font-bold text-[#07345d]">
                                    Excel Columns
                                </h2>

                                <div className="flex flex-wrap gap-2">
                                    {columns.map((column) => (
                                        <span
                                            key={column}
                                            className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700"
                                        >
                                            {column}
                                        </span>
                                    ))}
                                </div>
                            </section>
                        )}

                        {previewRows.length > 0 && (
                            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                    <h2 className="text-lg font-bold text-[#07345d]">
                                        Excel Preview
                                    </h2>
                                    <span className="rounded-full bg-[#eaf7fc] px-3 py-1 text-xs font-semibold text-[#1688bd]">
                                        {previewRows.length} sample rows
                                    </span>
                                </div>

                                <div className="overflow-x-auto rounded-xl border border-slate-200">
                                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                {columns.map((column) => (
                                                    <th
                                                        key={column}
                                                        className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700"
                                                    >
                                                        {column}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>

                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {previewRows.map(
                                                (row, rowIndex) => (
                                                    <tr
                                                        key={rowIndex}
                                                        className="hover:bg-slate-50"
                                                    >
                                                        {columns.map(
                                                            (column) => (
                                                                <td
                                                                    key={column}
                                                                    className="whitespace-nowrap px-4 py-3 text-slate-600"
                                                                >
                                                                    {String(
                                                                        row?.[
                                                                            column
                                                                        ] ?? ""
                                                                    )}
                                                                </td>
                                                            )
                                                        )}
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}
                    </div>

                    <aside className="space-y-6">
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <h2 className="mb-2 text-lg font-bold text-[#07345d]">
                                Column Mapping
                            </h2>
                            <p className="mb-5 text-sm leading-6 text-slate-500">
                                Connect Excel columns to the dynamic fields in
                                the selected card template.
                            </p>

                            {loadingElements ? (
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <RefreshCw
                                        size={17}
                                        className="animate-spin"
                                    />
                                    Loading template elements...
                                </div>
                            ) : dynamicElements.length === 0 ? (
                                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                                    Select a template containing dynamic
                                    elements to configure mappings.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {dynamicElements.map((element) => {
                                        const id =
                                            element.id ??
                                            element.element_id ??
                                            getElementLabel(element);

                                        return (
                                            <div key={id}>
                                                <label
                                                    htmlFor={`mapping-${id}`}
                                                    className="mb-2 block text-sm font-semibold text-slate-700"
                                                >
                                                    {getElementLabel(element)}
                                                </label>

                                                <select
                                                    id={`mapping-${id}`}
                                                    value={mappings[id] || ""}
                                                    onChange={(event) =>
                                                        handleMappingChange(
                                                            id,
                                                            event.target.value
                                                        )
                                                    }
                                                    disabled={
                                                        columns.length === 0 ||
                                                        processing
                                                    }
                                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#1688bd] focus:ring-2 focus:ring-[#1688bd]/20 disabled:bg-slate-100"
                                                >
                                                    <option value="">
                                                        {getElementField(
                                                            element
                                                        ) ||
                                                            "Select Excel column"}
                                                    </option>

                                                    {columns.map((column) => (
                                                        <option
                                                            key={column}
                                                            value={column}
                                                        >
                                                            {column}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        {importResult && (
                            <section className="rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm sm:p-6">
                                <h2 className="mb-4 text-lg font-bold text-green-900">
                                    Import Result
                                </h2>

                                <div className="space-y-3 text-sm text-green-800">
                                    <div className="flex items-center justify-between gap-3">
                                        <span>Imported records</span>
                                        <strong>
                                            {importResult.imported_count ??
                                                importResult.imported ??
                                                0}
                                        </strong>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span>Updated records</span>
                                        <strong>
                                            {importResult.updated_count ??
                                                importResult.updated ??
                                                0}
                                        </strong>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span>Skipped records</span>
                                        <strong>
                                            {importResult.skipped_count ??
                                                importResult.skipped ??
                                                0}
                                        </strong>
                                    </div>
                                </div>
                            </section>
                        )}
                    </aside>
                </section>
            </main>
        </div>
    );
}
