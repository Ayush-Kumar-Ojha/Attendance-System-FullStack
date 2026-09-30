import * as XLSX from "xlsx";

export const EMPLOYEE_COLUMNS = [
    "Name",
    "Father's Name",
    "Gender",
    "Blood Group",
    "Date of Birth",
    "Date of Joining",
    "Birth Place",
    "Nationality",
    "Mother Tongue",

    "Passport Number",
    "Identification Mark",
    "Manpower Type",
    "Vendor Code",
    "Marital Status",
    "Number of Children",

    "Helmet Color",
    "Jacket Size",

    "Permanent Address Line 1",
    "Permanent Address Line 2",
    "Permanent Country",
    "Permanent State",
    "Permanent Pin Code",

    "Present Address Line 1",
    "Present Address Line 2",
    "Present Country",
    "Present State",
    "Present Pin Code",

    "Mobile Number",

    "Emergency Contact Person Name",
    "Emergency Contact Person Relation",
    "Emergency Contact Person Address",
    "Emergency Mobile Number",

    "Qualification",
    "Specialization",
    "Year of Passing",

    "Resume",
    "KYC Document",
    "Medical Certificate",
    "Previous Employment Appointment Letter",
    "Police Verification",

    "Bank Account Number",
    "Bank Account Name",
    "Bank Account Type",
    "IFSC Code",
    "Bank Name",
    "Branch Name",
    "UAN Number",
    "PF Number",

    /*
        IMPORTANT:
        Email ID is mandatory.

        Excel upload matches employees using Email ID.
        Existing email -> update same employee.
        New email -> create new employee.
    */
    "Email ID*",

    "Department",
    "Designation",
    "System Role",

    "PAN Number",
];

const EXAMPLE_ROW = [
    "Rahul Sharma",
    "Ramesh Sharma",
    "MALE",
    "O+",
    "2000-05-15",
    "2026-01-10",
    "Bengaluru",
    "Indian",
    "Hindi",

    "",
    "Mole on right hand",
    "Direct",
    "",
    "SINGLE",
    0,

    "Yellow",
    "L",

    "House No 10",
    "MG Road",
    "India",
    "Karnataka",
    "560001",

    "House No 10",
    "MG Road",
    "India",
    "Karnataka",
    "560001",

    "9876543210",

    "Ramesh Sharma",
    "Father",
    "Bengaluru",
    "9876543211",

    "B.Tech",
    "Computer Science",
    "2025",

    "",
    "",
    "",
    "",
    "",

    "123456789012",
    "Rahul Sharma",
    "Savings",
    "HDFC0001234",
    "HDFC Bank",
    "Bengaluru",
    "100123456789",
    "",

    /*
        REQUIRED EMAIL ID
    */
    "rahul.sharma@company.com",

    "Engineering",
    "Software Engineer",
    "EMPLOYEE",

    "",
];

export const downloadEmployeeTemplate = () => {
    const worksheet =
        XLSX.utils.aoa_to_sheet([
            EMPLOYEE_COLUMNS,
            EXAMPLE_ROW,
        ]);

    // =====================================================
    // COLUMN WIDTHS
    // =====================================================

    worksheet["!cols"] =
        EMPLOYEE_COLUMNS.map(
            (header) => ({
                wch: Math.max(
                    header.length + 3,
                    18
                ),
            })
        );

    // =====================================================
    // FREEZE HEADER ROW
    // =====================================================

    worksheet["!freeze"] = {
        xSplit: 0,
        ySplit: 1,
    };

    // =====================================================
    // EMAIL COLUMN VALIDATION / NOTE
    // =====================================================

    const emailColumnIndex =
        EMPLOYEE_COLUMNS.findIndex(
            (column) =>
                column === "Email ID*"
        );

    if (emailColumnIndex !== -1) {
        const emailColumnLetter =
            XLSX.utils.encode_col(
                emailColumnIndex
            );

        /*
            Add a note to the Email ID header.

            This does not replace backend validation.
            Backend still strictly checks Email ID.
        */

        const emailHeaderCell =
            worksheet[
                `${emailColumnLetter}1`
            ];

        if (emailHeaderCell) {
            emailHeaderCell.c = [
                {
                    a: "System",
                    t:
                        "Required field. Email ID is used to match employees during Excel upload. Existing email updates the same employee; a new email creates a new employee.",
                },
            ];
        }
    }

    // =====================================================
    // WORKBOOK
    // =====================================================

    const workbook =
        XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Employees"
    );

    XLSX.writeFile(
        workbook,
        "Employee_Bulk_Upload_Template.xlsx"
    );
};