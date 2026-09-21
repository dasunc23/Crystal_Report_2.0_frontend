import axiosClient from "./axiosClient";

export const downloadGenerationJob = async (projectId, jobId) => {
    if (!projectId || !jobId) {
        throw new Error("Project ID and job ID are required.");
    }

    return axiosClient.get(
        `/projects/${projectId}/generation-jobs/${jobId}/download`,
        {
            responseType: "blob",
        }
    );
};