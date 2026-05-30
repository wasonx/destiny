export type LegalSection = {
  heading: string;
  content: string;
};

export type LegalDocument = {
  title: string;
  updatedAt: string;
  sections: LegalSection[];
};

export type LegalDocumentsResponse = {
  version: string;
  documents: {
    userAgreement: LegalDocument;
    privacyPolicy: LegalDocument;
    reportCompliance: LegalDocument;
  };
};

export async function fetchLegalDocuments(): Promise<LegalDocumentsResponse> {
  const response = await fetch('/destiny-api/legal');
  if (!response.ok) {
    throw new Error(`Legal documents request failed: ${response.status}`);
  }
  return response.json();
}
