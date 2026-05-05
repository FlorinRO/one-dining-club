import { apiClient } from "./client";
import { mockAddresses } from "../data/mockData";
import { Address } from "../types/models";

export const addressesApi = {
  async list() {
    try {
      const { data } = await apiClient.get<Address[] | { results: Address[] }>("/addresses/");
      return Array.isArray(data) ? data : data.results;
    } catch {
      return mockAddresses;
    }
  },

  async create(payload: Omit<Address, "id">) {
    const { data } = await apiClient.post<Address>("/addresses/", payload);
    return data;
  },

  async update(id: number, payload: Partial<Address>) {
    const { data } = await apiClient.patch<Address>(`/addresses/${id}/`, payload);
    return data;
  },

  async remove(id: number) {
    await apiClient.delete(`/addresses/${id}/`);
  },

  async setDefault(id: number) {
    const { data } = await apiClient.patch<Address>(`/addresses/${id}/set-default/`);
    return data;
  },
};

