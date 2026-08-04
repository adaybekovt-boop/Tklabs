"use client";

import { CheckCircle2, MessageSquareText, Mic2, Sparkles } from "lucide-react";

import { useLanguage } from "@/components/providers/LanguageProvider";

const capabilityIcons = [MessageSquareText, Mic2, CheckCircle2] as const;

export function WorkspaceCapabilities() {
  const { copy } = useLanguage();
  const items = [
    { key: "ask", number: "01", title: copy.home.capabilityAskTitle, description: copy.home.capabilityAskCopy },
    { key: "speak", number: "02", title: copy.home.capabilitySpeakTitle, description: copy.home.capabilitySpeakCopy },
    { key: "result", number: "03", title: copy.home.capabilityResultTitle, description: copy.home.capabilityResultCopy },
  ];

  return (
    <section className="capabilities-section site-section" id="capabilities" aria-labelledby="capabilities-title">
      <div className="capabilities-heading page-grid">
        <div>
          <span className="eyebrow capabilities-eyebrow">{copy.home.capabilitiesEyebrow}</span>
          <h2 id="capabilities-title">{copy.home.capabilitiesTitleLead}<br /><em>{copy.home.capabilitiesTitleAccent}</em></h2>
        </div>
        <p>{copy.home.capabilitiesCopy}</p>
      </div>

      <div className="capability-grid page-grid">
        {items.map((item, index) => {
          const Icon = capabilityIcons[index];
          return (
            <article className="capability-card" key={item.key}>
              <div className="capability-card-topline"><span>{item.number}</span><Icon size={17} aria-hidden="true" /></div>
              <Sparkles className="capability-card-spark" size={14} aria-hidden="true" />
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
