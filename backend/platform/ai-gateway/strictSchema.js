import { z } from "zod";

/**
 * Convert a Zod schema into a JSON Schema accepted by Groq strict structured
 * outputs: every object closed (additionalProperties: false) and every
 * property listed in `required`.
 *
 * Strict mode has no optional fields, so an optional Zod property is a
 * programming error here — model "may be absent" as `.nullable()` instead.
 */
export const toStrictJsonSchema = (zodSchema) => {
  const jsonSchema = z.toJSONSchema(zodSchema, { target: "draft-7" });
  delete jsonSchema.$schema;
  closeObjects(jsonSchema, "#");
  return jsonSchema;
};

function closeObjects(node, path) {
  if (!node || typeof node !== "object") return;

  if (Array.isArray(node)) {
    node.forEach((child, i) => closeObjects(child, `${path}/${i}`));
    return;
  }

  if (node.type === "object" && node.properties) {
    const keys = Object.keys(node.properties);
    const required = new Set(node.required || []);
    const optional = keys.filter((key) => !required.has(key));
    if (optional.length > 0) {
      throw new Error(
        `Strict schema at ${path} has optional properties (${optional.join(", ")}); use .nullable() instead of .optional()`,
      );
    }
    node.required = keys;
    node.additionalProperties = false;
  }

  for (const [key, value] of Object.entries(node)) {
    if (value && typeof value === "object") {
      closeObjects(value, `${path}/${key}`);
    }
  }
}
