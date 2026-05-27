import { Hono } from "hono";
import { getPersona, listPersonas } from "@stratton/personas";
import type { PersonaId } from "@stratton/shared";

export const personaRoutes = new Hono();

personaRoutes.get("/", (c) => {
  return c.json(listPersonas());
});

personaRoutes.get("/:id", (c) => {
  const id = c.req.param("id") as PersonaId;
  try {
    const p = getPersona(id);
    return c.json(p);
  } catch {
    return c.json({ error: "persona_not_found", detail: id }, 404);
  }
});
