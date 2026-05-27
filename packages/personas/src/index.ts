import { type Persona, PersonaSchema, type PersonaId } from "@riri/shared";
import jordanJson from "../jordan.json" with { type: "json" };
import mikeJson from "../mike.json" with { type: "json" };
import sofiaJson from "../sofia.json" with { type: "json" };

const jordan: Persona = PersonaSchema.parse(jordanJson);
const mike: Persona = PersonaSchema.parse(mikeJson);
const sofia: Persona = PersonaSchema.parse(sofiaJson);

const personaRegistry: Record<PersonaId, Persona> = {
  sofia,
  jordan,
  mike,
};

export function getPersona(id: PersonaId): Persona {
  return personaRegistry[id];
}

export function listPersonas(): Persona[] {
  return Object.values(personaRegistry);
}

export function getPersonaIds(): PersonaId[] {
  return Object.keys(personaRegistry) as PersonaId[];
}

/** The persona that should be selected by default in the V0 clinic demo. */
export const DEFAULT_PERSONA_ID: PersonaId = "sofia";

export { jordan, mike, sofia };
