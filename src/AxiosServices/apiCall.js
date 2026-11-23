
import axios from "axios";
import config from "./config";

export const makeApiRequest = async (params) => {
  try {
    const method = params.method.toUpperCase();

    const getToken = localStorage.getItem("token");

    const headers = {};

    if (getToken) {
      headers.Authorization = `Bearer ${getToken}`;
    }

    const isFormData =
      typeof FormData !== "undefined" &&
      params.data instanceof FormData;

    if (!isFormData && params.header !== "image") {
      headers["Content-Type"] = "application/json";
    }

    const baseUrl = config.adminBackendUrl.replace(/\/+$/, "");
    const endpoint = params.url.replace(/^\/+/, "");

    const apiUrl = `${baseUrl}/${endpoint}`;

    const requestConfig = {
      headers,
      withCredentials: true,
    };

    let response;

    switch (method) {
      case "GET":
        response = await axios.get(apiUrl, requestConfig);
        break;

      case "POST":

        response = await axios.post(
          apiUrl,
          params.data,
          requestConfig
        );

        console.log('response', response)
       
        break;

      case "PUT":
        response = await axios.put(
          apiUrl,
          params.data,
          requestConfig
        );
        break;

      case "PATCH":
        response = await axios.patch(
          apiUrl,
          params.data,
          requestConfig
        );
        break;

      case "DELETE":
        response = await axios.delete(apiUrl, {
          ...requestConfig,
          ...(params.data && {
            data: params.data,
          }),
        });
        break;

      default:
        throw new Error(`Unsupported method: ${method}`);
    }

    return response.data;

  } catch (error) {
    console.error(
      "Axios API Error:",
      error.response?.data || error.message
    );

    throw error;
  }
};
