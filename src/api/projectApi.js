import axiosClient from "./axiosClient";

// Get all projects
export const getProjects = async () => {
    const response = await axiosClient.get("/projects");

    return response.data;
};

// Get one project by ID
export const getProjectById = async (projectId) => {
    const response = await axiosClient.get(`/projects/${projectId}`);

    return response.data;
};

// Create a new project
export const createProject = async (projectData) => {
    const response = await axiosClient.post("/projects", projectData);

    return response.data;
};

// Update a project
export const updateProject = async (projectId, projectData) => {
    const response = await axiosClient.put(
        `/projects/${projectId}`,
        projectData
    );

    return response.data;
};

// Delete a project
export const deleteProject = async (projectId) => {
    const response = await axiosClient.delete(`/projects/${projectId}`);

    return response.data;
};
