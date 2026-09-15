import axiosClient from "./axiosClient";

export const loginUser = async (credentials) => {
    const response = await axiosClient.post("/login", credentials);

    return response.data;
};

export const logoutUser = async () => {
    const response = await axiosClient.post("/logout");

    return response.data;
};

export const getCurrentUser = async () => {
    const response = await axiosClient.get("/user");

    return response.data;
};
