import axiosClient from "./axiosClient";

/*
|--------------------------------------------------------------------------
| Excel Upload and Student Data
|--------------------------------------------------------------------------
*/

/**
 * Uploads an Excel file and returns a preview.
 *
 * This does not permanently import the records.
 * It only sends the file to the backend preview endpoint.
 */
export const previewStudentExcel = async (projectId, file) => {
    if (!projectId) {
        throw new Error("Project ID is required.");
    }

    if (!file) {
        throw new Error("Excel file is required.");
    }

    // FormData is required because the request contains a file.
    const formData = new FormData();

    // The field name must match the Laravel backend validation name.
    formData.append("file", file);

    const response = await axiosClient.post(
        `/projects/${projectId}/students/preview`,
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }
    );

    return response.data;
};

/**
 * Imports the Excel file into the selected project.
 *
 * The backend validation remains unchanged.
 */
export const importStudentExcel = async (projectId, file) => {
    if (!projectId) {
        throw new Error("Project ID is required.");
    }

    if (!file) {
        throw new Error("Excel file is required.");
    }

    const formData = new FormData();

    formData.append("file", file);

    const response = await axiosClient.post(
        `/projects/${projectId}/students/import`,
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }
    );

    return response.data;
};
