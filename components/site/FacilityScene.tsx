const racks = [
  { id: "A-01", load: "71%", tone: "lime" },
  { id: "A-02", load: "64%", tone: "blue" },
  { id: "B-01", load: "89%", tone: "orange" },
  { id: "B-02", load: "52%", tone: "lime" },
  { id: "C-01", load: "77%", tone: "blue" },
  { id: "C-02", load: "44%", tone: "white" },
];

export function FacilityScene() {
  return (
    <div className="facility-scene" aria-label="A stylized server hall with six racks">
      <div className="facility-scanline" aria-hidden="true" />
      <div className="facility-ambient facility-ambient-one" aria-hidden="true" />
      <div className="facility-ambient facility-ambient-two" aria-hidden="true" />
      <div className="facility-ceiling" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="facility-floor" aria-hidden="true" />
      <div className="rack-line">
        {racks.map((rack, index) => (
          <article className={`server-rack rack-${rack.tone}`} key={rack.id}>
            <div className="rack-header">
              <span>{rack.id}</span>
              <span>LIVE</span>
            </div>
            <div className="rack-body">
              {Array.from({ length: 7 }, (_, row) => (
                <div className="server-row" key={row}>
                  <span className="server-led" />
                  <span className="server-slot" />
                  <span className="server-slot short" />
                </div>
              ))}
            </div>
            <div className="rack-footer">
              <span>load</span>
              <strong>{rack.load}</strong>
            </div>
            <span className="rack-reflection" aria-hidden="true" />
            <span className="rack-index" aria-hidden="true">
              0{index + 1}
            </span>
          </article>
        ))}
      </div>
      <div className="facility-caption">
        <span>hall B / north wall</span>
        <span>visual output only · no production workload</span>
      </div>
    </div>
  );
}
