import { googleMapsUrl } from "./maps";

export type BriefStep = { time: string; title: string; place: string };
export type BriefFact = { label: string; value: string };

export type DayBrief = {
  title: string;
  date: string;
  steps: { time: string; title: string; place: string; map: string }[];
  facts: BriefFact[];
};

export function buildDayBrief(input: {
  couple: string;
  date: string;
  steps: readonly BriefStep[];
  facts: readonly BriefFact[];
}): DayBrief {
  return {
    title: input.couple,
    date: input.date,
    steps: input.steps.map((step) => ({
      ...step,
      map: step.place ? googleMapsUrl(step.place) : "",
    })),
    facts: input.facts.filter((fact) => fact.value.trim().length > 0),
  };
}

export function briefText(brief: DayBrief): string {
  const steps = brief.steps.length
    ? brief.steps.map((step) => `${step.time} ${step.title}${step.place ? ` — ${step.place}` : ""}`).join("\n")
    : "Aucune étape ne vous est assignée.";
  const facts = brief.facts.map((fact) => `${fact.label} : ${fact.value}`).join("\n");
  return [`Brief · ${brief.title}`, brief.date, "", steps, "", facts].join("\n").trim();
}
