import { type ResumeChangeAudit } from "@/lib/schemas/audit.schema";
import { type CvDocument, type CvLine, type CvSection } from "@/lib/schemas/cv-document.schema";
import { type ParsedResume, type ResumeFact } from "@/lib/schemas/resume.schema";

function cleanIdentity(text: string, prefix: string): string | null {
  return text.startsWith(prefix) ? text.replace(prefix, "").trim() : null;
}

function lineFromFact(fact: ResumeFact, index: number): CvLine {
  return {
    id: `${fact.category}-${fact.id}-${index}`,
    text: fact.text,
    status: "proven",
    sourceFactIds: [fact.id],
  };
}

function sectionFromFacts(
  id: string,
  title: string,
  kind: CvSection["kind"],
  facts: ResumeFact[]
): CvSection | null {
  if (facts.length === 0) return null;
  return {
    id,
    title,
    kind,
    lines: facts.map(lineFromFact),
  };
}

function extractHeader(resume: ParsedResume): Pick<CvDocument, "name" | "headline" | "contact"> {
  const identity = resume.facts.filter((fact) => fact.category === "identity");
  const name =
    identity.find(
      (fact) =>
        !fact.text.startsWith("email:") &&
        !fact.text.startsWith("phone:") &&
        !fact.text.startsWith("location:")
    )?.text ?? "Candidate";

  const contact = identity.flatMap((fact) => {
    const email = cleanIdentity(fact.text, "email:");
    const phone = cleanIdentity(fact.text, "phone:");
    const location = cleanIdentity(fact.text, "location:");
    return [email, phone, location].filter((item): item is string => Boolean(item));
  });

  const firstExperience = resume.facts.find((fact) => fact.category === "experience")?.text;
  const headline = firstExperience && firstExperience.length < 90 ? firstExperience : undefined;

  return { name, headline, contact };
}

export function buildCvDocument(resume: ParsedResume): CvDocument {
  const by = (category: ResumeFact["category"]) =>
    resume.facts.filter((fact) => fact.category === category);

  const sections = [
    sectionFromFacts("summary", "Résumé", "summary", by("summary")),
    sectionFromFacts("experience", "Expérience", "experience", by("experience")),
    sectionFromFacts("skills", "Compétences", "skills", by("skill")),
    sectionFromFacts("projects", "Projets", "projects", by("project")),
    sectionFromFacts("education", "Formation", "education", by("education")),
  ].filter((section): section is CvSection => Boolean(section));

  return {
    ...extractHeader(resume),
    sections,
  };
}

export function buildAdaptedCvDocument(
  parsedTailoredResume: ParsedResume,
  audits: ResumeChangeAudit[]
): CvDocument {
  const document = buildCvDocument(parsedTailoredResume);

  return {
    ...document,
    sections: document.sections.map((section) => {
      const matchingAudit = audits.find(
        (audit) =>
          audit.classification !== "blocked" &&
          audit.targetSection.toLowerCase() === section.kind.toLowerCase()
      );

      if (!matchingAudit) return section;

      return {
        ...section,
        lines: section.lines.map((line, index) => ({
          ...line,
          status:
            index === 0
              ? matchingAudit.classification === "proven"
                ? "proven"
                : "rewritten"
              : line.status,
          originalText: index === 0 ? matchingAudit.originalText : line.originalText,
          auditId: index === 0 ? matchingAudit.changeId : line.auditId,
          sourceFactIds: index === 0 ? matchingAudit.sourceFactIds : line.sourceFactIds,
        })),
      };
    }),
  };
}

export function blockedClaims(audits: ResumeChangeAudit[]): ResumeChangeAudit[] {
  return audits.filter((audit) => audit.classification === "blocked");
}
