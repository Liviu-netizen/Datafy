import { Visual } from "@/lib/visual";

type VisualCardProps = {
  visual: Visual;
  title?: string | null;
};

const VisualTable = ({ visual }: { visual: Extract<Visual, { type: "table" }> }) => (
  <div className="visual-table-wrap">
    <table className="visual-table">
      <thead>
        <tr>
          {visual.headers.map((header) => (
            <th key={header}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {visual.rows.map((row, rowIndex) => (
          <tr key={`${rowIndex}-${row[0] ?? "row"}`}>
            {row.map((cell, cellIndex) => {
              const isHighlight = Boolean(
                visual.highlights?.some(
                  (highlight) => highlight.r === rowIndex && highlight.c === cellIndex
                )
              );
              return (
                <td key={`${rowIndex}-${cellIndex}`} className={isHighlight ? "visual-highlight" : ""}>
                  {cell}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const VisualBar = ({ visual }: { visual: Extract<Visual, { type: "bar" }> }) => {
  const max = Math.max(...visual.values, 1);
  return (
    <div className="visual-bar">
      {visual.labels.map((label, index) => {
        const value = visual.values[index] ?? 0;
        const width = Math.round((value / max) * 100);
        return (
          <div className="visual-bar-row" key={`${label}-${index}`}>
            <span className="visual-bar-label">{label}</span>
            <div className="visual-bar-track">
              <span className="visual-bar-fill" style={{ width: `${width}%` }} />
            </div>
            <span className="visual-bar-value">{value}</span>
          </div>
        );
      })}
    </div>
  );
};

const VisualLine = ({ visual }: { visual: Extract<Visual, { type: "line" }> }) => {
  const max = Math.max(...visual.values, 1);
  return (
    <div className="visual-line">
      <div className="visual-line-track">
        {visual.values.map((value, index) => {
          const left = visual.values.length > 1 ? (index / (visual.values.length - 1)) * 100 : 50;
          const bottom = Math.round((value / max) * 100);
          return (
            <span
              key={`point-${index}`}
              className="visual-line-point"
              style={{ left: `${left}%`, bottom: `${bottom}%` }}
              aria-hidden="true"
            />
          );
        })}
      </div>
      <div className="visual-line-labels">
        {visual.labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
};

export const VisualCard = ({ visual, title }: VisualCardProps) => (
  <div className="visual-card">
    {title ? <h3 className="visual-title">{title}</h3> : null}
    {visual.type === "table" ? (
      <VisualTable visual={visual} />
    ) : visual.type === "bar" ? (
      <VisualBar visual={visual} />
    ) : (
      <VisualLine visual={visual} />
    )}
    {visual.note ? <p className="visual-note">{visual.note}</p> : null}
  </div>
);
