import { useState, useEffect, useCallback } from "react";
import api from "../api/axios";

export const useDepartments = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDepartments = useCallback(async () => {
        try {
            const res = await api.get("/departments");
            setDepartments(res.data || []);
        } catch (error) {
            console.error("Failed to fetch departments:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDepartments();
    }, [fetchDepartments]);

    const addDepartment = useCallback(
        async (name) => {
            const trimmed = name.trim();
            if (!trimmed) return { success: false, error: "Department name cannot be empty" };

            try {
                await api.post("/departments", { name: trimmed });
                await fetchDepartments();
                return { success: true };
            } catch (error) {
                return {
                    success: false,
                    error: error.response?.data?.error || error.message,
                };
            }
        },
        [fetchDepartments]
    );

    return { departments, addDepartment, loading };
};