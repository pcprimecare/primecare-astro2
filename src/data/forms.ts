/**
 * Downloadable patient forms.
 * Source: the Forms page of the clinic's live site (2026-10-08). The PDFs are copied from the clinic's
 * own server into public/forms/ with clean file names. `legacyFile` is the old path under /assets/docs/,
 * used to build 301 redirects in public/_redirects so old links and bookmarks keep working.
 *
 * Group names describe what each standard questionnaire is. The clinic can reword them.
 */
export interface FormGroup {
  id: string;
  title: string;
}

export interface PatientForm {
  id: string;
  title: string;
  /** File name under /forms/ */
  file: string;
  /** File name under the old /assets/docs/ (before URL-encoding) */
  legacyFile: string;
  group: FormGroup['id'];
}

export const formGroups: FormGroup[] = [
  { id: 'new-patients', title: 'New patients' },
  { id: 'wcb', title: "Workers' Compensation Board (WCB)" },
  { id: 'questionnaires', title: 'Mental health and behaviour questionnaires' },
  { id: 'adhd', title: 'ADHD assessment (Vanderbilt)' },
  { id: 'diet', title: 'Diet information' },
];

export const forms: PatientForm[] = [
  {
    id: 'new-patient-intake',
    title: 'New patient intake form',
    file: 'new-patient-intake-form.pdf',
    legacyFile: 'patient information.pdf',
    group: 'new-patients',
  },
  {
    id: 'wcb-first-visit',
    title: 'WCB first visit',
    file: 'wcb-first-visit.pdf',
    legacyFile: 'WCB - First Visit.pdf',
    group: 'wcb',
  },
  {
    id: 'phq-9',
    title: 'Patient Health Questionnaire (PHQ-9)',
    file: 'patient-health-questionnaire-phq-9.pdf',
    legacyFile: 'Patient Health Questionnaire PHQ-9.pdf',
    group: 'questionnaires',
  },
  {
    id: 'teenscreen-phq-9',
    title: 'TeenScreen PHQ-9 questionnaire',
    file: 'teenscreen-phq-9-questionnaire.pdf',
    legacyFile: 'TeenScreen PHQ-9 questionaire only.pdf',
    group: 'questionnaires',
  },
  {
    id: 'scared-child',
    title: 'SCARED, child version',
    file: 'scared-child.pdf',
    legacyFile: 'SCARED Child.pdf',
    group: 'questionnaires',
  },
  {
    id: 'psc-35',
    title: 'Pediatric Symptom Checklist (PSC-35)',
    file: 'pediatric-symptom-checklist-psc-35.pdf',
    legacyFile: 'Pediatric Symptom Checklist PSC35.pdf',
    group: 'questionnaires',
  },
  {
    id: 'psc-17-youth',
    title: 'Pediatric Symptom Checklist, youth (PSC-17)',
    file: 'pediatric-symptom-checklist-youth-psc-17.pdf',
    legacyFile: 'Pediatric Symptom Checklist Youth PSC17.pdf',
    group: 'questionnaires',
  },
  {
    id: 'vanderbilt-initial',
    title: 'Vanderbilt ADHD initial assessment, teacher and parent',
    file: 'vanderbilt-adhd-initial-teacher-parent.pdf',
    legacyFile: 'Vanderbilt ADHD INITIAL Teacher_Parent.pdf',
    group: 'adhd',
  },
  {
    id: 'vanderbilt-follow-up',
    title: 'Vanderbilt ADHD follow-up assessment, teacher and parent',
    file: 'vanderbilt-adhd-follow-up-teacher-parent.pdf',
    legacyFile: 'Vanderbilt ADHD Assessment-Teacher-Parent-Followup.pdf',
    group: 'adhd',
  },
  {
    id: 'vanderbilt-follow-up-scoring',
    title: 'Vanderbilt ADHD follow-up scoring, teacher and parent',
    file: 'vanderbilt-adhd-follow-up-scoring-teacher-parent.pdf',
    legacyFile: 'Vanderbilt ADHD Assessment-Teacher_Parent_Followup scoring.pdf',
    group: 'adhd',
  },
  {
    id: 'vitamin-k-foods',
    title: 'Vitamin K foods',
    file: 'vitamin-k-foods.pdf',
    legacyFile: 'Vitamin K Foods.pdf',
    group: 'diet',
  },
];
