import * as XLSX from "xlsx";

// Column headers must match exactly what the backend bulk-upload
// parser expects (see employeeController.js -> bulkUploadEmployees)
export const TEMPLATE_HEADERS = [
    "First Name",
    "Last Name",
    "Phone Number",
    "Join Date (YYYY-MM-DD)",
    "Department",
    "Designation",
    "Basic Salary",
    "Allowances",
    "Deductions",
    "Work Email",
    "Temporary Password",
    "System Role (EMPLOYEE/ADMIN)",
    "Bio (Optional)",
];

const EXAMPLE_ROW = [
    "John",
    "Doe",
    "9876543210",
    "2025-01-15",
    "Engineering",
    "Software Engineer",
    50000,
    5000,
    0,
    "john.doe@company.com",
    "TempPass123",
    "EMPLOYEE",
    "",
];

export const downloadEmployeeTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, EXAMPLE_ROW]);

    worksheet["!cols"] = TEMPLATE_HEADERS.map((h) => ({
        wch: Math.max(h.length, 18),
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");

    XLSX.writeFile(workbook, "employee_template.xlsx");
};