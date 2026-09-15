import axiosClient from "./axiosClient";

/*
|--------------------------------------------------------------------------
| Project Templates
|--------------------------------------------------------------------------
*/

export const getTemplatesByProject = async (projectId) => {
    if (!projectId) {
        throw new Error("Project ID is required.");
    }

    const response = await axiosClient.get(
        `/projects/${projectId}/templates`
    );

    return response.data;
};

export const getProjectTemplates = getTemplatesByProject;

export const getTemplateById = async (projectId, templateId) => {
    if (!projectId || !templateId) {
        throw new Error("Project ID and template ID are required.");
    }

    const response = await axiosClient.get(
        `/projects/${projectId}/templates/${templateId}`
    );

    return response.data;
};

export const createTemplate = async (projectId, data) => {
    if (!projectId) {
        throw new Error("Project ID is required.");
    }

    const response = await axiosClient.post(
        `/projects/${projectId}/templates`,
        data
    );

    return response.data;
};

export const updateTemplate = async (
    projectId,
    templateId,
    data
) => {
    if (!projectId || !templateId) {
        throw new Error("Project ID and template ID are required.");
    }

    const response = await axiosClient.put(
        `/projects/${projectId}/templates/${templateId}`,
        data
    );

    return response.data;
};

export const deleteTemplate = async (projectId, templateId) => {
    if (!projectId || !templateId) {
        throw new Error("Project ID and template ID are required.");
    }

    const response = await axiosClient.delete(
        `/projects/${projectId}/templates/${templateId}`
    );

    return response.data;
};

/*
|--------------------------------------------------------------------------
| Template Elements
|--------------------------------------------------------------------------
*/

export const getTemplateElements = async (templateId) => {
    if (!templateId) {
        throw new Error("Template ID is required.");
    }

    const response = await axiosClient.get(
        `/templates/${templateId}/elements`
    );

    return response.data;
};

export const createTemplateElement = async (templateId, data) => {
    if (!templateId) {
        throw new Error("Template ID is required.");
    }

    const response = await axiosClient.post(
        `/templates/${templateId}/elements`,
        data
    );

    return response.data;
};

export const updateTemplateElement = async (
    templateId,
    elementId,
    data
) => {
    if (!templateId || !elementId) {
        throw new Error(
            "Template ID and element ID are required."
        );
    }

    const response = await axiosClient.put(
        `/templates/${templateId}/elements/${elementId}`,
        data
    );

    return response.data;
};

export const deleteTemplateElement = async (
    templateId,
    elementId
) => {
    if (!templateId || !elementId) {
        throw new Error(
            "Template ID and element ID are required."
        );
    }

    const response = await axiosClient.delete(
        `/templates/${templateId}/elements/${elementId}`
    );

    return response.data;
};

/*
|--------------------------------------------------------------------------
| Template Configuration
|--------------------------------------------------------------------------
*/

export const getTemplateConfiguration = async (
    projectId,
    templateId
) => {
    if (!projectId || !templateId) {
        throw new Error(
            "Project ID and template ID are required."
        );
    }

    const response = await axiosClient.get(
        `/projects/${projectId}/templates/${templateId}/configuration`
    );

    return response.data;
};

export const updateTemplateConfiguration = async (
    projectId,
    templateId,
    data
) => {
    if (!projectId || !templateId) {
        throw new Error(
            "Project ID and template ID are required."
        );
    }

    const response = await axiosClient.put(
        `/projects/${projectId}/templates/${templateId}/configuration`,
        data
    );

    return response.data;
};

/*
|--------------------------------------------------------------------------
| Template Design Preview
|--------------------------------------------------------------------------
*/

export const getTemplateDesignPreview = async (
    projectId,
    templateId,
    side
) => {
    if (!projectId || !templateId || !side) {
        throw new Error(
            "Project ID, template ID, and side are required."
        );
    }

    const response = await axiosClient.get(
        `/projects/${projectId}/templates/${templateId}/design/${side}`,
        {
            responseType: "blob",
        }
    );

    return response;
};

/*
|--------------------------------------------------------------------------
| Template Dimensions
|--------------------------------------------------------------------------
*/

export const updateTemplateDimensions = async (
    projectId,
    templateId,
    data
) => {
    if (!projectId || !templateId) {
        throw new Error(
            "Project ID and template ID are required."
        );
    }

    const response = await axiosClient.put(
        `/projects/${projectId}/templates/${templateId}/dimensions`,
        data
    );

    return response.data;
};

export const uploadTemplateDesign = async (
    projectId,
    templateId,
    formData
) => {
    if (!projectId || !templateId) {
        throw new Error(
            "Project ID and template ID are required."
        );
    }

    const response = await axiosClient.post(
        `/projects/${projectId}/templates/${templateId}/design`,
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }
    );

    return response.data;
};

