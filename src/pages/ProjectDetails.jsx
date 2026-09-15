import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Edit, Trash2, X } from "lucide-react";

import { getProjectById } from "../api/projectApi";

import {
    getTemplatesByProject,
    createTemplate,
    updateTemplate,
    deleteTemplate,
} from "../api/templateApi";

export default function ProjectDetails() {
    const { projectId } = useParams();
    const navigate = useNavigate();

    const [project, setProject] = useState(null);
    const [templates, setTemplates] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [templateActionLoading, setTemplateActionLoading] =
        useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [showCreateTemplate, setShowCreateTemplate] =
        useState(false);

    const [editingTemplate, setEditingTemplate] = useState(null);

    const [templateForm, setTemplateForm] = useState({
        name: "",
        width_mm: "92",
        height_mm: "57",
        has_front: true,
        has_back: true,
    });

    const [editTemplateForm, setEditTemplateForm] = useState({
        name: "",
        width_mm: "92",
        height_mm: "57",
        has_front: true,
        has_back: true,
    });

    useEffect(() => {
        loadProjectDetails();
    }, [projectId]);

    /*
     * Supports different Laravel list response formats:
     *
     * [
     *     {...}
     * ]
     *
     * {
     *     data: [...]
     * }
     *
     * {
     *     templates: [...]
     * }
     */
    const normalizeList = (response) => {
        if (Array.isArray(response)) {
            return response;
        }

        if (Array.isArray(response?.data)) {
            return response.data;
        }

        if (Array.isArray(response?.data?.data)) {
            return response.data.data;
        }

        if (Array.isArray(response?.templates)) {
            return response.templates;
        }

        if (Array.isArray(response?.data?.templates)) {
            return response.data.templates;
        }

        return [];
    };

    /*
     * Supports different Laravel single-object response formats.
     */
    const normalizeObject = (response) => {
        if (!response) {
            return null;
        }

        if (response.project) {
            return response.project;
        }

        if (response.template) {
            return response.template;
        }

        if (
            response.data &&
            !Array.isArray(response.data)
        ) {
            if (response.data.project) {
                return response.data.project;
            }

            if (response.data.template) {
                return response.data.template;
            }

            if (
                response.data.data &&
                !Array.isArray(response.data.data)
            ) {
                return response.data.data;
            }

            return response.data;
        }

        return response;
    };

    const getTemplateName = (template) => {
        return (
            template?.name ||
            template?.template_name ||
            "Unnamed Template"
        );
    };

    const getTemplateVersion = (template) => {
        return template?.version ?? 1;
    };

    const getTemplateWidth = (template) => {
        return (
            template?.width_mm ??
            template?.width ??
            template?.card_width_mm ??
            0
        );
    };

    const getTemplateHeight = (template) => {
        return (
            template?.height_mm ??
            template?.height ??
            template?.card_height_mm ??
            0
        );
    };

    const hasFrontSide = (template) => {
        return Boolean(
            template?.has_front ??
                template?.front_enabled ??
                template?.front
        );
    };

    const hasBackSide = (template) => {
        return Boolean(
            template?.has_back ??
                template?.back_enabled ??
                template?.back
        );
    };

    const loadProjectDetails = async () => {
        try {
            setLoading(true);
            setError("");

            const projectResponse = await getProjectById(projectId);

            const templateResponse =
                await getTemplatesByProject(projectId);

            setProject(normalizeObject(projectResponse));
            setTemplates(normalizeList(templateResponse));
        } catch (requestError) {
            console.error(
                "Unable to load project details:",
                requestError
            );

            setError(
                requestError.response?.data?.message ||
                    "Unable to load project details."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleTemplateInputChange = (event) => {
        const { name, value, type, checked } = event.target;

        setTemplateForm((previous) => ({
            ...previous,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleEditTemplateInputChange = (event) => {
        const { name, value, type, checked } = event.target;

        setEditTemplateForm((previous) => ({
            ...previous,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const resetCreateTemplateForm = () => {
        setTemplateForm({
            name: "",
            width_mm: "92",
            height_mm: "57",
            has_front: true,
            has_back: true,
        });
    };

    const closeCreateTemplateForm = () => {
        if (saving) {
            return;
        }

        resetCreateTemplateForm();
        setShowCreateTemplate(false);
    };

    const handleCreateTemplate = async (event) => {
        event.preventDefault();

        const templateName = templateForm.name.trim();
        const width = Number(templateForm.width_mm);
        const height = Number(templateForm.height_mm);

        if (!templateName) {
            setError("Please enter a template name.");
            return;
        }

        if (!width || width <= 0) {
            setError("Please enter a valid width.");
            return;
        }

        if (!height || height <= 0) {
            setError("Please enter a valid height.");
            return;
        }

        if (
            !templateForm.has_front &&
            !templateForm.has_back
        ) {
            setError("Select at least one card side.");
            return;
        }

        try {
            setSaving(true);
            setError("");
            setSuccess("");

            const response = await createTemplate(projectId, {
                name: templateName,
                width_mm: width,
                height_mm: height,
                has_front: templateForm.has_front,
                has_back: templateForm.has_back,
            });

            const createdTemplate = normalizeObject(response);

            /*
             * Add the newly created template immediately.
             * This avoids refreshing the browser.
             */
            if (createdTemplate?.id) {
                setTemplates((previousTemplates) => [
                    ...previousTemplates,
                    createdTemplate,
                ]);
            } else {
                /*
                 * If the API response does not contain the created
                 * template object, reload only the templates.
                 */
                const refreshedResponse =
                    await getTemplatesByProject(projectId);

                setTemplates(normalizeList(refreshedResponse));
            }

            resetCreateTemplateForm();
            setShowCreateTemplate(false);
            setSuccess("Template created successfully.");
        } catch (requestError) {
            console.error(
                "Template creation error:",
                requestError
            );

            setError(
                requestError.response?.data?.message ||
                    "Unable to create template."
            );
        } finally {
            setSaving(false);
        }
    };

    const openEditTemplateModal = (template) => {
        setEditingTemplate(template);

        setEditTemplateForm({
            name: getTemplateName(template),
            width_mm: String(getTemplateWidth(template)),
            height_mm: String(getTemplateHeight(template)),
            has_front: hasFrontSide(template),
            has_back: hasBackSide(template),
        });

        setError("");
        setSuccess("");
    };

    const closeEditTemplateModal = () => {
        if (templateActionLoading) {
            return;
        }

        setEditingTemplate(null);
    };

    const handleUpdateTemplate = async (event) => {
        event.preventDefault();

        const templateName = editTemplateForm.name.trim();
        const width = Number(editTemplateForm.width_mm);
        const height = Number(editTemplateForm.height_mm);

        if (!templateName) {
            setError("Please enter a template name.");
            return;
        }

        if (!width || width <= 0) {
            setError("Please enter a valid width.");
            return;
        }

        if (!height || height <= 0) {
            setError("Please enter a valid height.");
            return;
        }

        if (
            !editTemplateForm.has_front &&
            !editTemplateForm.has_back
        ) {
            setError("Select at least one card side.");
            return;
        }

        if (!editingTemplate?.id) {
            setError("Template ID is missing.");
            return;
        }

        try {
            setTemplateActionLoading(true);
            setError("");
            setSuccess("");
            const response = await updateTemplate(
                projectId,
                editingTemplate.id,
                {
                    name: templateName,
                    width_mm: width,
                    height_mm: height,
                    has_front: editTemplateForm.has_front,
                    has_back: editTemplateForm.has_back,
                }
            );

            const updatedTemplate = normalizeObject(response);

            setTemplates((previousTemplates) =>
                previousTemplates.map((template) => {
                    if (
                        template.id !== editingTemplate.id
                    ) {
                        return template;
                    }

                    return {
                        ...template,
                        ...(updatedTemplate || {}),
                        name: templateName,
                        width_mm: width,
                        height_mm: height,
                        has_front:
                            editTemplateForm.has_front,
                        has_back:
                            editTemplateForm.has_back,
                    };
                })
            );

            setEditingTemplate(null);
            setSuccess("Template updated successfully.");
        } catch (requestError) {
            console.error(
                "Template update error:",
                requestError
            );

            setError(
                requestError.response?.data?.message ||
                    "Unable to update template."
            );
        } finally {
            setTemplateActionLoading(false);
        }
    };

    const handleDeleteTemplate = async (template) => {
        const templateName = getTemplateName(template);

        const confirmed = window.confirm(
            `Are you sure you want to delete "${templateName}"?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setTemplateActionLoading(true);
            setError("");
            setSuccess("");

            await deleteTemplate(projectId, template.id);

            /*
             * Remove the deleted template from the current state.
             * No browser refresh is needed.
             */
            setTemplates((previousTemplates) =>
                previousTemplates.filter(
                    (item) => item.id !== template.id
                )
            );

            setSuccess("Template deleted successfully.");
        } catch (requestError) {
            console.error(
                "Template delete error:",
                requestError
            );

            setError(
                requestError.response?.data?.message ||
                    "Unable to delete template."
            );
        } finally {
            setTemplateActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[300px] items-center justify-center">
                <p className="text-[#6b7d8c]">
                    Loading project details...
                </p>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
                Project could not be found.
            </div>
        );
    }

    return (
        <>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                    <div>
                        <button
                            type="button"
                            onClick={() => navigate("/")}
                            className="mb-4 text-sm font-semibold text-[#1688bd] transition hover:text-[#07345d]"
                        >
                            ← Back to Projects
                        </button>

                        <h1 className="text-3xl font-bold text-[#07345d]">
                            {project.name}
                        </h1>

                        <p className="mt-2 text-[#6b7d8c]">
                            Manage templates, students, designs,
                            and card generation for this project.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setShowCreateTemplate(
                                (previous) => !previous
                            );

                            setError("");
                            setSuccess("");
                        }}
                        className="rounded-lg bg-[#1688bd] px-5 py-3 font-semibold text-white transition hover:bg-[#07345d]"
                    >
                        {showCreateTemplate
                            ? "Close Form"
                            : "+ New Template"}
                    </button>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                        {success}
                    </div>
                )}

                {/* Project summary */}
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-[#d8e8f0] bg-white p-5 shadow-sm">
                        <p className="text-sm text-[#6b7d8c]">
                            Project Name
                        </p>

                        <p className="mt-2 break-words font-semibold text-[#17324d]">
                            {project.name}
                        </p>
                    </div>

                    <div className="rounded-xl border border-[#d8e8f0] bg-white p-5 shadow-sm">
                        <p className="text-sm text-[#6b7d8c]">
                            Status
                        </p>

                        <p className="mt-2 font-semibold capitalize text-[#17324d]">
                            {project.status || "draft"}
                        </p>
                    </div>

                    <div className="rounded-xl border border-[#d8e8f0] bg-white p-5 shadow-sm">
                        <p className="text-sm text-[#6b7d8c]">
                            Templates
                        </p>

                        <p className="mt-2 text-2xl font-bold text-[#1688bd]">
                            {templates.length}
                        </p>
                    </div>
                </div>

                {/* Create template form */}
                {showCreateTemplate && (
                    <form
                        onSubmit={handleCreateTemplate}
                        className="rounded-xl border border-[#d8e8f0] bg-white p-6 shadow-sm"
                    >
                        <h2 className="mb-5 text-xl font-bold text-[#07345d]">
                            Create New Template
                        </h2>

                        <div className="grid gap-5 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <label
                                    htmlFor="template-name"
                                    className="mb-2 block text-sm font-semibold text-[#17324d]"
                                >
                                    Template Name
                                </label>

                                <input
                                    id="template-name"
                                    type="text"
                                    name="name"
                                    value={templateForm.name}
                                    onChange={
                                        handleTemplateInputChange
                                    }
                                    placeholder="Example: Student ID Card 2026"
                                    required
                                    className="w-full rounded-lg border border-[#d8e8f0] px-4 py-3 outline-none focus:border-[#1688bd] focus:ring-2 focus:ring-[#eaf7fc]"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="template-width"
                                    className="mb-2 block text-sm font-semibold text-[#17324d]"
                                >
                                    Width in millimetres
                                </label>

                                <input
                                    id="template-width"
                                    type="number"
                                    name="width_mm"
                                    min="1"
                                    step="0.01"
                                    value={templateForm.width_mm}
                                    onChange={
                                        handleTemplateInputChange
                                    }
                                    required
                                    className="w-full rounded-lg border border-[#d8e8f0] px-4 py-3 outline-none focus:border-[#1688bd] focus:ring-2 focus:ring-[#eaf7fc]"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="template-height"
                                    className="mb-2 block text-sm font-semibold text-[#17324d]"
                                >
                                    Height in millimetres
                                </label>

                                <input
                                    id="template-height"
                                    type="number"
                                    name="height_mm"
                                    min="1"
                                    step="0.01"
                                    value={templateForm.height_mm}
                                    onChange={
                                        handleTemplateInputChange
                                    }
                                    required
                                    className="w-full rounded-lg border border-[#d8e8f0] px-4 py-3 outline-none focus:border-[#1688bd] focus:ring-2 focus:ring-[#eaf7fc]"
                                />
                            </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-6">
                            <label className="flex items-center gap-2 text-sm text-[#17324d]">
                                <input
                                    type="checkbox"
                                    name="has_front"
                                    checked={templateForm.has_front}
                                    onChange={
                                        handleTemplateInputChange
                                    }
                                />

                                Front side
                            </label>

                            <label className="flex items-center gap-2 text-sm text-[#17324d]">
                                <input
                                    type="checkbox"
                                    name="has_back"
                                    checked={templateForm.has_back}
                                    onChange={
                                        handleTemplateInputChange
                                    }
                                />

                                Back side
                            </label>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                type="submit"
                                disabled={saving}
                                className="rounded-lg bg-[#07345d] px-5 py-3 font-semibold text-white transition hover:bg-[#1688bd] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {saving
                                    ? "Creating..."
                                    : "Create Template"}
                            </button>

                            <button
                                type="button"
                                onClick={closeCreateTemplateForm}
                                disabled={saving}
                                className="rounded-lg border border-[#d8e8f0] px-5 py-3 font-semibold text-[#17324d] transition hover:bg-[#eaf7fc] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                {/* Templates section */}
                <section>
                    <div className="mb-5 flex items-center justify-between gap-4">
                        <h2 className="text-2xl font-bold text-[#07345d]">
                            Templates
                        </h2>

                        <span className="text-sm text-[#6b7d8c]">
                            {templates.length} template(s)
                        </span>
                    </div>

                    {templates.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[#b9d5e3] bg-[#eaf7fc] p-10 text-center">
                            <h3 className="text-lg font-semibold text-[#07345d]">
                                No templates yet
                            </h3>

                            <p className="mt-2 text-sm text-[#6b7d8c]">
                                Create your first ID card
                                template for this project.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            {templates.map((template) => (
                                <article
                                    key={template.id}
                                    className="rounded-xl border border-[#d8e8f0] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                                >
                                    {/* Template heading and icons */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h3 className="break-words font-bold text-[#17324d]">
                                                {getTemplateName(
                                                    template
                                                )}
                                            </h3>

                                            <p className="mt-1 text-sm text-[#6b7d8c]">
                                                Version{" "}
                                                {getTemplateVersion(
                                                    template
                                                )}
                                            </p>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openEditTemplateModal(
                                                        template
                                                    )
                                                }
                                                disabled={
                                                    templateActionLoading
                                                }
                                                title="Edit template"
                                                aria-label={`Edit ${getTemplateName(
                                                    template
                                                )}`}
                                                className="rounded-lg p-2 text-[#1688bd] transition hover:bg-[#eaf7fc] disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <Edit size={18} />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleDeleteTemplate(
                                                        template
                                                    )
                                                }
                                                disabled={
                                                    templateActionLoading
                                                }
                                                title="Delete template"
                                                aria-label={`Delete ${getTemplateName(
                                                    template
                                                )}`}
                                                className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Template dimensions */}
                                    <div className="mt-5 grid grid-cols-2 gap-3">
                                        <div className="rounded-lg bg-[#f5fafc] p-3">
                                            <p className="text-xs text-[#6b7d8c]">
                                                Width
                                            </p>

                                            <p className="mt-1 font-semibold text-[#17324d]">
                                                {getTemplateWidth(
                                                    template
                                                )}{" "}
                                                mm
                                            </p>
                                        </div>

                                        <div className="rounded-lg bg-[#f5fafc] p-3">
                                            <p className="text-xs text-[#6b7d8c]">
                                                Height
                                            </p>

                                            <p className="mt-1 font-semibold text-[#17324d]">
                                                {getTemplateHeight(
                                                    template
                                                )}{" "}
                                                mm
                                            </p>
                                        </div>
                                    </div>

                                    {/* Front and back badges */}
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {hasFrontSide(template) && (
                                            <span className="rounded-md bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
                                                Front
                                            </span>
                                        )}

                                        {hasBackSide(template) && (
                                            <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                                                Back
                                            </span>
                                        )}
                                    </div>
                                    {/* Open editor button */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigate(
                                                `/projects/${projectId}/templates/${template.id}/editor`
                                            );
                                        }}
                                        className="mt-5 w-full rounded-lg border border-[#1688bd] px-4 py-2.5 text-sm font-semibold text-[#1688bd] transition hover:bg-[#1688bd] hover:text-white"
                                    >
                                        Open Editor
                                    </button>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* Edit template modal */}
            {editingTemplate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
                    <form
                        onSubmit={handleUpdateTemplate}
                        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
                    >
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-[#07345d]">
                                    Edit Template
                                </h2>

                                <p className="mt-1 text-sm text-[#6b7d8c]">
                                    Update the template details.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeEditTemplateModal}
                                disabled={templateActionLoading}
                                title="Close"
                                aria-label="Close edit template form"
                                className="rounded-lg p-2 text-[#6b7d8c] transition hover:bg-[#eaf7fc] hover:text-[#07345d] disabled:opacity-50"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div>
                            <label
                                htmlFor="edit-template-name"
                                className="mb-2 block text-sm font-semibold text-[#17324d]"
                            >
                                Template Name
                            </label>

                            <input
                                id="edit-template-name"
                                type="text"
                                name="name"
                                value={editTemplateForm.name}
                                onChange={
                                    handleEditTemplateInputChange
                                }
                                required
                                className="w-full rounded-lg border border-[#d8e8f0] px-4 py-3 outline-none focus:border-[#1688bd] focus:ring-2 focus:ring-[#eaf7fc]"
                            />
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="edit-template-width"
                                    className="mb-2 block text-sm font-semibold text-[#17324d]"
                                >
                                    Width in millimetres
                                </label>

                                <input
                                    id="edit-template-width"
                                    type="number"
                                    name="width_mm"
                                    min="1"
                                    step="0.01"
                                    value={
                                        editTemplateForm.width_mm
                                    }
                                    onChange={
                                        handleEditTemplateInputChange
                                    }
                                    required
                                    className="w-full rounded-lg border border-[#d8e8f0] px-4 py-3 outline-none focus:border-[#1688bd] focus:ring-2 focus:ring-[#eaf7fc]"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="edit-template-height"
                                    className="mb-2 block text-sm font-semibold text-[#17324d]"
                                >
                                    Height in millimetres
                                </label>

                                <input
                                    id="edit-template-height"
                                    type="number"
                                    name="height_mm"
                                    min="1"
                                    step="0.01"
                                    value={
                                        editTemplateForm.height_mm
                                    }
                                    onChange={
                                        handleEditTemplateInputChange
                                    }
                                    required
                                    className="w-full rounded-lg border border-[#d8e8f0] px-4 py-3 outline-none focus:border-[#1688bd] focus:ring-2 focus:ring-[#eaf7fc]"
                                />
                            </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-6">
                            <label className="flex items-center gap-2 text-sm text-[#17324d]">
                                <input
                                    type="checkbox"
                                    name="has_front"
                                    checked={
                                        editTemplateForm.has_front
                                    }
                                    onChange={
                                        handleEditTemplateInputChange
                                    }
                                />

                                Front side
                            </label>

                            <label className="flex items-center gap-2 text-sm text-[#17324d]">
                                <input
                                    type="checkbox"
                                    name="has_back"
                                    checked={
                                        editTemplateForm.has_back
                                    }
                                    onChange={
                                        handleEditTemplateInputChange
                                    }
                                />

                                Back side
                            </label>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={closeEditTemplateModal}
                                disabled={templateActionLoading}
                                className="rounded-lg border border-[#d8e8f0] px-5 py-2.5 text-sm font-semibold text-[#17324d] transition hover:bg-[#eaf7fc] disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={templateActionLoading}
                                className="rounded-lg bg-[#1688bd] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#07345d] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {templateActionLoading
                                    ? "Saving..."
                                    : "Save Changes"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}
