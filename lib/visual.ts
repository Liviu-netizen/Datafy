export type Visual =
  | {
      type: "table";
      headers: string[];
      rows: string[][];
      highlights?: { r: number; c: number; label?: string }[];
      note?: string;
    }
  | {
      type: "bar";
      labels: string[];
      values: number[];
      note?: string;
    }
  | {
      type: "line";
      labels: string[];
      values: number[];
      note?: string;
    };

export const parseVisual = (value: unknown): Visual | null => {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Visual;
    } catch {
      return null;
    }
  }
  if (typeof value === "object") {
    return value as Visual;
  }
  return null;
};
