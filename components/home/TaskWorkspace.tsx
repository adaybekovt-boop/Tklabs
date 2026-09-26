import Link from "next/link";
import { PUBLIC_ERMA_MODELS } from "@/lib/models/public";
import type { HomeCopy } from "./home-copy";

/** The same task planes assemble into the product. This illustration never calls a model. */
export function TaskWorkspace({ copy, selectedModelKey }: { copy: HomeCopy; selectedModelKey: string }) {
  const selectedModel = PUBLIC_ERMA_MODELS.find(model => model.key === selectedModelKey) ?? PUBLIC_ERMA_MODELS[1];
  return <div className="task-system" data-task-system aria-label={copy.ru ? "Иллюстрация работы Erma" : "Illustration of Erma workflow"}>
    <div className="task-window" data-film-window>
      <div className="task-window-top" data-film-chrome><strong>ERMA</strong><div>{copy.tabs.map((tab, index) => <span key={tab} data-selected={index === 0}>{tab}</span>)}</div><span className="task-window-square" aria-hidden="true"/></div>
    </div>
    <aside className="task-archive" data-film-archive>
      <p>{copy.conversations}</p><span className="task-new">+ {copy.ru ? "Новый диалог" : "New conversation"}</span>
      <span className="task-project-label">{copy.project}</span><strong>{copy.original}</strong><span className="task-branch">└ {copy.branch}</span>
      <div className="task-file"><span aria-hidden="true">▤</span>{copy.file}</div><small>{copy.local}</small>
    </aside>
    <div className="task-prompt" data-film-prompt>
      <span className="task-prompt-caption">{copy.promptLabel}</span><p>{copy.prompt}</p>
      <div className="task-prompt-bottom"><span>+ <span>Erma · Auto</span></span><span className="task-send" aria-hidden="true">↑</span></div>
    </div>
    <div className="task-route" data-film-route>
      <div className="task-route-caption"><span>Erma · Auto</span><span>{copy.ru ? "Пример маршрута" : "Illustrated route"}</span></div>
      <svg className="route-lines" viewBox="0 0 600 130" fill="none" preserveAspectRatio="none" aria-hidden="true">
        <path d="M300 0V30H70V118M300 30V118M300 30H530V118" className="route-track"/>
        <path d={selectedModel.tier === "light" ? "M300 0V30H70V118" : selectedModel.tier === "heavy" ? "M300 0V30H530V118" : "M300 0V118"} className="route-current" pathLength="1"/>
      </svg>
      <div className="route-models">{PUBLIC_ERMA_MODELS.map((model, index) => <div key={model.key} data-selected={model.key === selectedModelKey} className="route-model"><span>{model.name.replace("Erma ", "")}</span><small>{copy.modelRoles[index]}</small></div>)}</div>
    </div>
    <div className="task-model-name" data-film-model><span className="task-marker"/>{selectedModel.name}<span>Auto</span></div>
    <div className="task-answer" data-film-answer>
      <h3>{copy.resultTitle}</h3><p className="task-draft" data-film-draft>{copy.result}</p>
      <ul className="task-checklist" data-film-checklist>{copy.checks.map(check => <li key={check}><span aria-hidden="true">↳</span>{check}</li>)}</ul>
    </div>
    <div className="task-tool" data-film-tool>
      <div><span className="task-tool-symbol" aria-hidden="true">↳</span><strong>{copy.toolTitle}</strong><span className="task-tool-check" aria-hidden="true">✓</span></div>
      <code>search_documentation</code><Link href="/truth">{copy.toolResult}<span aria-hidden="true">↗</span></Link>
    </div>
    <div className="task-version" data-film-version><span>v1</span><span aria-hidden="true">─────</span><strong>v2</strong><span>{copy.refine}</span></div>
    <div className="task-intent" data-film-intent>{copy.intentParts.map((part, index) => <span key={part}><small>{String(index + 1).padStart(2, "0")}</small>{part}</span>)}</div>
  </div>;
}
