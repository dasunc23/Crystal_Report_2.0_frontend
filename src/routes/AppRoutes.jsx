import {
    Routes,
    Route,
    Navigate,
    useNavigate,
} from "react-router-dom";

import Projects from "../pages/Projects";
import ProjectDetails from "../pages/ProjectDetails";
import TemplateEditor from "../pages/TemplateEditor";

export default function AppRoutes() {
    const navigate = useNavigate();

    const handleOpenProject = (projectId) => {
        if (!projectId) {
            console.error(
                "Project ID is missing:",
                projectId
            );

            return;
        }

        navigate(`/projects/${projectId}`);
    };

    return (
        <Routes>
            {/* Projects page */}
            <Route
                path="/"
                element={
                    <Projects
                        onOpenProject={handleOpenProject}
                    />
                }
            />

            {/* Project details page */}
            <Route
                path="/projects/:projectId"
                element={<ProjectDetails />}
            />

            {/* Template editor page */}
            <Route
                path="/projects/:projectId/templates/:templateId/editor"
                element={<TemplateEditor />}
            />

            {/* Redirect unknown URLs to the projects page */}
            <Route
                path="*"
                element={<Navigate to="/" replace />}
            />
        </Routes>
    );
}
