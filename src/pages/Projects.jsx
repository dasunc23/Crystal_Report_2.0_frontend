import { useEffect, useState } from "react";
import {
    FolderOpen,
    Plus,
    RefreshCw,
    Trash2,
    X,
} from "lucide-react";

import {
    getProjects,
    createProject,
    deleteProject,
} from "../api/projectApi";

export default function Projects({ onOpenProject }) {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
    });

    const normalizeList = (response) => {
        if (Array.isArray(response)) {
            return response;
        }

        if (Array.isArray(response?.data)) {
            return response.data;
        }

        if (Array.isArray(response?.projects)) {
            return response.projects;
        }

        if (Array.isArray(response?.data?.data)) {
            return response.data.data;
        }

        return [];
    };

    const normalizeObject = (response) => {
        if (response?.data?.data) {
            return response.data.data;
        }

        if (response?.data) {
            return response.data;
        }

        return response;
    };

    const loadProjects = async () => {
        setLoading(true);
        setError("");

        try {
            const response = await getProjects();
            setProjects(normalizeList(response));
        } catch (err) {
            console.error("Unable to load projects:", err);
            setError(
                err?.response?.data?.message ||
                    "Unable to load projects. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProjects();
    }, []);

    const totalProjects = projects.length;

    const openCreateModal = () => {
        setFormData({
            name: "",
        });
        setError("");
        setSuccess("");
        setShowCreateModal(true);
    };

    const closeModal = () => {
        if (saving) {
            return;
        }

        setShowCreateModal(false);
        setFormData({
            name: "",
        });
    };

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!formData.name.trim()) {
            setError("Please enter a project name.");
            return;
        }

        setSaving(true);
        setError("");
        setSuccess("");

        const payload = {
            name: formData.name.trim(),
        };

        try {
            const response = await createProject(payload);
            const newProject = normalizeObject(response);

            setProjects((previous) => [newProject, ...previous]);
            setSuccess("Project created successfully.");

            setShowCreateModal(false);
            setFormData({
                name: "",
            });
        } catch (err) {
            console.error("Unable to save project:", err);

            setError(
                err?.response?.data?.message ||
                    "Unable to save the project. Please check the form and try again."
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (project) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${project.name}"?`
        );

        if (!confirmed) {
            return;
        }

        setDeletingId(project.id);
        setError("");
        setSuccess("");

        try {
            await deleteProject(project.id);

            setProjects((previous) =>
                previous.filter(
                    (item) => item.id !== project.id
                )
            );

            setSuccess("Project deleted successfully.");
        } catch (err) {
            console.error("Unable to delete project:", err);

            setError(
                err?.response?.data?.message ||
                    "Unable to delete the project. Please try again."
            );
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <section className="mx-auto w-full max-w-[1500px]">
            {/* Page heading */}
            <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="mb-3 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#1688bd]" />

                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1688bd]">
                            Workspace
                        </p>
                    </div>

                    <h2 className="text-3xl font-bold tracking-tight text-[#07345d] sm:text-4xl">
                        Projects
                    </h2>

                    <p className="mt-2 max-w-xl text-sm leading-6 text-[#6b7d8c] sm:text-base">
                        Create, manage, and organize your Crystal ID
                        student card projects in one place.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={loadProjects}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d8e8f0] bg-white px-4 py-3 text-sm font-semibold text-[#07345d] transition hover:border-[#1688bd] hover:text-[#1688bd] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCw
                            size={16}
                            className={loading ? "animate-spin" : ""}
                        />

                        Refresh
                    </button>

                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1688bd] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#07345d]"
                    >
                        <Plus size={17} />

                        New Project
                    </button>
                </div>
            </div>

            {/* Messages */}
            {error && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {success}
                </div>
            )}

            {/* Section title */}
            <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-[#07345d]">
                        Your Projects
                    </h3>

                    <p className="mt-1 text-sm text-[#6b7d8c]">
                        Select a project to manage its templates and
                        student records.
                    </p>
                </div>

                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#6b7d8c] shadow-sm ring-1 ring-[#d8e8f0]">
                    {totalProjects}{" "}
                    {totalProjects === 1 ? "project" : "projects"}
                </span>
            </div>

            {/* Loading state */}
            {loading ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {[1, 2, 3].map((item) => (
                        <div
                            key={item}
                            className="animate-pulse rounded-2xl border border-[#d8e8f0] bg-white p-6"
                        >
                            <div className="h-5 w-2/3 rounded bg-slate-200" />
                            <div className="mt-3 h-4 w-full rounded bg-slate-200" />
                            <div className="mt-2 h-4 w-4/5 rounded bg-slate-200" />
                            <div className="mt-8 h-10 rounded bg-slate-200" />
                        </div>
                    ))}
                </div>
            ) : projects.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#b9d4e2] bg-white px-6 py-16 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eaf7fc] text-[#1688bd]">
                        <FolderOpen size={30} />
                    </div>

                    <h3 className="mt-5 text-xl font-bold text-[#07345d]">
                        No projects yet
                    </h3>

                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6b7d8c]">
                        Create your first Crystal ID project to start
                        designing student ID cards and importing student
                        records.
                    </p>

                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#1688bd] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#07345d]"
                    >
                        <Plus size={17} />

                        Create First Project
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {projects.map((project) => {
                        return (
                            <article
                                key={project.id}
                                className="group flex min-h-[250px] flex-col rounded-2xl border border-[#d8e8f0] bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#1688bd] hover:shadow-lg"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf7fc] text-[#1688bd]">
                                            <FolderOpen size={22} />
                                        </div>

                                        <h4 className="break-words text-lg font-bold capitalize text-[#07345d]">
                                            {project.name}
                                        </h4>

                                    </div>

                                    <div className="flex shrink-0 items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleDelete(project)
                                            }
                                            disabled={
                                                deletingId === project.id
                                            }
                                            className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                            title="Delete project"
                                            aria-label="Delete project"
                                        >
                                            <Trash2 size={17} />
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-auto pt-6">
                                    <div className="mb-5 flex items-center justify-end gap-3">
                                        <span className="text-xs text-[#6b7d8c]">
                                            ID #{project.id}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            onOpenProject(project.id)
                                        }
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1688bd] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#07345d]"
                                    >
                                        Open Project

                                        <FolderOpen size={16} />
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07345d]/40 px-4 py-6">
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-[#d8e8f0] px-6 py-5">
                            <div>
                                <h3 className="text-xl font-bold text-[#07345d]">
                                    Create New Project
                                </h3>

                                <p className="mt-1 text-sm text-[#6b7d8c]">
                                    Add a new Crystal ID card project.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={saving}
                                className="rounded-lg p-2 text-[#6b7d8c] transition hover:bg-slate-100 hover:text-[#07345d]"
                                aria-label="Close modal"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                            className="space-y-5 px-6 py-6"
                        >
                            <div>
                                <label
                                    htmlFor="project-name"
                                    className="mb-2 block text-sm font-semibold text-[#07345d]"
                                >
                                    Project Name
                                </label>

                                <input
                                    id="project-name"
                                    name="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Example: Sisulka Ratnapura"
                                    className="w-full rounded-lg border border-[#cbdde6] px-4 py-3 text-sm text-[#07345d] outline-none transition placeholder:text-slate-400 focus:border-[#1688bd] focus:ring-2 focus:ring-[#1688bd]/20"
                                    required
                                />
                            </div>

                            {error && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    disabled={saving}
                                    className="rounded-lg border border-[#d8e8f0] px-5 py-3 text-sm font-semibold text-[#07345d] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded-lg bg-[#1688bd] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#07345d] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {saving ? "Saving..." : "Create Project"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}
