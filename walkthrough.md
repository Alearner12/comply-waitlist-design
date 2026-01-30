# Deploying Healthcare Features - Walkthrough

This document outlines the changes made to deploy the new healthcare-focused accessibility features for Comply.

## 1. Features Deployed

We have successfully deployed the following features to your Supabase project (`sjegvptpdyaivfzrlkcu`):

### A. PDF Accessibility Detection (`scan-website`)
- **What it does:** Scans the target website for PDF documents.
- **Checks:** Verifies if PDFs contain essential accessibility tags (`/Lang`, `/MarkInfo`, `/Title`).
- **Output:** Reports inaccessible PDFs in the scan results and email report.

### B. Third-Party Vendor Risk Detection (`scan-website`)
- **What it does:** Detects known healthcare vendors (Zocdoc, Doxy.me, etc.) embedded in the site.
- **Output:** generates warnings about Section 504 liability for third-party tools and provides a **VPAT Request Email Template**.

### C. Role-Specific Guidance (`scan-website`)
- **What it does:** Analyzes accessibility issues and generates specific advice for:
    - **Practice Managers:** Plain English explanations of business/legal impact.
    - **Developers:** Technical remediation steps.

### D. Accessibility Statement Generator (`generate-statement`)
- **What it does:** Creates a compliant accessibility statement based on scan results.
- **Frontend:** A new "Generate Accessibility Statement" button appears after unlocking the report.

## 2. Updated Edge Functions

All three edge functions are now live:

| Function Name | Status | Description |
| :--- | :--- | :--- |
| `scan-website` | **Active** | Performs the scan, PDF checks, and vendor detection. |
| `unlock-report` | **Active** | Sends the detailed email report with new sections. |
| `generate-statement` | **Active** | Generates the accessibility statement text. |

## 3. How to Verify

To verify these features, follow these steps:

1.  **Run a Scan:**
    - Go to your local frontend (`http://localhost:5173` or deployed URL).
    - Enter a healthcare website URL (e.g., a local doctor's site or a test site with PDFs).
    - **Expected:** The scan should complete. If PDFs or Vendors are found, you should see a "teaser" box in the results preview.

2.  **Unlock the Report:**
    - Enter your email address to unlock the full report.
    - **Expected:**
        - You should receive an email with the new "PDF Document Accessibility" and "Third-Party Vendor Risk Assessment" sections.
        - The frontend should update to show detailed lists of PDF/Vendor issues.
        - You should see the **"Generate Accessibility Statement"** button at the bottom of the report.

3.  **Generate a Statement:**
    - Click "Generate Accessibility Statement".
    - Fill in the practice details.
    - **Expected:** A markdown accessibility statement is generated, which you can copy.

## 4. Troubleshooting

-   **API Limit:** If scans fail instantly, check your `PAGESPEED_API_KEY` in Supabase Secrets. We've added rate limiting to prevent abuse.
-   **Email Not Received:** Check your Spam folder. Ensure `RESEND_API_KEY` is valid.
-   **PDFs Not Checked:** The scanner checks the first 10 PDFs found on the homepage to avoid timeouts. If a PDF is on a deep sub-page, it might not be caught in this version.

## 5. Next Steps

-   **User Testing:** Run scans on 3-5 different healthcare websites to ensure robust detection.
-   **monitor Logs:** Check Supabase Edge Function logs if you encounter any `500` errors.

---
*Deployment completed on: 2024-05-23*
