import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    Save,
    Plus,
    Trash2,
    Move,
    Image as ImageIcon,
    Barcode,
    Type,
    User,
    CreditCard,
    Upload,
    FileSpreadsheet,
    RefreshCw,
} from "lucide-react";

import {
    getTemplateConfiguration,
    updateTemplateConfiguration,
    getTemplateDesignPreview,
    uploadTemplateDesign,
} from "../api/templateApi";

const DEFAULT_FORM = {
    name: "",
    type: "static_text",
    side: "front",
    x_mm: 5,
    y_mm: 5,
    width_mm: 40,
    height_mm: 10,
    text: "",
    font_size: 12,
    text_color: "#111827",
    background_color: "#ffffff",
    opacity: 1,
    show_background: true,
};

const ELEMENT_DEFAULTS = {
    photo: {
        width_mm: 25,
        height_mm: 30,
        text: "",
        show_background: true,
    },
    barcode: {
        width_mm: 55,
        height_mm: 12,
        text: "",
        show_background: true,
    },
    student_name: {
        width_mm: 55,
        height_mm: 8,
        text: "Student Name",
        show_background: false,
    },
    student_id: {
        width_mm: 45,
        height_mm: 8,
        text: "Student ID",
        font_size: 12,
        text_color: "#111827",
        background_color: "#ffffff",
        opacity: 1,
        show_background: true,
    },
    manufacture_date: {
        width_mm: 45,
        height_mm: 8,
        text: "Manufacture Date: {{manufacture_date}}",
        font_size: 10,
        text_color: "#111827",
        background_color: "#ffffff",
        opacity: 0,
        show_background: false,
    },
    static_text: {
        width_mm: 40,
        height_mm: 10,
        text: "Sample Text",
        show_background: false,
    },
};

function getResponseData(response) {
    if (!response) {
        return null;
    }

    if (response.data?.template) {
        return response.data;
    }

    if (response.template) {
        return response;
    }

    if (response.data?.data) {
        return response.data.data;
    }

    return response.data || response;
}

function getElementList(response) {
    const data = getResponseData(response);

    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data?.elements)) {
        return data.elements;
    }

    return [];
}

function hexToRgba(hex, opacity = 1) {
    const value = String(hex || "#ffffff").replace("#", "");
    const normalized = value.length === 3
        ? value.split("").map((char) => char + char).join("")
        : value;
    const red = parseInt(normalized.substring(0, 2), 16) || 255;
    const green = parseInt(normalized.substring(2, 4), 16) || 255;
    const blue = parseInt(normalized.substring(4, 6), 16) || 255;
    return `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(1, Number(opacity) || 0))})`;
}

function normalizeElement(element) {
    const position = element.position || {};
    const size = element.size || {};

    return {
        ...element,
        side: element.side || "front",
        type: element.type || "static_text",
        name: element.name || "",
        field_name: element.field_name || null,

        x_mm: Number(
            element.x_mm ??
                position.x_mm ??
                position.x ??
                element.x ??
                0
        ),

        y_mm: Number(
            element.y_mm ??
                position.y_mm ??
                position.y ??
                element.y ??
                0
        ),

        width_mm: Number(
            element.width_mm ??
                size.width_mm ??
                size.width ??
                element.width ??
                20
        ),

        height_mm: Number(
            element.height_mm ??
                size.height_mm ??
                size.height ??
                element.height ??
                10
        ),

        visible: element.visible !== false,
        z_index: Number(element.z_index ?? 1),
        text: element.text || element.properties?.text || "",
        mapping: element.mapping || null,
        properties: {
            font_size: 12,
            text_color: "#111827",
            background_color: "#ffffff",
            opacity: 1,
            show_background: element.type === "manufacture_date" ? false : true,
            ...(element.properties || {}),
        },
    };
}

function getElementLabel(element) {
    if (element.type === "photo") {
        return "Student Photo";
    }

    if (element.type === "barcode") {
        return "Barcode";
    }

    if (element.type === "student_name") {
        return "Student Name";
    }

    if (element.type === "student_id") {
        return "Student ID";
    }

    if (element.type === "manufacture_date") {
        return "Manufacture Date";
    }

    return element.text || element.name || "Element";
}

function getElementIcon(type) {
    if (type === "photo") {
        return <ImageIcon size={16} />;
    }

    if (type === "barcode") {
        return <Barcode size={16} />;
    }

    if (type === "student_name") {
        return <User size={16} />;
    }

    if (type === "student_id") {
        return <CreditCard size={16} />;
    }

    return <Type size={16} />;
}

function getErrorMessage(error, fallback) {
    const responseData = error?.response?.data;

    if (typeof responseData?.message === "string") {
        return responseData.message;
    }

    if (responseData?.errors) {
        return Object.values(responseData.errors)
            .flat()
            .join(" ");
    }

    if (typeof error?.message === "string") {
        return error.message;
    }

    return fallback;
}

export default function TemplateEditor() {
    const { projectId, templateId } = useParams();
    const navigate = useNavigate();

    const canvasRef = useRef(null);
    const previewUrlsRef = useRef([]);

    const [template, setTemplate] = useState(null);
    const [elements, setElements] = useState([]);
    const [selectedElementId, setSelectedElementId] = useState(null);
    const [activeSide, setActiveSide] = useState("front");

    const [elementForm, setElementForm] = useState(DEFAULT_FORM);

    const [frontPreview, setFrontPreview] = useState("");
    const [backPreview, setBackPreview] = useState("");

    const [frontFile, setFrontFile] = useState(null);
    const [backFile, setBackFile] = useState(null);
    const [designPdfFile, setDesignPdfFile] = useState(null);
    const [deletedElementIds, setDeletedElementIds] = useState([]);

    const [loading, setLoading] = useState(true);
    const [uploadingDesign, setUploadingDesign] = useState(false);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const selectedElement = useMemo(() => {
        return (
            elements.find(
                (element) => String(element.id) === String(selectedElementId)
            ) || null
        );
    }, [elements, selectedElementId]);

    const widthMm = Number(
        template?.width_mm ||
            template?.dimensions?.width_mm ||
            template?.width ||
            92
    );

    const heightMm = Number(
        template?.height_mm ||
            template?.dimensions?.height_mm ||
            template?.height ||
            57
    );

    const visibleElements = elements.filter(
        (element) =>
            element.side === activeSide && element.visible !== false
    );

    useEffect(() => {
        loadEditorData();

        return () => {
            previewUrlsRef.current.forEach((url) => {
                URL.revokeObjectURL(url);
            });
        };
    }, [projectId, templateId]);

    useEffect(() => {
        if (!selectedElement) {
            setElementForm({
                ...DEFAULT_FORM,
                side: activeSide,
            });
            return;
        }

        setElementForm({
            name: selectedElement.name || "",
            type: selectedElement.type || "static_text",
            side: selectedElement.side || activeSide,
            x_mm: selectedElement.x_mm,
            y_mm: selectedElement.y_mm,
            width_mm: selectedElement.width_mm,
            height_mm: selectedElement.height_mm,
            text:
                selectedElement.text ||
                selectedElement.properties?.text ||
                "",
            font_size:
                selectedElement.properties?.font_size ||
                selectedElement.font_size ||
                12,
            text_color: selectedElement.properties?.text_color || "#111827",
            background_color: selectedElement.properties?.background_color || "#ffffff",
            opacity: Number(selectedElement.properties?.opacity ?? 1),
            show_background: selectedElement.properties?.show_background !== false,
        });
    }, [selectedElement, activeSide]);

    async function loadEditorData() {
        try {
            setLoading(true);
            setError("");
            setSuccess("");

            const response = await getTemplateConfiguration(
                projectId,
                templateId
            );

            const data = getResponseData(response);

            const loadedTemplate =
                data?.template ||
                data?.project_template ||
                data;

            const loadedElements = getElementList(response).map(
                normalizeElement
            );

            setTemplate(loadedTemplate);
            setElements(loadedElements);

            if (loadedElements.length > 0) {
                setSelectedElementId(loadedElements[0].id);
            }

            await Promise.all([
                loadDesignPreview("front"),
                loadDesignPreview("back"),
            ]);
        } catch (requestError) {
            console.error(requestError);

            setError(
                getErrorMessage(
                    requestError,
                    "Unable to load template configuration."
                )
            );
        } finally {
            setLoading(false);
        }
    }

    async function loadDesignPreview(side) {
        try {
            const response = await getTemplateDesignPreview(
                projectId,
                templateId,
                side
            );

            const contentType =
                response.headers?.["content-type"] ||
                response.headers?.["Content-Type"] ||
                "";

            if (!contentType.includes("image/")) {
                return;
            }

            const imageUrl = URL.createObjectURL(response.data);

            previewUrlsRef.current.push(imageUrl);

            if (side === "front") {
                if (frontPreview) URL.revokeObjectURL(frontPreview);
                setFrontPreview(imageUrl);
            } else {
                if (backPreview) URL.revokeObjectURL(backPreview);
                setBackPreview(imageUrl);
            }
        } catch (requestError) {
            console.warn(
                `Unable to load ${side} design preview.`,
                requestError
            );
        }
    }

    function handleUploadFileChange(event, fileType) {
        const file = event.target.files?.[0] || null;

        if (fileType === "pdf") {
            setDesignPdfFile(file);
            setFrontFile(null);
            setBackFile(null);
        }

        if (fileType === "front") {
            setFrontFile(file);
            setDesignPdfFile(null);
        }

        if (fileType === "back") {
            setBackFile(file);
            setDesignPdfFile(null);
        }
    }

    async function handleDesignUpload(event) {
        event.preventDefault();

        if (!frontFile && !backFile && !designPdfFile) {
            setError("Please select a design file first.");
            setSuccess("");
            return;
        }

        const formData = new FormData();

        if (designPdfFile) {
            formData.append("design_pdf", designPdfFile);
        } else {
            if (frontFile) {
                formData.append("front_design", frontFile);
            }

            if (backFile) {
                formData.append("back_design", backFile);
            }
        }

        try {
            setUploadingDesign(true);
            setError("");
            setSuccess("");

            const response = await uploadTemplateDesign(
                projectId,
                templateId,
                formData
            );

            const data = getResponseData(response);

            if (data?.template) {
                setTemplate(data.template);
            }

            setFrontFile(null);
            setBackFile(null);
            setDesignPdfFile(null);

            await Promise.all([
                loadDesignPreview("front"),
                loadDesignPreview("back"),
            ]);

            setSuccess("Template design uploaded successfully.");
        } catch (requestError) {
            console.error(requestError);

            setError(
                getErrorMessage(
                    requestError,
                    "Design upload failed."
                )
            );
        } finally {
            setUploadingDesign(false);
        }
    }

    function updateSelectedElement(field, value) {
        if (!selectedElementId) {
            return;
        }

        setElements((previous) =>
            previous.map((element) => {
                if (
                    String(element.id) !== String(selectedElementId)
                ) {
                    return element;
                }

                const numericFields = [
                    "x_mm",
                    "y_mm",
                    "width_mm",
                    "height_mm",
                    "font_size",
                ];

                if (field === "font_size") {
                    return {
                        ...element,
                        properties: {
                            ...(element.properties || {}),
                            font_size: Number(value) || 12,
                        },
                    };
                }

                if (["text_color", "background_color", "opacity", "show_background"].includes(field)) {
                    return {
                        ...element,
                        properties: {
                            ...(element.properties || {}),
                            [field]: field === "opacity" ? Number(value) : value,
                        },
                    };
                }

                if (field === "text") {
                    return {
                        ...element,
                        text: value,
                        properties: {
                            ...(element.properties || {}),
                            text: value,
                        },
                    };
                }

                return {
                    ...element,
                    [field]: numericFields.includes(field)
                        ? Number(value)
                        : value,
                };
            })
        );

        setElementForm((previous) => ({
            ...previous,
            [field]: value,
        }));
    }

    function handleFormChange(event) {
        const { name, value } = event.target;

        setElementForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        if (selectedElementId) {
            updateSelectedElement(name, value);
        }
    }

    function handleTypeChange(event) {
        const type = event.target.value;
        const defaults =
            ELEMENT_DEFAULTS[type] || ELEMENT_DEFAULTS.static_text;

        const nextForm = {
            ...DEFAULT_FORM,
            ...elementForm,
            type,
            width_mm: defaults.width_mm,
            height_mm: defaults.height_mm,
            text: defaults.text,
            font_size: defaults.font_size ?? elementForm.font_size ?? 12,
            text_color: defaults.text_color ?? elementForm.text_color ?? "#111827",
            background_color: defaults.background_color ?? elementForm.background_color ?? "#ffffff",
            opacity: defaults.opacity ?? elementForm.opacity ?? 1,
            show_background: defaults.show_background !== false,
        };
        setElementForm(nextForm);
        if (selectedElementId) {
            Object.entries(nextForm).forEach(([field, value]) => {
                if (["name", "type", "side", "x_mm", "y_mm", "width_mm", "height_mm", "text", "font_size", "text_color", "background_color", "opacity", "show_background"].includes(field)) {
                    updateSelectedElement(field, value);
                }
            });
        }
    }

    function handleAddElement(event) {
        event.preventDefault();

        const defaults =
            ELEMENT_DEFAULTS[elementForm.type] || ELEMENT_DEFAULTS.static_text;
        const nextProperties = {
            font_size: Number(elementForm.font_size) || 12,
            text: elementForm.text || defaults.text,
            text_color: elementForm.text_color || "#111827",
            background_color: elementForm.background_color || "#ffffff",
            opacity: Number(elementForm.opacity ?? 1),
            show_background: elementForm.show_background !== false,
        };

        // When an element is selected, this button updates that element instead
        // of creating a duplicate. Changes remain local until 
        // .
        if (selectedElementId) {
            setElements((previous) =>
                previous.map((element) =>
                    String(element.id) === String(selectedElementId)
                        ? normalizeElement({
                              ...element,
                              name:
                                  elementForm.name.trim() ||
                                  getElementLabel({
                                      type: elementForm.type,
                                      text: elementForm.text || defaults.text,
                                  }),
                              type: elementForm.type,
                              side: elementForm.side || element.side || activeSide,
                              x_mm: Number(elementForm.x_mm) || 0,
                              y_mm: Number(elementForm.y_mm) || 0,
                              width_mm: Number(elementForm.width_mm) || defaults.width_mm,
                              height_mm: Number(elementForm.height_mm) || defaults.height_mm,
                              text: elementForm.text || defaults.text,
                              properties: {
                                  ...(element.properties || {}),
                                  ...nextProperties,
                              },
                          })
                        : element
                )
            );
            setSuccess("Element updated locally. Click Save Template to save it.");
            setError("");
            return;
        }

        const newElement = normalizeElement({
            id: `temporary-${Date.now()}`,
            name:
                elementForm.name.trim() ||
                getElementLabel({
                    type: elementForm.type,
                    text: elementForm.text || defaults.text,
                }),
            type: elementForm.type,
            side: activeSide,
            x_mm: Number(elementForm.x_mm) || 0,
            y_mm: Number(elementForm.y_mm) || 0,
            width_mm: Number(elementForm.width_mm) || defaults.width_mm,
            height_mm: Number(elementForm.height_mm) || defaults.height_mm,
            text: elementForm.text || defaults.text,
            visible: true,
            z_index: elements.length + 1,
            properties: nextProperties,
        });

        setElements((previous) => [...previous, newElement]);
        setSelectedElementId(newElement.id);
        setSuccess("Element added locally. Click Save Template to save it.");
        setError("");
    }

    function handleDeleteElement(elementId = selectedElementId) {
        if (!elementId) {
            return;
        }

        const existingElement = elements.find(
            (element) => String(element.id) === String(elementId)
        );
        if (existingElement?.id && !String(existingElement.id).startsWith("temporary-")) {
            setDeletedElementIds((previous) =>
                previous.includes(existingElement.id)
                    ? previous
                    : [...previous, existingElement.id]
            );
        }

        setElements((previous) =>
            previous.filter(
                (element) => String(element.id) !== String(elementId)
            )
        );

        if (String(selectedElementId) === String(elementId)) {
            setSelectedElementId(null);
        }

        setSuccess(
            "Element removed locally. Click Save Template to confirm."
        );
        setError("");
    }

    function getPointerPosition(event) {
        const canvas = canvasRef.current;

        if (!canvas) {
            return null;
        }

        const rect = canvas.getBoundingClientRect();

        if (!rect.width || !rect.height) {
            return null;
        }

        const x =
            ((event.clientX - rect.left) / rect.width) *
            widthMm;

        const y =
            ((event.clientY - rect.top) / rect.height) *
            heightMm;

        return {
            x_mm: Math.max(0, Math.min(x, widthMm)),
            y_mm: Math.max(0, Math.min(y, heightMm)),
        };
    }

    function handleElementPointerDown(event, element) {
        event.stopPropagation();
        event.preventDefault();

        setSelectedElementId(element.id);

        const start = getPointerPosition(event);

        if (!start) {
            return;
        }

        const startElement = {
            x_mm: element.x_mm,
            y_mm: element.y_mm,
        };

        function handlePointerMove(moveEvent) {
            const current = getPointerPosition(moveEvent);

            if (!current) {
                return;
            }

            const nextX = Math.max(
                0,
                Math.min(
                    widthMm - element.width_mm,
                    startElement.x_mm +
                        current.x_mm -
                        start.x_mm
                )
            );

            const nextY = Math.max(
                0,
                Math.min(
                    heightMm - element.height_mm,
                    startElement.y_mm +
                        current.y_mm -
                        start.y_mm
                )
            );

            setElements((previous) =>
                previous.map((item) =>
                    String(item.id) === String(element.id)
                        ? {
                              ...item,
                              x_mm: Number(nextX.toFixed(2)),
                              y_mm: Number(nextY.toFixed(2)),
                          }
                        : item
                )
            );

            setElementForm((previous) => ({
                ...previous,
                x_mm: Number(nextX.toFixed(2)),
                y_mm: Number(nextY.toFixed(2)),
            }));
        }

        function handlePointerUp() {
            window.removeEventListener(
                "pointermove",
                handlePointerMove
            );

            window.removeEventListener(
                "pointerup",
                handlePointerUp
            );
        }

        window.addEventListener(
            "pointermove",
            handlePointerMove
        );

        window.addEventListener(
            "pointerup",
            handlePointerUp,
            { once: true }
        );
    }

    function handleResizePointerDown(event, element) {
        event.stopPropagation();
        event.preventDefault();

        setSelectedElementId(element.id);

        const start = getPointerPosition(event);

        if (!start) {
            return;
        }

        const startSize = {
            width_mm: element.width_mm,
            height_mm: element.height_mm,
        };

        function handlePointerMove(moveEvent) {
            const current = getPointerPosition(moveEvent);

            if (!current) {
                return;
            }

            const nextWidth = Math.max(
                5,
                Math.min(
                    widthMm - element.x_mm,
                    startSize.width_mm +
                        current.x_mm -
                        start.x_mm
                )
            );

            const nextHeight = Math.max(
                5,
                Math.min(
                    heightMm - element.y_mm,
                    startSize.height_mm +
                        current.y_mm -
                        start.y_mm
                )
            );

            setElements((previous) =>
                previous.map((item) =>
                    String(item.id) === String(element.id)
                        ? {
                              ...item,
                              width_mm: Number(
                                  nextWidth.toFixed(2)
                              ),
                              height_mm: Number(
                                  nextHeight.toFixed(2)
                              ),
                          }
                        : item
                )
            );

            setElementForm((previous) => ({
                ...previous,
                width_mm: Number(nextWidth.toFixed(2)),
                height_mm: Number(nextHeight.toFixed(2)),
            }));
        }

        function handlePointerUp() {
            window.removeEventListener(
                "pointermove",
                handlePointerMove
            );

            window.removeEventListener(
                "pointerup",
                handlePointerUp
            );
        }

        window.addEventListener(
            "pointermove",
            handlePointerMove
        );

        window.addEventListener(
            "pointerup",
            handlePointerUp,
            { once: true }
        );
    }

    async function handleSaveTemplate() {
        try {
            setSaving(true);
            setError("");
            setSuccess("");

            const payload = {
                width_mm: widthMm,
                height_mm: heightMm,

                delete_element_ids: deletedElementIds,
                elements: elements.map((element) => ({
                    ...(String(element.id).startsWith("temporary-")
                        ? {}
                        : { id: element.id }),

                    side: element.side,
                    type: element.type,
                    name: element.name || null,
                    field_name: element.field_name || null,

                    x_mm: Number(element.x_mm),
                    y_mm: Number(element.y_mm),
                    width_mm: Number(element.width_mm),
                    height_mm: Number(element.height_mm),

                    visible: element.visible !== false,

                    properties: {
                        ...(element.properties || {}),
                        ...(element.text
                            ? { text: element.text }
                            : {}),
                    },

                    z_index: Number(element.z_index || 1),

                    mapping: element.mapping
                        ? {
                              source_field:
                                  element.mapping.source_field,
                              is_required:
                                  element.mapping.is_required ??
                                  false,
                          }
                        : null,
                })),
            };

            const response = await updateTemplateConfiguration(
                projectId,
                templateId,
                payload
            );

            const savedElements = getElementList(response).map(
                normalizeElement
            );

            setElements(savedElements);
            setDeletedElementIds([]);

            setSuccess(
                "Template configuration saved successfully."
            );
        } catch (requestError) {
            console.error(requestError);

            setError(
                getErrorMessage(
                    requestError,
                    "Unable to save template configuration."
                )
            );
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-100">
                <p className="text-slate-600">
                    Loading template editor...
                </p>
            </div>
        );
    }

    function handleUploadExcel() {
        if (!projectId || !templateId) {
            setError(
                "Unable to open Excel upload because the project or template ID is missing."
            );
            setSuccess("");
            return;
        }

        navigate(`/projects/${projectId}/excel-upload`, {
            state: {
                projectId: String(projectId),
                templateId: String(templateId),
                templateName:
                    template?.name ||
                    template?.template_name ||
                    `Template ${templateId}`,
            },
        });
    }

    return (
        <div className="min-h-screen bg-slate-100">
            <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                        >
                            <ArrowLeft size={20} />
                        </button>

                        <div>
                            <h1 className="text-xl font-bold text-[#07345d]">
                                Template Editor
                            </h1>

                            <p className="text-sm text-slate-500">
                                {template?.name ||
                                    template?.template_name ||
                                    "Unnamed Template"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleUploadExcel}
                            className="flex items-center gap-2 rounded-lg border border-[#1688bd] bg-white px-4 py-2 font-medium text-[#1688bd] transition hover:bg-[#eaf7fc] focus:outline-none focus:ring-2 focus:ring-[#1688bd] focus:ring-offset-2"
                        >
                            <FileSpreadsheet size={18} />
                            Upload Excel
                        </button>

                        <button
                            type="button"
                            onClick={handleSaveTemplate}
                            disabled={saving}
                            className="flex items-center gap-2 rounded-lg bg-[#1688bd] px-4 py-2 font-medium text-white transition hover:bg-[#11739f] focus:outline-none focus:ring-2 focus:ring-[#1688bd] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Save size={18} />
                            {saving ? "Saving..." : "Save Template"}
                        </button>
                    </div>
                </div>
            </header>

            <main className="grid grid-cols-1 gap-6 px-4 py-6 sm:px-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
                <aside className="space-y-6">
                    <section className="rounded-xl bg-white p-4 shadow-sm">
                        <h2 className="mb-4 text-lg font-semibold text-[#07345d]">
                            Upload Design
                        </h2>

                        <form
                            onSubmit={handleDesignUpload}
                            className="space-y-4"
                        >
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Two-page PDF
                                </label>

                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={(event) =>
                                        handleUploadFileChange(
                                            event,
                                            "pdf"
                                        )
                                    }
                                    className="w-full text-sm"
                                />

                                <p className="mt-1 text-xs text-slate-500">
                                    Page 1 is front and page 2 is back.
                                </p>
                            </div>

                            <div className="border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
                                OR upload separate designs
                            </div>

                            <div>
                                <label>Front Design</label>

                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,application/pdf"
                                    onChange={(event) => {
                                        setFrontFile(event.target.files?.[0] || null);
                                        setDesignPdfFile(null);
                                    }}
                                />
                            </div>

                            <div>
                                <label>Back Design</label>

                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,application/pdf"
                                    onChange={(event) => {
                                        setBackFile(event.target.files?.[0] || null);
                                        setDesignPdfFile(null);
                                    }}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={uploadingDesign}
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1688bd] px-4 py-2 text-white hover:bg-[#11739f] disabled:opacity-50"
                            >
                                {uploadingDesign ? (
                                    <RefreshCw
                                        size={17}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Upload size={17} />
                                )}

                                {uploadingDesign
                                    ? "Uploading..."
                                    : "Upload Design"}
                            </button>
                        </form>
                    </section>

                    <section className="rounded-xl bg-white p-4 shadow-sm">
                        <h2 className="mb-4 text-lg font-semibold text-[#07345d]">
                            Elements
                        </h2>

                        <div className="mb-4 flex gap-2">
                            <button
                                type="button"
                                onClick={() => setActiveSide("front")}
                                className={`flex-1 rounded-lg px-3 py-2 text-sm ${
                                    activeSide === "front"
                                        ? "bg-[#1688bd] text-white"
                                        : "bg-slate-100 text-slate-600"
                                }`}
                            >
                                Front
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveSide("back")}
                                className={`flex-1 rounded-lg px-3 py-2 text-sm ${
                                    activeSide === "back"
                                        ? "bg-[#1688bd] text-white"
                                        : "bg-slate-100 text-slate-600"
                                }`}
                            >
                                Back
                            </button>
                        </div>

                        <div className="space-y-2">
                            {elements
                                .filter(
                                    (element) =>
                                        element.side === activeSide
                                )
                                .map((element) => (
                                    <div
                                        key={element.id}
                                        className={`flex items-center justify-between rounded-lg border p-3 ${
                                            String(
                                                selectedElementId
                                            ) === String(element.id)
                                                ? "border-[#1688bd] bg-[#eaf7fc]"
                                                : "border-slate-200"
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSelectedElementId(
                                                    element.id
                                                )
                                            }
                                            className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                        >
                                            {getElementIcon(
                                                element.type
                                            )}

                                            <span className="truncate text-sm font-medium text-slate-700">
                                                {getElementLabel(
                                                    element
                                                )}
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleDeleteElement(
                                                    element.id
                                                )
                                            }
                                            className="rounded p-1 text-red-500 hover:bg-red-50"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                ))}
                        </div>
                    </section>
                </aside>

                <section className="rounded-xl bg-slate-200 p-4 shadow-sm sm:p-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold text-[#07345d]">
                            Design Preview
                        </h2>

                        <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-600">
                            {widthMm}mm × {heightMm}mm
                        </span>
                    </div>

                    <div className="flex min-h-[500px] items-center justify-center overflow-auto rounded-lg bg-slate-300 p-4">
                        <div
                            ref={canvasRef}
                            onPointerDown={(event) => {
                                if (event.target === event.currentTarget) {
                                    setSelectedElementId(null);
                                    setSuccess("");
                                }
                            }}
                            className="relative overflow-hidden border-2 border-slate-400 bg-white shadow-xl"
                            style={{
                                width: "min(100%, 650px)",
                                aspectRatio: `${widthMm} / ${heightMm}`,
                                backgroundImage:
                                    activeSide === "front"
                                        ? frontPreview
                                            ? `url("${frontPreview}")`
                                            : "none"
                                        : backPreview
                                        ? `url("${backPreview}")`
                                        : "none",
                                backgroundSize: "100% 100%",
                                backgroundPosition: "center",
                                backgroundRepeat: "no-repeat",
                                touchAction: "none",
                            }}
                        >
                            {visibleElements.map((element) => (
                                <div
                                    key={element.id}
                                    onPointerDown={(event) =>
                                        handleElementPointerDown(
                                            event,
                                            element
                                        )
                                    }
                                    className={`absolute select-none overflow-visible ${
                                        ["static_text", "student_name", "student_id", "manufacture_date"].includes(element.type)
                                            ? ""
                                            : "border border-dashed px-1"
                                    } ${
                                        String(selectedElementId) === String(element.id)
                                            ? "ring-2 ring-[#1688bd] ring-offset-1"
                                            : ""
                                    }`}
                                    style={{
                                        left: `${
                                            (element.x_mm / widthMm) *
                                            100
                                        }%`,
                                        top: `${
                                            (element.y_mm / heightMm) *
                                            100
                                        }%`,
                                        width: `${
                                            (element.width_mm / widthMm) *
                                            100
                                        }%`,
                                        height: `${
                                            (element.height_mm /
                                                heightMm) *
                                            100
                                        }%`,
                                        zIndex: element.z_index,
                                        fontSize: `${element.properties?.font_size || 12}px`,
                                        color: element.properties?.text_color || "#111827",
                                        backgroundColor:
                                            element.type === "student_id"
                                                ? "#ffffff"
                                                : element.type === "manufacture_date" || element.properties?.show_background === false
                                                ? "transparent"
                                                : hexToRgba(
                                                      element.properties?.background_color || "#ffffff",
                                                      element.properties?.opacity ?? 1
                                                  ),
                                    }}
                                >
                                    {element.type === "photo" ? (
                                        <div className="flex h-full items-center justify-center text-xs text-slate-500">
                                            Student Photo
                                        </div>
                                    ) : element.type === "barcode" ? (
                                        <div className="flex h-full items-center justify-center text-xs font-mono text-slate-700">
                                            ||| || |||| |||
                                        </div>
                                    ) : element.type === "student_id" ? (
                                        <div className="grid h-full w-full grid-cols-8 gap-px">
                                            {Array.from({ length: 8 }).map((_, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center justify-center border border-slate-400 text-[0.65em]"
                                                    style={{
                                                        backgroundColor: "#ffffff",
                                                        color: element.properties?.text_color || "#111827",
                                                    }}
                                                >
                                                    {index + 1}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span>
                                            {element.type === "manufacture_date"
                                                ? (element.text ||
                                                      element.properties?.text ||
                                                      "Manufacture Date: {{manufacture_date}}")
                                                : element.type === "student_name" || element.type === "static_text"
                                                ? (element.text ||
                                                      element.properties?.text ||
                                                      getElementLabel(element))
                                                : getElementLabel(element)}
                                        </span>
                                    )}

                                    {String(
                                        selectedElementId
                                    ) === String(element.id) && (
                                        <div
                                            onPointerDown={(event) =>
                                                handleResizePointerDown(
                                                    event,
                                                    element
                                                )
                                            }
                                            className="absolute -bottom-1 -right-1 h-3 w-3 cursor-se-resize rounded-sm bg-[#1688bd]"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {selectedElement && (
                        <div className="mt-4 rounded-lg bg-white p-4">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Move size={15} />
                                Drag the selected element to reposition it.
                            </div>

                            <p className="mt-1 text-xs text-slate-500">
                                Drag the blue corner to resize it.
                            </p>
                        </div>
                    )}
                </section>

                <aside className="rounded-xl bg-white p-4 shadow-sm">
                    {error && (
                        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                            {success}
                        </div>
                    )}

                    <h2 className="mb-4 text-lg font-semibold text-[#07345d]">
                        {selectedElement
                            ? "Edit Element"
                            : "Add Element"}
                    </h2>

                    <form
                        onSubmit={handleAddElement}
                        className="space-y-4"
                    >
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Element Type
                            </label>

                            <select
                                name="type"
                                value={elementForm.type}
                                onChange={handleTypeChange}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                            >
                                <option value="static_text">
                                    Static Text
                                </option>

                                <option value="student_name">
                                    Student Name
                                </option>

                                <option value="student_id">
                                    Student ID
                                </option>

                                <option value="manufacture_date">
                                    Manufacture Date
                                </option>

                                <option value="photo">
                                    Student Photo
                                </option>

                                <option value="barcode">
                                    Barcode
                                </option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Text
                            </label>

                            <input
                                name="text"
                                value={elementForm.text}
                                onChange={handleFormChange}
                                placeholder="Display text"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {[
                                ["x_mm", "X Position (mm)"],
                                ["y_mm", "Y Position (mm)"],
                                ["width_mm", "Width (mm)"],
                                ["height_mm", "Height (mm)"],
                            ].map(([name, label]) => (
                                <div key={name}>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">
                                        {label}
                                    </label>

                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        name={name}
                                        value={elementForm[name]}
                                        onChange={handleFormChange}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                                    />
                                </div>
                            ))}
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Font Size
                            </label>

                            <input
                                type="number"
                                min="6"
                                max="100"
                                name="font_size"
                                value={elementForm.font_size}
                                onChange={handleFormChange}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Text Color</label>
                                <input type="color" name="text_color" value={elementForm.text_color} onChange={handleFormChange} className="h-10 w-full rounded-lg border border-slate-300" />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Box Color</label>
                                <input type="color" name="background_color" value={elementForm.background_color} onChange={handleFormChange} className="h-10 w-full rounded-lg border border-slate-300" />
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Box Opacity: {Math.round(Number(elementForm.opacity) * 100)}%</label>
                            <input type="range" min="0" max="1" step="0.05" name="opacity" value={elementForm.opacity} onChange={handleFormChange} className="w-full" />
                        </div>

                        <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input type="checkbox" name="show_background" checked={elementForm.show_background} onChange={(event) => handleFormChange({ target: { name: "show_background", value: event.target.checked } })} />
                            Show background box
                        </label>

                        <button
                            type="submit"
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1688bd] px-4 py-2 text-white hover:bg-[#11739f]"
                        >
                            {selectedElement ? <Save size={18} /> : <Plus size={18} />}
                            {selectedElement ? "Update Element" : "Add Element"}
                        </button>

                        {selectedElement && (
                            <button
                                type="button"
                                onClick={() =>
                                    handleDeleteElement(
                                        selectedElement.id
                                    )
                                }
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-red-600 hover:bg-red-100"
                            >
                                <Trash2 size={18} />
                                Remove Selected Element
                            </button>
                        )}
                    </form>
                </aside>
            </main>
        </div>
    );
}

