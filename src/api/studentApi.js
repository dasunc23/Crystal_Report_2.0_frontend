import axiosClient from "./axiosClient";

/*
|--------------------------------------------------------------------------
| Excel Upload and Student Data API
|--------------------------------------------------------------------------
*/

/**
 * Upload an Excel/CSV file and return a temporary preview.
 *
 * This endpoint does not permanently save student records.
 * The backend receives the file using the multipart field name `file`.
 */
export const previewStudentExcel = async (projectId, file) => {
    if (!projectId) {
        throw new Error("Project ID is required.");
    }

    if (!file) {
        throw new Error("Excel file is required.");
    }

    // FormData is required when uploading a file.
    const formData = new FormData();

    // This name must match the Laravel backend validation field.
    formData.append("file", file);

    /*
     * Do not manually set Content-Type here.
     * Axios automatically adds multipart/form-data and the correct
     * boundary value when FormData is used.
     */
    const response = await axiosClient.post(
        `/projects/${projectId}/students/preview`,
        formData
    );

    return response.data;
};

/**
 * Permanently import student records into a project.
 *
 * The ExcelUploadPage passes:
 *     projectId
 *     file
 *     templateId
 *     mappings
 *
 * The current backend mainly requires the file. The optional template
 * and mapping values are included only when they are available.
 */
export const importStudentExcel = async (
    projectId,
    file,
    templateId = null,
    mappings = {}
) => {
    if (!projectId) {
        throw new Error("Project ID is required.");
    }

    if (!file) {
        throw new Error("Excel file is required.");
    }

    // Create multipart form data for the Excel upload.
    const formData = new FormData();

    // The Laravel backend expects the uploaded file as `file`.
    formData.append("file", file);

    // Include the selected template only when one was selected.
    if (templateId) {
        formData.append("template_id", String(templateId));
    }

    /*
     * Send mappings as JSON because FormData cannot directly send a
     * JavaScript object.
     */
    if (mappings && Object.keys(mappings).length > 0) {
        formData.append("mappings", JSON.stringify(mappings));
    }

    /*
     * Do not manually set Content-Type.
     * Axios automatically creates the correct multipart boundary.
     */
    const response = await axiosClient.post(
        `/projects/${projectId}/students/import`,
        formData
    );

    return response.data;
};

export const getProjectStudents = async (projectId) => {
    if (!projectId) {
        throw new Error("Project ID is required.");
    }

    const response = await axiosClient.get(
        `/projects/${projectId}/students`
    );

    return response.data;
};

export const generateStudentBarcodes = async (projectId) => {
    if (!projectId) {
        throw new Error("Project ID is required.");
    }

    const response = await axiosClient.post(
        `/projects/${projectId}/students/generate-barcodes`
    );

    return response.data;
};

export const uploadStudentPhotos = async (projectId, files) => {
    if (!projectId) {
        throw new Error("Project ID is required.");
    }

    if (!files?.length) {
        throw new Error("At least one photo file is required.");
    }

    const formData = new FormData();

    files.forEach((file) => {
        formData.append("photos[]", file);
    });

    const response = await axiosClient.post(
        `/projects/${projectId}/students/photos`,
        formData
    );

    return response.data;
};
